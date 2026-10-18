// Settings: language, password change, sign-out everywhere, account deletion
// and the legal pages the stores require inside the app.
import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile_app/core/network/api_endpoints.dart';
import 'package:mobile_app/core/network/api_exception.dart';
import 'package:mobile_app/features/auth/data/auth_repository.dart';
import 'package:mobile_app/features/profile/presentation/legal_screens.dart';
import 'package:mobile_app/features/profile/presentation/privacy_policy_text.dart';
import 'package:mobile_app/features/profile/presentation/settings_screen.dart';
import 'package:mobile_app/shared/models/user.dart';
import 'package:mobile_app/shared/providers/auth_provider.dart';
import 'package:mobile_app/shared/providers/core_providers.dart';
import 'package:shared_preferences/shared_preferences.dart';

class FakeAuthRepository implements AuthRepository {
  final calls = <String>[];
  String correctPassword = 'right-password';

  @override
  Future<void> changePassword({required String currentPassword, required String newPassword}) async {
    if (currentPassword != correctPassword) throw ApiException('كلمة المرور الحالية غير صحيحة', statusCode: 400);
    calls.add('change:$newPassword');
  }

  @override
  Future<void> logoutAll() async => calls.add('logoutAll');

  @override
  Future<void> deleteAccount(String password) async {
    if (password != correctPassword) throw ApiException('كلمة المرور غير صحيحة', statusCode: 400);
    calls.add('delete');
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class FakeAuthNotifier extends AuthNotifier {
  FakeAuthNotifier(this._user);

  final User? _user;

  @override
  FutureOr<User?> build() => _user;

  @override
  Future<void> logout() async => state = const AsyncData(null);
}

const buyer = User(id: 7, email: 'buyer@example.com', name: 'Buyer', role: 'user');

Future<FakeAuthRepository> pumpSettings(WidgetTester tester, {User? user = buyer}) async {
  SharedPreferences.setMockInitialValues({});
  final prefs = await SharedPreferences.getInstance();
  final repo = FakeAuthRepository();
  final router = GoRouter(
    initialLocation: '/settings',
    routes: [
      GoRoute(path: '/settings', builder: (_, __) => const SettingsScreen()),
      GoRoute(path: '/home', builder: (_, __) => const Scaffold(body: Text('HOME'))),
      GoRoute(path: '/login', builder: (_, __) => const Scaffold(body: Text('LOGIN'))),
      GoRoute(path: '/terms', builder: (_, __) => const TermsScreen()),
      GoRoute(path: '/privacy', builder: (_, __) => const PrivacyScreen()),
      GoRoute(path: '/contact', builder: (_, __) => const ContactScreen()),
    ],
  );
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        sharedPreferencesProvider.overrideWithValue(prefs),
        authRepositoryProvider.overrideWithValue(repo),
        authProvider.overrideWith(() => FakeAuthNotifier(user)),
      ],
      child: MaterialApp.router(routerConfig: router),
    ),
  );
  await tester.pumpAndSettle();
  return repo;
}

