# Souq Cars mobile app

Flutter client for the Souq Cars marketplace (Android, iOS, Windows). It talks
to the same Express backend as the website (`../server.ts`).

## Run against a local backend

Start the backend from the repository root (`start-backend.bat`, port 3000), then:

| Target | Command |
| --- | --- |
| Windows desktop | `flutter run -d windows` |
| Android emulator | `flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000` |
| iOS simulator | `flutter run --dart-define=API_BASE_URL=http://127.0.0.1:3000` |
| Physical phone | `flutter run --dart-define=API_BASE_URL=http://<your PC's LAN IP>:3000` |

The default base URL is `http://127.0.0.1:3000` (see
`lib/core/network/api_endpoints.dart`). Plain `http://` is only permitted in
debug and profile builds.

## Release builds

The production API URL is passed at build time and must be HTTPS. A mobile
release build that still points at a development address refuses to start and
shows a configuration error instead.

```
flutter build appbundle --release --dart-define=API_BASE_URL=https://<production API>
flutter build ipa --release --dart-define=API_BASE_URL=https://<production API>
```

### Android signing

Release builds are signed with the Google Play **upload key**. Create it once,
on the machine that builds releases:

```
powershell -ExecutionPolicy Bypass -File mobile-app\android\tools\create-upload-keystore.ps1
```

The script asks for a password (it is never shown or put on a command line),
creates `%USERPROFILE%\souq-keys\souq-upload.jks` outside the repository,
writes the git-ignored `android/key.properties`, and refuses to overwrite an
existing keystore or properties file. `key.properties` holds the password in
plain text, as Flutter's Gradle setup expects, so keep that file on the build
machine only. To keep it outside the repository instead, point the
`SOUQ_KEY_PROPERTIES` environment variable at it:

```
storeFile=C:/Users/<you>/souq-keys/souq-upload.jks
storePassword=<password>
keyAlias=upload
keyPassword=<password>
```

Without complete signing details a release build **fails** and lists what is
missing; it no longer falls back to the debug key. For a local test build only,
`SOUQ_ALLOW_DEBUG_SIGNED_RELEASE=true` signs a release with the debug key
(Gradle logs a warning; Flutter's normal output hides it). Google Play rejects
such builds. Debug builds are not affected.

Check which key signed an APK:

```
D:\Android\Sdk\build-tools\36.0.0\apksigner.bat verify --print-certs build\app\outputs\flutter-apk\app-release.apk
```

**Back up the upload key.** Store the `.jks` file and its password together in
a password manager, plus an offline copy (for example an encrypted USB drive),
never in Git, chat or email. When you create the app in Google Play Console,
keep **Play App Signing** on (the default): Google then holds the key that
signs what users install, and a lost upload key can be replaced through Play
Console support instead of losing the app. Without Play App Signing, a lost
key means no further updates to the same listing.

### iOS

Building and signing need macOS with Xcode and an Apple Developer team set on
the Runner target (bundle id `com.souqcars.mobileApp`).

### Building on this Windows machine

The Android SDK and a JDK live in `D:\Android` (`flutter config` already
points at them). If the project and the pub cache are on different drives,
keep `kotlin.incremental=false` in `android/gradle.properties`, otherwise the
Kotlin compiler fails with "this and base files have different roots".

```
flutter build apk --debug --dart-define=API_BASE_URL=https://souq-elsyrat.com
flutter build apk --release --dart-define=API_BASE_URL=https://souq-elsyrat.com
```

Emulator: `D:\Android\Sdk\emulator\emulator.exe -avd souq_api35` (set
`ANDROID_AVD_HOME=D:\Android\avd` first).

## Branding

Launcher icons and the native splash screen are generated from
`assets/branding/`:

```
dart run flutter_launcher_icons
dart run flutter_native_splash:create
```

Both tools also rewrite `ios/Runner/Info.plist` and
`ios/Runner.xcodeproj/project.pbxproj`; review those diffs (the icon tool has
set an invalid `ASSETCATALOG_COMPILER_GENERATE_SWIFT_ASSET_SYMBOL_EXTENSIONS`
value before). The Cairo font files in `assets/google_fonts/` are bundled so
text renders the same offline (SIL Open Font License).

## Checks

```
flutter test --no-pub
flutter analyze --no-pub
```

A read-only check of the app's data code against a live backend is skipped
by default:

```
flutter test test/live_api_contract_test.dart --dart-define=LIVE_API_CHECK=true --dart-define=API_BASE_URL=https://souq-elsyrat.com
```

## Generated model files

`*.g.dart` / `*.freezed.dart` are committed. `build_runner` currently cannot
run with the installed SDK (its analyzer is older than the Dart version), so
changes to the freezed models have to be mirrored in those files by hand
until the generator dependencies are upgraded.

## Privacy policy text

`lib/features/profile/presentation/privacy_policy_text.dart` is generated from
the website's policy (`src/constants/privacyPolicy.ts`, shown at `/privacy`),
so both always say the same. After editing the policy, run from the
repository root:

    npx tsx mobile-app/tool/generate_privacy_policy.mts
