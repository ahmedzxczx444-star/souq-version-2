// Smoke test: the app boots to the splash screen without throwing.
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:mobile_app/main.dart';
import 'package:mobile_app/shared/providers/core_providers.dart';

void main() {
  testWidgets('App boots to splash screen', (WidgetTester tester) async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();

    await tester.pumpWidget(
      ProviderScope(
        overrides: [sharedPreferencesProvider.overrideWithValue(prefs)],
        child: const SouqCarsApp(),
      ),
    );

    expect(find.text('سوق السيارات'), findsOneWidget);
  });
}
