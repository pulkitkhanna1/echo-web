import org.jetbrains.kotlin.gradle.tasks.KotlinCompile
import com.adarshr.gradle.testlogger.theme.ThemeType

val ktor_version: String by project
val logback_version: String by project
val exposed_version: String by project
val postgres_version: String by project
val hikari_version: String by project
val kotest_version: String by project
val ktor_rate_limit_version: String by project
val flyway_version: String by project
val sendgrid_version: String by project

// Needed for Shadow
project.setProperty("mainClassName", "no.uib.echo.ApplicationKt")

plugins {
    application
    kotlin("jvm") version "1.6.0"
    id("com.github.johnrengelman.shadow") version "7.1.0"
    id("org.jlleitschuh.gradle.ktlint-idea") version "10.2.0"
    id("com.adarshr.test-logger") version "3.1.0"
}

group = "no.uib.echo"
version = "0.0.1"

application {
    mainClass.set("no.uib.echo.ApplicationKt")
}

repositories {
    mavenCentral()
    maven { setUrl("https://jitpack.io") }
}

dependencies {
    implementation("io.ktor:ktor-server-core:$ktor_version")
    implementation("io.ktor:ktor-server-netty:$ktor_version")
    implementation("io.ktor:ktor-gson:$ktor_version")
    implementation("io.ktor:ktor-auth:$ktor_version")
    implementation("io.ktor:ktor-freemarker:$ktor_version")
    implementation("io.ktor:ktor-client-core:$ktor_version")
    implementation("io.ktor:ktor-client-cio:$ktor_version")
    implementation("io.ktor:ktor-client-logging:$ktor_version")
    implementation("io.ktor:ktor-client-gson:$ktor_version")

    implementation("ch.qos.logback:logback-classic:$logback_version")

    implementation("org.jetbrains.exposed:exposed-core:$exposed_version")
    implementation("org.jetbrains.exposed:exposed-dao:$exposed_version")
    implementation("org.jetbrains.exposed:exposed-jdbc:$exposed_version")
    implementation("org.jetbrains.exposed:exposed-jodatime:$exposed_version")

    implementation("org.postgresql:postgresql:$postgres_version")

    implementation("com.zaxxer:HikariCP:$hikari_version")

    implementation("guru.zoroark:ktor-rate-limit:$ktor_rate_limit_version")

    implementation("org.flywaydb:flyway-core:$flyway_version")

    testImplementation("io.ktor:ktor-server-tests:$ktor_version")

    testImplementation("io.kotest:kotest-framework-engine:$kotest_version")
    testImplementation("io.kotest:kotest-runner-junit5:$kotest_version")
}

// Used for Shadow. Sets main class in JAR-file.
tasks.withType<Jar> {
    manifest {
        attributes(
            mapOf(
                "Main-Class" to application.mainClass
            )
        )
    }
}

// Make tests accessible to Gradle.
tasks.withType<Test> {
    useJUnitPlatform()
}

// Test logging config.
testlogger {
    theme = ThemeType.STANDARD
    showExceptions = true
    showStackTraces = true
    showFullStackTraces = true
    showCauses = true
    slowThreshold = 2000
    showSummary = true
    showSimpleNames = false
    showPassed = true
    showSkipped = true
    showFailed = true
    showStandardStreams = false
    showPassedStandardStreams = true
    showSkippedStandardStreams = true
    showFailedStandardStreams = true
    logLevel = LogLevel.LIFECYCLE
}

// Set JVM target for Java.
java {
    toolchain.languageVersion.set(JavaLanguageVersion.of(13))
}

// Set JVM target for Kotlin.
tasks.withType<KotlinCompile>().configureEach {
    kotlinOptions {
        jvmTarget = "13"
    }
}

// Heroku Gradle buildpack runs `./gradlew stage`,
// therefore we make `stage` run `shadowJar`.
task("stage") {
    dependsOn("shadowJar")
}
