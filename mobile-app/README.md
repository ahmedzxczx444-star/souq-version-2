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

## Checks

```
flutter test --no-pub
flutter analyze --no-pub
```

## Generated model files

`*.g.dart` / `*.freezed.dart` are committed. `build_runner` currently cannot
run with the installed SDK (its analyzer is older than the Dart version), so
changes to the freezed models have to be mirrored in those files by hand
until the generator dependencies are upgraded.
