package no.uib.echo

import io.ktor.client.HttpClient
import io.ktor.client.features.json.GsonSerializer
import io.ktor.client.features.json.JsonFeature
import io.ktor.client.features.logging.Logging
import io.ktor.client.request.headers
import io.ktor.client.request.post
import io.ktor.client.statement.HttpResponse
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.http.contentType
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import no.uib.echo.schema.HAPPENING_TYPE
import no.uib.echo.schema.RegistrationJson
import no.uib.echo.schema.selectHappening
import java.io.IOException

data class SendGridRequest(
    val personalizations: List<SendGridPersonalization>,
    val from: SendGridEmail,
    val template_id: String
)

data class SendGridPersonalization(
    val to: List<SendGridEmail>,
    val dynamic_template_data: SendGridTemplate
)

data class SendGridTemplate(
    val title: String,
    val link: String,
    val hapTypeLiteral: String,
    val waitListSpot: Int? = null,
    val registration: RegistrationJson? = null
)

data class SendGridEmail(val email: String, val name: String? = null)

enum class Template {
    CONFIRM_REG,
    CONFIRM_WAIT,
    REGS_LINK
}

private const val SENDGRID_ENDPOINT = "https://api.sendgrid.com/v3/mail/send"

fun fromEmail(email: String): String? {
    return when (email) {
        "tilde@echo.uib.no" -> "Tilde"
        "bedkom@echo.uib.no" -> "Bedkom"
        "webkom@echo.uib.no" -> "Webkom"
        "gnist@echo.uib.no" -> "Gnist"
        else -> null
    }
}

suspend fun sendConfirmationEmail(
    sendGridApiKey: String,
    registration: RegistrationJson,
    waitListSpot: Long?
) {
    val (hapTypeLiteral, typeSlug) = when (registration.type) {
        HAPPENING_TYPE.EVENT ->
            Pair("arrangementet", "events")
        HAPPENING_TYPE.BEDPRES ->
            Pair("bedriftspresentasjonen", "bedpres")
    }

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
                    hap.title,
                    "https://echo.uib.no/$typeSlug/${registration.slug}",
                    hapTypeLiteral,
                    waitListSpot = waitListSpot?.toInt(),
                    registration = registration
                ),
                if (waitListSpot != null) Template.CONFIRM_WAIT else Template.CONFIRM_REG,
                sendGridApiKey
            )
        }
    } catch (e: IOException) {
        e.printStackTrace()
    }
}

suspend fun sendEmail(
    from: String,
    to: String,
    sendGridTemplate: SendGridTemplate,
    template: Template,
    sendGridApiKey: String
) {
    val fromName = fromEmail(from)
    val fromPers =
        if (fromName != null)
            SendGridEmail(from, fromName)
        else
            SendGridEmail(from)

    val templateId = when (template) {
        Template.CONFIRM_REG -> "d-1fff3960b2184def9cf8bac082aeac21"
        Template.CONFIRM_WAIT -> "d-1965cd803e6940c1a6724e3c53b70275"
        Template.REGS_LINK -> "d-50e33549c29e46b7a6c871e97324ac5f"
    }

    val response: HttpResponse = HttpClient {
        install(Logging)
        install(JsonFeature) {
            serializer = GsonSerializer()
        }
    }.use { client ->
        client.post(SENDGRID_ENDPOINT) {
            headers {
                contentType(ContentType.Application.Json)
                body = SendGridRequest(
                    listOf(
                        SendGridPersonalization(
                            to = listOf(SendGridEmail(to)),
                            dynamic_template_data = sendGridTemplate
                        )
                    ),
                    from = fromPers, template_id = templateId
                )
                append(HttpHeaders.Authorization, "Bearer $sendGridApiKey")
            }
        }
    }

    if (response.status != HttpStatusCode.Accepted) {
        throw IOException("Status code is not 202: ${response.status}, ${response.content}")
    }
}
