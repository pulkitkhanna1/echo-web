package no.uib.echo.plugins

import guru.zoroark.ratelimit.RateLimit
import guru.zoroark.ratelimit.rateLimited
import io.ktor.routing.*
import io.ktor.application.*
import io.ktor.auth.Authentication
import io.ktor.auth.UserIdPrincipal
import io.ktor.auth.authenticate
import io.ktor.auth.basic
import io.ktor.gson.*
import io.ktor.features.*
import io.ktor.freemarker.*
import io.ktor.http.*
import io.ktor.request.*
import io.ktor.response.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import no.uib.echo.FeatureToggles
import no.uib.echo.Response
import no.uib.echo.SendGridTemplate
import no.uib.echo.Template
import no.uib.echo.plugins.Routing.deleteHappening
import no.uib.echo.plugins.Routing.getRegistrationCount
import no.uib.echo.plugins.Routing.getRegistrations
import no.uib.echo.plugins.Routing.deleteRegistration
import no.uib.echo.plugins.Routing.getStatus
import no.uib.echo.plugins.Routing.postRegistration
import no.uib.echo.plugins.Routing.putHappening
import no.uib.echo.resToJson
import no.uib.echo.schema.*
import no.uib.echo.schema.Happening.slug
import no.uib.echo.sendEmail
import org.jetbrains.exposed.sql.StdOutSqlLogger
import org.jetbrains.exposed.sql.addLogger
import org.jetbrains.exposed.sql.select
import org.jetbrains.exposed.sql.transactions.transaction
import java.io.IOException

fun Application.configureRouting(adminKey: String, sendGridApiKey: String?, featureToggles: FeatureToggles) {
    val admin = "admin"

    install(ContentNegotiation) {
        gson()
    }

    install(RateLimit) {
        limit = 200
    }

    install(Authentication) {
        basic("auth-$admin") {
            realm = "Access to registrations and happenings."
            validate { credentials ->
                if (credentials.name == admin && credentials.password == adminKey)
                    UserIdPrincipal(credentials.name)
                else
                    null
            }
        }
    }

    routing {
        rateLimited {
            getStatus()

            authenticate("auth-$admin") {
                deleteRegistration()
                putHappening(sendGridApiKey, featureToggles.sendEmailHap)
                deleteHappening()
                getRegistrationCount()
            }

            getRegistrations()
            postRegistration(sendGridApiKey, featureToggles.sendEmailReg)
        }
    }
}

object Routing {
    const val registrationRoute: String = "registration"
    const val happeningRoute: String = "happening"

    fun Route.getStatus() {
        get("/status") {
            call.respond(HttpStatusCode.OK)
        }
    }

    fun Route.getRegistrationCount() {
        get("/$registrationRoute") {
            val slugParam: String? = call.request.queryParameters["slug"]

            if (slugParam != null) {
                call.respond(HttpStatusCode.OK, countRegistrations(slugParam))
                return@get
            } else {
                call.respond(HttpStatusCode.BadRequest, "No slug specified.")
                return@get
            }
        }
    }

    fun Route.getRegistrations() {
        get("/$registrationRoute/{link}") {
            val link = call.parameters["link"]
            val download = call.request.queryParameters["download"] != null
            val testing = call.request.queryParameters["testing"] != null

            if ((link == null) || (link.length < 128)) {
                call.respond(HttpStatusCode.NotFound)
                return@get
            }

            val hap = transaction {
                addLogger(StdOutSqlLogger)

                Happening.select {
                    Happening.registrationsLink eq link
                }.firstOrNull()
            }

            if (hap == null) {
                call.respond(HttpStatusCode.NotFound)
                return@get
            }

            val regs = selectRegistrationsBySlug(hap[slug])
            val ans = (regs.maxByOrNull { it.answers.size })?.answers ?: emptyList()

            if (download) {
                val fileName = "pameldte-${hap[slug]}.csv"

                call.response.header(
                    HttpHeaders.ContentDisposition,
                    ContentDisposition.Attachment.withParameter(
                        ContentDisposition.Parameters.FileName,
                        fileName
                    ).toString()
                )
                call.respondBytes(
                    contentType = ContentType.parse("text/csv"),
                    provider = { toCsv(regs, testing = testing).toByteArray() }
                )
            } else {
                call.respond(
                    FreeMarkerContent(
                        "registrations_link.ftl",
                        mapOf(
                            "answers" to ans,
                            "regs" to regs,
                            "registrationRoute" to registrationRoute,
                            "regsLink" to link,
                            "slug" to hap[slug]
                        )
                    )
                )
            }
        }
    }

