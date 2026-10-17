import java.io.FileInputStream
import java.util.Properties

plugins {
    id("com.android.application")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

// Release signing (Google Play upload key).
//
// The key details come from android/key.properties (git-ignored), or from
// the file named by the SOUQ_KEY_PROPERTIES environment variable so the
// secrets can live outside the repository:
//
//   storeFile=C:\\Users\\<you>\\souq-keys\\souq-upload.jks
//   storePassword=...
//   keyAlias=upload
//   keyPassword=...
//
// android/tools/create-upload-keystore.ps1 creates both the keystore and this
// file. A release build stops with an explanation when the details are
// missing or incomplete instead of quietly signing with the debug key. For a
// local test build only, SOUQ_ALLOW_DEBUG_SIGNED_RELEASE=true signs a release
// with the debug key (Google Play rejects such a build). Debug builds always
// use the debug key and need none of this.
val keystorePropertiesFile: File = System.getenv("SOUQ_KEY_PROPERTIES")
    ?.takeIf { it.isNotBlank() }
    ?.let { file(it) }
    ?: rootProject.file("key.properties")
val keystoreProperties = Properties()
if (keystorePropertiesFile.isFile) {
    FileInputStream(keystorePropertiesFile).use { keystoreProperties.load(it) }
}
val releaseSigningProblems: List<String> = buildList {
    if (!keystorePropertiesFile.isFile) {
        add("No signing properties file at ${keystorePropertiesFile.path}.")
    } else {
        for (key in listOf("storeFile", "storePassword", "keyAlias", "keyPassword")) {
            if (keystoreProperties.getProperty(key).isNullOrBlank()) add("'$key' is missing in ${keystorePropertiesFile.path}.")
        }
        val store = keystoreProperties.getProperty("storeFile")
        if (!store.isNullOrBlank() && !file(store).isFile) add("The keystore file '$store' does not exist.")
    }
}
val hasReleaseKeystore = releaseSigningProblems.isEmpty()
val allowDebugSignedRelease = System.getenv("SOUQ_ALLOW_DEBUG_SIGNED_RELEASE") == "true"

android {
    namespace = "com.souqcars.mobile_app"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    defaultConfig {
        // Permanent once the app is on Google Play: changing it later publishes a
        // different app. Keep it unless the store listing has not been created.
        applicationId = "com.souqcars.mobile_app"
        // You can update the following values to match your application needs.
        // For more information, see: https://flutter.dev/to/review-gradle-config.
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    signingConfigs {
        if (hasReleaseKeystore) {
            create("release") {
                keyAlias = keystoreProperties.getProperty("keyAlias")
                keyPassword = keystoreProperties.getProperty("keyPassword")
                storeFile = file(keystoreProperties.getProperty("storeFile"))
                storePassword = keystoreProperties.getProperty("storePassword")
            }
        }
    }

    buildTypes {
        release {
            signingConfig = when {
                hasReleaseKeystore -> signingConfigs.getByName("release")
                allowDebugSignedRelease -> signingConfigs.getByName("debug")
                else -> null
            }
        }
    }
}

// Without a usable upload key, stop every release build before any work is
// done, with the steps to fix it. Debug and profile builds are unaffected.
if (!hasReleaseKeystore) {
    tasks.configureEach {
        if (name == "preReleaseBuild") {
            doFirst {
                if (allowDebugSignedRelease) {
                    logger.warn("WARNING: this release build is signed with the DEBUG key (SOUQ_ALLOW_DEBUG_SIGNED_RELEASE=true). Google Play will reject it.")
                } else {
                    throw GradleException(
                        "Release signing is not set up:\n  - " + releaseSigningProblems.joinToString("\n  - ") +
                            "\nCreate the upload key with android/tools/create-upload-keystore.ps1 (see mobile-app/README.md, \"Android signing\")." +
                            "\nFor a local test build only, set SOUQ_ALLOW_DEBUG_SIGNED_RELEASE=true to sign with the debug key.",
                    )
                }
            }
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
    }
}

flutter {
    source = "../.."
}
