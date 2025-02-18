package no.uib.echo.schema

import io.ktor.http.HttpStatusCode
import kotlinx.serialization.Serializable
import org.jetbrains.exposed.sql.Column
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.StdOutSqlLogger
import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.addLogger
import org.jetbrains.exposed.sql.batchInsert
import org.jetbrains.exposed.sql.deleteWhere
import org.jetbrains.exposed.sql.insert
import org.jetbrains.exposed.sql.jodatime.datetime
import org.jetbrains.exposed.sql.select
import org.jetbrains.exposed.sql.transactions.transaction
import org.jetbrains.exposed.sql.update
import org.joda.time.DateTime

private const val REG_VERIFY_TOKEN_LENGTH = 16

enum class HAPPENING_TYPE {
    BEDPRES,
    EVENT
}

@Serializable
data class HappeningJson(
    val slug: String,
    val title: String,
    val registrationDate: String,
    val happeningDate: String,
    val spotRanges: List<SpotRangeJson>,
    val type: HAPPENING_TYPE,
    val organizerEmail: String,
    val studentGroupName: String
)

@Serializable
data class HappeningInfoJson(
    val spotRanges: List<SpotRangeWithCountJson>,
    val regVerifyToken: String?
)

object Happening : Table() {
    val slug: Column<String> = text("slug").uniqueIndex()
    val title: Column<String> = text("title")
    val happeningType: Column<String> = text("happening_type")
    val registrationDate: Column<DateTime> = datetime("registration_date")
    val happeningDate: Column<DateTime> = datetime("happening_date")
    val organizerEmail: Column<String> = text("organizer_email")
    val regVerifyToken: Column<String?> = text("reg_verify_token").nullable()
    val studentGroupName: Column<String?> = text("student_group_name").references(StudentGroup.name).nullable()

    override val primaryKey: PrimaryKey = PrimaryKey(slug)
}

fun insertOrUpdateHappening(
    newHappening: HappeningJson,
    dev: Boolean
): Pair<HttpStatusCode, String> {
    if (newHappening.spotRanges.isEmpty()) {
        return Pair(
            HttpStatusCode.BadRequest,
            "No spot range given for happening with slug ${newHappening.slug}."
        )
    }

    val happening = transaction {
        addLogger(StdOutSqlLogger)

        Happening.select {
            Happening.slug eq newHappening.slug
        }.firstOrNull()
    }

    val spotRanges = selectSpotRanges(newHappening.slug)

    val regVerifyToken =
        if (dev)
            newHappening.slug
        else
            randomString(REG_VERIFY_TOKEN_LENGTH)

    if (happening == null) {
        transaction {
            addLogger(StdOutSqlLogger)

            Happening.insert {
                it[slug] = newHappening.slug
                it[title] = newHappening.title
                it[happeningType] = newHappening.type.toString()
                it[registrationDate] = DateTime(newHappening.registrationDate)
                it[happeningDate] = DateTime(newHappening.happeningDate)
                it[organizerEmail] = newHappening.organizerEmail.lowercase()
                it[Happening.regVerifyToken] = regVerifyToken
                it[studentGroupName] = newHappening.studentGroupName.lowercase()
            }
            SpotRange.batchInsert(newHappening.spotRanges) { sr ->
                this[SpotRange.spots] = sr.spots
                this[SpotRange.minDegreeYear] = sr.minDegreeYear
                this[SpotRange.maxDegreeYear] = sr.maxDegreeYear
                this[SpotRange.happeningSlug] = newHappening.slug
            }
        }

        return Pair(
            HttpStatusCode.OK,
            "${newHappening.type.toString().lowercase()} submitted with slug = ${newHappening.slug}."
        )
    }

    if (happening[Happening.slug] == newHappening.slug &&
        happening[Happening.title] == newHappening.title &&
        DateTime(happening[Happening.registrationDate]) == DateTime(newHappening.registrationDate) &&
        DateTime(happening[Happening.happeningDate]) == DateTime(newHappening.happeningDate) &&
        spotRanges == newHappening.spotRanges &&
        happening[Happening.organizerEmail].lowercase() == newHappening.organizerEmail.lowercase() &&
        happening[Happening.studentGroupName]?.lowercase() == newHappening.studentGroupName.lowercase()
    ) {
        return Pair(
            HttpStatusCode.Accepted,
            "Happening with slug = ${newHappening.slug}, " +
                "title = ${newHappening.title}, " +
                "registrationDate = ${newHappening.registrationDate}, " +
                "happeningDate = ${newHappening.happeningDate}, " +
                "spotRanges = ${spotRangeToString(newHappening.spotRanges)}, " +
                "organizerEmail = ${newHappening.organizerEmail.lowercase()}, " +
                "and studentGroupName = ${newHappening.studentGroupName} has already been submitted."
        )
    }

    transaction {
        addLogger(StdOutSqlLogger)

        Happening.update({ Happening.slug eq newHappening.slug }) {
            it[title] = newHappening.title
            it[registrationDate] = DateTime(newHappening.registrationDate)
            it[happeningDate] = DateTime(newHappening.happeningDate)
            it[organizerEmail] = newHappening.organizerEmail.lowercase()
            it[studentGroupName] = newHappening.studentGroupName.lowercase()
        }

        SpotRange.deleteWhere {
            SpotRange.happeningSlug eq newHappening.slug
        }

        SpotRange.batchInsert(newHappening.spotRanges) { sr ->
            this[SpotRange.spots] = sr.spots
            this[SpotRange.minDegreeYear] = sr.minDegreeYear
            this[SpotRange.maxDegreeYear] = sr.maxDegreeYear
            this[SpotRange.happeningSlug] = newHappening.slug
        }
    }

    val message =
        "Updated ${newHappening.type} with slug = ${newHappening.slug} " +
            "to title = ${newHappening.title}, " +
            "registrationDate = ${newHappening.registrationDate}, " +
            "happeningDate = ${newHappening.happeningDate}, " +
            "spotRanges = ${spotRangeToString(newHappening.spotRanges)}, " +
            "organizerEmail = ${newHappening.organizerEmail.lowercase()}, " +
            "and studentGroupName = ${newHappening.studentGroupName}"

    return Pair(
        HttpStatusCode.OK,
        message
    )
}

fun spotRangeToString(spotRanges: List<SpotRangeJson>): String {
    return "[ ${
    spotRanges.map {
        "(spots = ${it.spots}, minDegreeYear = ${it.minDegreeYear}, maxDegreeYear = ${it.maxDegreeYear}), "
    }
    } ]"
}

fun randomString(length: Int): String {
    return (1..length).map {
        (('A'..'Z') + ('a'..'z') + ('0'..'9'))
            .random()
    }.joinToString("")
}