void main() {
  test('account endpoints match the backend routes', () {
    expect(ApiEndpoints.changePassword, '/api/auth/change-password');
    expect(ApiEndpoints.logoutAll, '/api/auth/logout-all');
    expect(ApiEndpoints.deleteAccount, '/api/auth/delete-account');
  });

  test('legal pages match the website: 7 terms sections, the same bilingual privacy policy', () {
    expect(termsSections, hasLength(7));
    expect(termsSections[5].title, contains('المحتوى المحظور'));
    expect(termsSections.last.title, startsWith('7.'));
    expect(privacyPolicyAR.sections, hasLength(11));
    expect(privacyPolicyEN.sections, hasLength(privacyPolicyAR.sections.length));
    expect(privacyPolicyEN.sections[5].title, '6. Reports and blocking');
    expect(privacyPolicyEN.sections[7].title, '8. Deleting your account');
    expect(privacyPolicyAR.sections[7].title, '8. حذف الحساب');
    expect(supportWhatsAppUri, 'https://wa.me/201155336849');
  });

  testWidgets('language tile switches the whole screen between Arabic and English', (tester) async {
    await pumpSettings(tester);
    expect(find.text('الإعدادات'), findsOneWidget);
    await tester.tap(find.byKey(const Key('settings-language')));
    await tester.pumpAndSettle();
    expect(find.text('Settings'), findsOneWidget);
    expect(find.text('Delete Account'), findsOneWidget);
  });

  testWidgets('guests see the legal pages but no account actions', (tester) async {
    await pumpSettings(tester, user: null);
    expect(find.byKey(const Key('settings-delete-account')), findsNothing);
    expect(find.byKey(const Key('settings-change-password')), findsNothing);
    expect(find.byKey(const Key('settings-sign-in')), findsOneWidget);

    await tester.tap(find.byKey(const Key('settings-privacy')));
    await tester.pumpAndSettle();
    expect(find.text('سياسة الخصوصية'), findsOneWidget);
    expect(find.text('1. البيانات التي نجمعها'), findsOneWidget);
  });

  testWidgets('the privacy policy follows the app language', (tester) async {
    await pumpSettings(tester, user: null);
    await tester.tap(find.byKey(const Key('settings-language')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('settings-privacy')));
    await tester.pumpAndSettle();
    expect(find.text('Privacy Policy'), findsOneWidget);
    expect(find.text('1. Data we collect'), findsOneWidget);
    final dir = tester.widget<Directionality>(
      find.ancestor(of: find.text('1. Data we collect'), matching: find.byType(Directionality)).first,
    );
    expect(dir.textDirection, TextDirection.ltr);
  });

  testWidgets('change password validates locally, shows the server error, then succeeds', (tester) async {
    final repo = await pumpSettings(tester);
    await tester.tap(find.byKey(const Key('settings-change-password')));
    await tester.pumpAndSettle();

    await tester.enterText(find.byKey(const Key('current-password')), 'wrong');
    await tester.enterText(find.byKey(const Key('new-password')), 'newpass1');
    await tester.enterText(find.byKey(const Key('confirm-password')), 'different');
    await tester.tap(find.byKey(const Key('change-password-submit')));
    await tester.pumpAndSettle();
    expect(repo.calls, isEmpty, reason: 'mismatched confirmation never reaches the server');

    await tester.enterText(find.byKey(const Key('confirm-password')), 'newpass1');
    await tester.tap(find.byKey(const Key('change-password-submit')));
    await tester.pumpAndSettle();
    expect(find.text('كلمة المرور الحالية غير صحيحة'), findsOneWidget);

    await tester.enterText(find.byKey(const Key('current-password')), 'right-password');
    await tester.tap(find.byKey(const Key('change-password-submit')));
    await tester.pumpAndSettle();
    expect(repo.calls, ['change:newpass1']);
    expect(find.byKey(const Key('current-password')), findsNothing, reason: 'dialog closed');
  });

  testWidgets('log out of all devices asks first, then signs out here too', (tester) async {
    final repo = await pumpSettings(tester);
    await tester.tap(find.byKey(const Key('settings-logout-all')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('إلغاء'));
    await tester.pumpAndSettle();
    expect(repo.calls, isEmpty);

    await tester.tap(find.byKey(const Key('settings-logout-all')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('تأكيد'));
    await tester.pumpAndSettle();
    expect(repo.calls, ['logoutAll']);
    expect(find.text('LOGIN'), findsOneWidget);
  });

  testWidgets('delete account needs the right password and ends the session', (tester) async {
    final repo = await pumpSettings(tester);
    await tester.tap(find.byKey(const Key('settings-delete-account')));
    await tester.pumpAndSettle();
    expect(find.textContaining('لا يمكن التراجع'), findsOneWidget);

    await tester.tap(find.byKey(const Key('delete-account-submit')));
    await tester.pumpAndSettle();
    expect(repo.calls, isEmpty, reason: 'an empty password is not sent');

    await tester.enterText(find.byKey(const Key('delete-password')), 'wrong');
    await tester.tap(find.byKey(const Key('delete-account-submit')));
    await tester.pumpAndSettle();
    expect(find.text('كلمة المرور غير صحيحة'), findsOneWidget);
    expect(repo.calls, isEmpty);

    await tester.enterText(find.byKey(const Key('delete-password')), 'right-password');
    await tester.tap(find.byKey(const Key('delete-account-submit')));
    await tester.pumpAndSettle();
    expect(repo.calls, ['delete']);
    expect(find.text('HOME'), findsOneWidget);
  });
}
