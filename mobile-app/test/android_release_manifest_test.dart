// Release-relevant settings in the Android project that Google Play review
// and users depend on. Reads the files directly; no build needed.
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

String read(String path) => File(path).readAsStringSync();

void main() {
  final manifest = read('android/app/src/main/AndroidManifest.xml');
  final gradle = read('android/app/build.gradle.kts');

  test('only the permissions the app uses are declared in its own manifest', () {
    final declared = RegExp(r'uses-permission android:name="([^"]+)"').allMatches(manifest).map((m) => m.group(1)).toSet();
    expect(declared, {'android.permission.INTERNET'});
  });

  test('release builds do not allow plain http', () {
    expect(manifest, isNot(contains('usesCleartextTraffic="true"')));
    expect(read('android/app/src/debug/AndroidManifest.xml'), contains('usesCleartextTraffic'),
        reason: 'plain http stays limited to debug builds');
  });

  test('app data is excluded from backup and device transfer', () {
    expect(manifest, contains('android:allowBackup="false"'));
    expect(manifest, contains('android:fullBackupContent="false"'));
    expect(manifest, contains('android:dataExtractionRules="@xml/data_extraction_rules"'));
    final rules = read('android/app/src/main/res/xml/data_extraction_rules.xml');
    for (final section in ['cloud-backup', 'device-transfer']) {
      expect(rules, contains('<$section>'));
    }
    expect(RegExp('<exclude domain="sharedpref" />').allMatches(rules).length, 2);
  });

  test('the permanent application id and the upload-key requirement are in place', () {
    expect(gradle, contains('applicationId = "com.souqcars.mobile_app"'));
    expect(gradle, contains('Release signing is not set up'));
    expect(gradle, isNot(contains('signingConfigs.getByName(if (hasReleaseKeystore) "release" else "debug")')));
  });

  test('the store label is Souq Cars', () {
    expect(manifest, contains('android:label="Souq Cars"'));
  });
}
