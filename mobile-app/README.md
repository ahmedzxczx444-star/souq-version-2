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

Create an upload keystore and `android/key.properties` (both are git-ignored):

```
storePassword=<password>
keyPassword=<password>
keyAlias=upload
storeFile=<absolute path to the .jks file>
```

Without `key.properties` the release build is signed with the debug key and
cannot be uploaded to Google Play.

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