    fun Route.postRegistration(sendGridApiKey: String?, sendEmail: Boolean) {
        post("/$registrationRoute") {
            try {
                val registration = call.receive<RegistrationJson>()

                val (hapTypeLiteral, typeSlug) = when (registration.type) {
                    HAPPENING_TYPE.EVENT ->
                        Pair("arrangementet", "events")
                    HAPPENING_TYPE.BEDPRES ->
                        Pair("bedriftspresentasjonen", "bedpres")
                }

                if (!registration.email.contains('@')) {
                    call.respond(HttpStatusCode.BadRequest, resToJson(Response.InvalidEmail, registration.type))
                    return@post
                }

                if (registration.degreeYear !in 1..5) {
                    call.respond(HttpStatusCode.BadRequest, resToJson(Response.InvalidDegreeYear, registration.type))
                    return@post
                }

                if ((registration.degree == Degree.DTEK ||
                        registration.degree == Degree.DSIK ||
                        registration.degree == Degree.DVIT ||
                        registration.degree == Degree.BINF ||
                        registration.degree == Degree.IMO ||
                        registration.degree == Degree.IKT ||
                        registration.degree == Degree.KOGNI ||
                        registration.degree == Degree.ARMNINF) && registration.degreeYear !in 1..3
                ) {
                    call.respond(
                        HttpStatusCode.BadRequest,
                        resToJson(Response.DegreeMismatchBachelor, registration.type)
                    )
                    return@post
                }

                if ((registration.degree == Degree.INF || registration.degree == Degree.PROG) && (registration.degreeYear !in 4..5)) {
                    call.respond(HttpStatusCode.BadRequest, resToJson(Response.DegreeMismatchMaster, registration.type))
                    return@post
                }

                if (registration.degree == Degree.ARMNINF && registration.degreeYear != 1) {
                    call.respond(
                        HttpStatusCode.BadRequest,
                        resToJson(Response.DegreeMismatchArmninf, registration.type)
                    )
                    return@post
                }

                if (registration.degree == Degree.KOGNI && registration.degreeYear != 3) {
                    call.respond(HttpStatusCode.BadRequest, resToJson(Response.DegreeMismatchKogni, registration.type))
                    return@post
                }

                if (!registration.terms) {
                    call.respond(HttpStatusCode.BadRequest, resToJson(Response.InvalidTerms, registration.type))
                    return@post
                }

                val (regDateOrWaitListCount, spotRanges, regStatus) = insertRegistration(registration)

                when (regStatus) {
                    RegistrationStatus.ACCEPTED -> {
                        call.respond(HttpStatusCode.OK, resToJson(Response.OK, registration.type))

                        if (sendGridApiKey == null || !sendEmail)
                            return@post

                        val hap = selectHappening(registration.slug) ?: throw Exception("Happening is null.")

                        val fromEmail =
                            if (hap.organizerEmail.contains(Regex("@echo.uib.no$")))
                                hap.organizerEmail
                            else
                                "webkom@echo.uib.no"

                        try {
                            withContext(Dispatchers.IO) {
                                sendEmail(
                                    fromEmail,
                                    registration.email,
                                    SendGridTemplate(
                                        hap.slug,
                                        "https://echo.uib.no/$typeSlug/${registration.slug}",
                                        hapTypeLiteral,
                                        registration = registration
                                    ),
                                    Template.CONFIRM_REG,
                                    sendGridApiKey
                                )
                            }
                        } catch (e: IOException) {
                            e.printStackTrace()
                        }
                    }
                    RegistrationStatus.WAIT_LIST -> {
                        call.respond(
                            HttpStatusCode.Accepted,
                            resToJson(Response.WaitList, registration.type, waitListCount = regDateOrWaitListCount)
                        )

                        if (sendGridApiKey == null || !sendEmail)
                            return@post

                        val hap = selectHappening(registration.slug) ?: throw Exception("Happening is null.")
                        val fromEmail =
                            if (hap.organizerEmail.contains(Regex("@echo.uib.no$")))
                                hap.organizerEmail
                            else
                                "webkom@echo.uib.no"
                        try {
                            withContext(Dispatchers.IO) {
                                sendEmail(
                                    fromEmail,
                                    registration.email,
                                    SendGridTemplate(
                                        hap.slug,
                                        "https://echo.uib.no/$typeSlug/${registration.slug}",
                                        hapTypeLiteral,
                                        waitListSpot = regDateOrWaitListCount?.toInt(),
                                        registration = registration
                                    ),
                                    Template.CONFIRM_WAIT,
                                    sendGridApiKey
                                )
                            }
                        } catch (e: IOException) {
                            e.printStackTrace()
                        }
                    }
                    RegistrationStatus.TOO_EARLY ->
                        call.respond(
                            HttpStatusCode.Forbidden,
                            resToJson(Response.TooEarly, registration.type, regDate = regDateOrWaitListCount)
                        )
                    RegistrationStatus.ALREADY_EXISTS ->
                        call.respond(
                            HttpStatusCode.UnprocessableEntity,
                            resToJson(Response.AlreadySubmitted, registration.type)
                        )
                    RegistrationStatus.HAPPENING_DOESNT_EXIST ->
                        call.respond(
                            HttpStatusCode.Conflict,
                            resToJson(Response.HappeningDoesntExist, registration.type)
                        )
                    RegistrationStatus.NOT_IN_RANGE ->
                        call.respond(
                            HttpStatusCode.Forbidden,
                            resToJson(Response.NotInRange, registration.type, spotRanges = spotRanges)
                        )
                }
            } catch (e: Exception) {
                call.respond(HttpStatusCode.InternalServerError)
                e.printStackTrace()
            }
        }
    }

    fun Route.deleteRegistration() {
        delete("/$registrationRoute") {
            try {
                val shortReg = call.receive<ShortRegistrationJson>()

                deleteRegistration(shortReg)

                call.respond(
                    HttpStatusCode.OK,
                    "Registration (${shortReg.type}) with email = ${shortReg.email} and slug = ${shortReg.slug} deleted."
                )
            } catch (e: Exception) {
                call.respond(HttpStatusCode.BadRequest, "Error deleting registration.")
                e.printStackTrace()
            }
        }
    }

    fun Route.putHappening(sendGridApiKey: String?, sendEmail: Boolean) {
        put("/$happeningRoute") {
            try {
                val happ = call.receive<HappeningJson>()
                val result = insertOrUpdateHappening(happ, sendEmail, sendGridApiKey)

                call.respond(result.first, result.second)
            } catch (e: Exception) {
                call.respond(HttpStatusCode.InternalServerError, "Error submitting happening.")
                e.printStackTrace()
            }
        }
    }

    fun Route.deleteHappening() {
        delete("/$happeningRoute") {
            try {
                val happ = call.receive<HappeningSlugJson>()

                if (deleteHappeningBySlug(happ.slug))
                    call.respond(
                        HttpStatusCode.OK,
                        "${happ.type.toString().lowercase()} with slug = ${happ.slug} deleted."
                    )
                else
                    call.respond(
                        HttpStatusCode.NotFound,
                        "${happ.type.toString().lowercase()} with slug = ${happ.slug} does not exist."
                    )
            } catch (e: Exception) {
                call.respond(HttpStatusCode.InternalServerError, "Error deleting happening.")
                e.printStackTrace()
            }
        }
    }
}
