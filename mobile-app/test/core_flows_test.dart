// Core buyer flows with mocked repositories (no network): sign-in and
// registration validation, the hand-off to the OTP screen, guarded routes and
// what happens when the session ends, favorites, and the dealer contact links.
import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile_app/core/network/api_client.dart';
import 'package:mobile_app/core/router/app_router.dart';
import 'package:mobile_app/core/network/api_exception.dart';
import 'package:mobile_app/core/storage/token_storage.dart';
import 'package:mobile_app/core/utils/phone_utils.dart';
import 'package:mobile_app/features/auth/data/auth_repository.dart';
import 'package:mobile_app/features/auth/presentation/auth_screen.dart';
import 'package:mobile_app/features/cars/data/car_repository.dart';
import 'package:mobile_app/features/cars/presentation/car_details_screen.dart';
import 'package:mobile_app/features/cars/presentation/home_screen.dart';
import 'package:mobile_app/shared/models/auth_response.dart';
import 'package:mobile_app/shared/models/car.dart';
import 'package:mobile_app/shared/models/dealer.dart';
import 'package:mobile_app/shared/models/user.dart';
import 'package:mobile_app/shared/providers/auth_provider.dart';
import 'package:mobile_app/shared/providers/core_providers.dart';
import 'package:mobile_app/shared/providers/favorites_provider.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:mobile_app/features/parts/data/market_repository.dart';

const buyer = User(id: 7, email: 'buyer@example.com', name: 'Buyer', role: 'user');

class FakeAuthRepository implements AuthRepository {
  final calls = <String>[];
  Map<String, dynamic>? lastRegisterExtra;
  bool? lastAcceptTerms;
  ApiException? loginError;
  ApiException? registerError;

  @override
  Future<AuthResponse> login({required String email, required String password, String? captchaToken}) async {
    calls.add('login:$email');
    if (loginError != null) throw loginError!;
    return const AuthResponse(token: 'test-token', user: buyer);
  }

  @override
  Future<RegisterResult> register({
    required String email,
    required String password,
    required String name,
    required String role,
    required bool acceptTerms,
    String? captchaToken,
    Map<String, dynamic> extra = const {},
  }) async {
    calls.add('register:$role:$email');
    lastRegisterExtra = extra;
    lastAcceptTerms = acceptTerms;
    if (registerError != null) throw registerError!;
    return RegisterResult(email: email, requiresOtpVerification: true);
  }

  @override
  Future<void> forgotPassword(String email) async => calls.add('forgot:$email');

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

/// Session state without secure storage: starts with [initial] and records
/// what the screens ask it to do.
class FakeAuthNotifier extends AuthNotifier {
  FakeAuthNotifier(this.initial);

  final User? initial;

  @override
  FutureOr<User?> build() => initial;

  @override
  Future<void> applyAuthResponse(AuthResponse response) async => state = AsyncData(response.user);

  @override
  Future<void> logout() async => state = const AsyncData(null);
}

class _NoToken extends TokenStorage {
  _NoToken() : super(const FlutterSecureStorage());

  @override
  Future<String?> readToken() async => null;
}

class FakeCarRepository extends CarRepository {
  FakeCarRepository(this.car) : super(ApiClient(_NoToken()));

  final Car car;
  final toggled = <int>[];
  final favorites = <int>{};
  bool failToggle = false;

  @override
  Future<Car> getById(int id) async => car;

  @override
  Future<List<Car>> getFavorites() async => [if (favorites.contains(car.id)) car];

  @override
  Future<void> toggleFavorite(int carId) async {
    toggled.add(carId);
    if (failToggle) throw ApiException('Server unavailable', statusCode: 500);
  }
}

Car sampleCar({String? whatsapp = '+201001234567', String? phone = '+201001234567'}) => Car(
      id: 5,
      dealerId: 2,
      make: 'Toyota',
      model: 'Corolla',
      year: 2021,
      price: 950000,
      mileage: 30000,
      fuelType: 'Petrol',
      transmission: 'Automatic',
      description: 'One owner.',
      images: const [],
      location: 'Cairo',
      status: 'available',
      dealerName: 'Al Nasr Auto',
      dealerPhone: phone,
      dealerWhatsapp: whatsapp,
    );

Future<({FakeAuthRepository repo, ProviderContainer container, GoRouter router})> pumpApp(
  WidgetTester tester, {
  required String initialLocation,
  User? user,
  Car? car,
  FakeCarRepository? cars,
}) async {
  SharedPreferences.setMockInitialValues({});
  final prefs = await SharedPreferences.getInstance();
  final repo = FakeAuthRepository();
  final carRepo = cars ?? FakeCarRepository(car ?? sampleCar());
  final container = ProviderContainer(overrides: [
    sharedPreferencesProvider.overrideWithValue(prefs),
    authRepositoryProvider.overrideWithValue(repo),
    carRepositoryProvider.overrideWithValue(carRepo),
    authProvider.overrideWith(() => FakeAuthNotifier(user)),
  ]);
  addTearDown(container.dispose);

  // The same guard rules as lib/core/router/app_router.dart, applied to
  // light stand-in screens so each test only builds what it checks.
  const protected = ['/favorites', '/profile', '/dealer-dashboard'];
  final router = GoRouter(
    initialLocation: initialLocation,
    refreshListenable: _AuthListenable(container),
    redirect: (context, state) {
      final auth = container.read(authProvider);
      if (auth.isLoading) return null;
      final loggedIn = auth.valueOrNull != null;
      final location = state.matchedLocation;
      if (protected.any(location.startsWith) && !loggedIn) return '/login';
      if ((location == '/login' || location == '/otp') && loggedIn) return '/home';
      if (location.startsWith('/dealer-dashboard') && !(auth.valueOrNull?.isDealer ?? false)) return '/profile';
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (_, _) => const AuthScreen()),
      GoRoute(
        path: '/otp',
        builder: (_, state) => Scaffold(
          body: Text('OTP ${state.uri.queryParameters['purpose']} ${state.uri.queryParameters['email']}'),
        ),
      ),
      GoRoute(path: '/home', builder: (_, _) => const Scaffold(body: Text('HOME'))),
      GoRoute(path: '/profile', builder: (_, _) => const Scaffold(body: Text('PROFILE'))),
      GoRoute(path: '/favorites', builder: (_, _) => const Scaffold(body: Text('FAVORITES'))),
      GoRoute(path: '/dealer-dashboard', builder: (_, _) => const Scaffold(body: Text('DASHBOARD'))),
      GoRoute(path: '/car/:id', builder: (_, state) => CarDetailsScreen(carId: int.parse(state.pathParameters['id']!))),
    ],
  );
  addTearDown(router.dispose);

  await tester.pumpWidget(
    UncontrolledProviderScope(container: container, child: MaterialApp.router(routerConfig: router)),
  );
  await tester.pumpAndSettle();
  return (repo: repo, container: container, router: router);
}

class _AuthListenable extends ChangeNotifier {
  _AuthListenable(ProviderContainer container) {
    _sub = container.listen(authProvider, (_, _) => notifyListeners());
  }

  late final ProviderSubscription<AsyncValue<User?>> _sub;

  @override
  void dispose() {
    _sub.close();
    super.dispose();
  }
}


void main() {
  group('sign in and registration', () {
    testWidgets('signing in stores the session and opens the home feed', (tester) async {
      final app = await pumpApp(tester, initialLocation: '/login');
      await tester.enterText(find.byType(TextField).at(0), 'buyer@example.com');
      await tester.enterText(find.byType(TextField).at(1), 'secret-password');
      await tester.tap(find.byType(ElevatedButton).first);
      await tester.pumpAndSettle();

      expect(app.repo.calls, ['login:buyer@example.com']);
      expect(app.container.read(authProvider).valueOrNull?.id, buyer.id);
      expect(find.text('HOME'), findsOneWidget);
    });

    testWidgets('a refused sign-in shows the server message and stays on the form', (tester) async {
      SharedPreferences.setMockInitialValues({});
      final app = await pumpApp(tester, initialLocation: '/login');
      app.repo.loginError = ApiException('البريد الإلكتروني أو كلمة المرور غير صحيحة', statusCode: 401);
      await tester.enterText(find.byType(TextField).at(0), 'buyer@example.com');
      await tester.enterText(find.byType(TextField).at(1), 'wrong-password');
      await tester.tap(find.byType(ElevatedButton).first);
      await tester.pumpAndSettle();

      expect(find.text('البريد الإلكتروني أو كلمة المرور غير صحيحة'), findsOneWidget);
      expect(app.container.read(authProvider).valueOrNull, isNull);
      expect(find.byType(AuthScreen), findsOneWidget);
    });

    testWidgets('an unverified account is sent to the OTP screen instead of an error', (tester) async {
      final app = await pumpApp(tester, initialLocation: '/login');
      app.repo.loginError = ApiException('Please verify your email first.',
          statusCode: 403, requiresOtpVerification: true, email: 'new@example.com');
      await tester.enterText(find.byType(TextField).at(0), 'new@example.com');
      await tester.enterText(find.byType(TextField).at(1), 'secret-password');
      await tester.tap(find.byType(ElevatedButton).first);
      await tester.pumpAndSettle();

      expect(find.text('OTP register new@example.com'), findsOneWidget);
    });

    Future<void> openRegister(WidgetTester tester) async {
      // The toggle under the form switches from sign-in to registration.
      // Under the sign-in form: forgot password, create account, continue as guest.
      final toggle = find.byType(TextButton).at(1);
      await tester.ensureVisible(toggle);
      await tester.tap(toggle);
      await tester.pumpAndSettle();
    }

    testWidgets('registration checks password length and confirmation before calling the API', (tester) async {
      final app = await pumpApp(tester, initialLocation: '/login');
      await openRegister(tester);
      final fields = find.byType(TextField);
      expect(fields, findsNWidgets(4), reason: 'name, email, password, confirmation');

      await tester.enterText(fields.at(0), 'New Buyer');
      await tester.enterText(fields.at(1), 'new@example.com');
      await tester.enterText(fields.at(2), '123');
      await tester.enterText(fields.at(3), '123');
      await tester.tap(find.byType(ElevatedButton).first);
      await tester.pumpAndSettle();
      expect(app.repo.calls, isEmpty, reason: 'too short');

      await tester.enterText(fields.at(2), 'long-enough');
      await tester.enterText(fields.at(3), 'different');
      await tester.tap(find.byType(ElevatedButton).first);
      await tester.pumpAndSettle();
      expect(app.repo.calls, isEmpty, reason: 'confirmation differs');

      await tester.enterText(fields.at(3), 'long-enough');
      await tester.tap(find.byType(ElevatedButton).first);
      await tester.pumpAndSettle();
      expect(app.repo.calls, isEmpty, reason: 'the terms are not accepted yet');
      expect(find.text('يجب الموافقة على شروط الاستخدام وسياسة الخصوصية لإنشاء حساب.'), findsOneWidget);
      final accept = tester.widget<Checkbox>(find.byKey(const Key('accept-terms')));
      expect(accept.value, isFalse, reason: 'unchecked by default');

      await tester.ensureVisible(find.byKey(const Key('accept-terms')));
      await tester.tap(find.byKey(const Key('accept-terms')));
      await tester.pumpAndSettle();
      await tester.tap(find.byType(ElevatedButton).first);
      await tester.pumpAndSettle();
      expect(app.repo.calls, ['register:user:new@example.com']);
      expect(app.repo.lastAcceptTerms, isTrue);
      expect(find.text('OTP register new@example.com'), findsOneWidget);
    });

    testWidgets('dealer registration requires valid Egyptian numbers and sends them in +20 form', (tester) async {
      final app = await pumpApp(tester, initialLocation: '/login');
      await openRegister(tester);
      // Pick the dealer role chip by its position: user first, dealer second.
      final chips = find.byWidgetPredicate((w) => w.runtimeType.toString() == '_RoleChip');
      await tester.tap(chips.at(1));
      await tester.pumpAndSettle();

      final fields = find.byType(TextField);
      expect(fields, findsNWidgets(8), reason: 'four account fields plus phone, WhatsApp, branches, address');
      await tester.enterText(fields.at(0), 'Showroom');
      await tester.enterText(fields.at(1), 'dealer@example.com');
      await tester.enterText(fields.at(2), 'long-enough');
      await tester.enterText(fields.at(3), 'long-enough');
      await tester.enterText(fields.at(4), '01001234567'); // leading zero: rejected
      await tester.enterText(fields.at(5), '1001234567');
      final submit = find.byType(ElevatedButton).first;
      await tester.ensureVisible(submit);
      await tester.tap(submit);
      await tester.pumpAndSettle();
      expect(app.repo.calls, isEmpty);

      await tester.enterText(fields.at(4), '1001234567');
      await tester.ensureVisible(submit);
      await tester.tap(submit);
      await tester.pumpAndSettle();
      expect(app.repo.calls, isEmpty, reason: 'dealers must accept the terms too');

      await tester.ensureVisible(find.byKey(const Key('accept-terms')));
      await tester.tap(find.byKey(const Key('accept-terms')));
      await tester.pumpAndSettle();
      await tester.ensureVisible(submit);
      await tester.tap(submit);
      await tester.pumpAndSettle();
      expect(app.repo.calls, ['register:dealer:dealer@example.com']);
      expect(app.repo.lastAcceptTerms, isTrue);
      expect(app.repo.lastRegisterExtra?['phone'], '+201001234567');
      expect(app.repo.lastRegisterExtra?['whatsapp_number'], '+201001234567');
    });

    testWidgets('forgot password requests a code and opens the reset OTP screen', (tester) async {
      final app = await pumpApp(tester, initialLocation: '/login');
      final forgot = find.byType(TextButton).first;
      await tester.ensureVisible(forgot);
      await tester.tap(forgot);
      await tester.pumpAndSettle();
      expect(find.byType(TextField), findsOneWidget, reason: 'only the email field');

      await tester.enterText(find.byType(TextField), 'buyer@example.com');
      await tester.tap(find.byType(ElevatedButton).first);
      await tester.pumpAndSettle();
      expect(app.repo.calls, ['forgot:buyer@example.com']);
      expect(find.text('OTP forgot_password buyer@example.com'), findsOneWidget);
    });
  });

  group('session and guarded routes', () {
    testWidgets('guests opening favorites or the profile are sent to sign-in', (tester) async {
      final app = await pumpApp(tester, initialLocation: '/favorites');
      expect(find.byType(AuthScreen), findsOneWidget);
      app.router.go('/profile');
      await tester.pumpAndSettle();
      expect(find.byType(AuthScreen), findsOneWidget);
    });

    testWidgets('a buyer cannot open the dealer dashboard', (tester) async {
      await pumpApp(tester, initialLocation: '/dealer-dashboard', user: buyer);
      expect(find.text('PROFILE'), findsOneWidget);
    });

    testWidgets('signed-in users skip the sign-in screen', (tester) async {
      await pumpApp(tester, initialLocation: '/login', user: buyer);
      expect(find.text('HOME'), findsOneWidget);
    });

    testWidgets('when the session ends (401 or log out) a guarded screen returns to sign-in', (tester) async {
      final app = await pumpApp(tester, initialLocation: '/favorites', user: buyer);
      expect(find.text('FAVORITES'), findsOneWidget);

      // ApiClient calls forceLogout on any 401 response.
      app.container.read(authProvider.notifier).forceLogout();
      await tester.pumpAndSettle();
      expect(find.byType(AuthScreen), findsOneWidget);
      expect(app.container.read(authProvider).valueOrNull, isNull);
    });
  });

  group('car details', () {
    testWidgets('shows the listing with WhatsApp and call actions', (tester) async {
      await pumpApp(tester, initialLocation: '/car/5');
      expect(find.textContaining('Toyota'), findsWidgets);
      expect(find.text('واتساب'), findsOneWidget);
      expect(find.byIcon(Icons.call_rounded), findsOneWidget);
    });

    testWidgets('no WhatsApp button when the dealer has no valid WhatsApp number', (tester) async {
      await pumpApp(tester, initialLocation: '/car/5', car: sampleCar(whatsapp: 'not-a-number'));
      expect(find.text('واتساب'), findsNothing);
      expect(find.byIcon(Icons.call_rounded), findsOneWidget);
    });

    testWidgets('a guest tapping the heart is sent to sign-in; nothing is saved', (tester) async {
      final cars = FakeCarRepository(sampleCar());
      await pumpApp(tester, initialLocation: '/car/5', cars: cars);
      await tester.tap(find.byIcon(Icons.favorite_border));
      await tester.pumpAndSettle();
      expect(find.byType(AuthScreen), findsOneWidget);
      expect(cars.toggled, isEmpty);
    });

    testWidgets('a signed-in buyer toggles the favorite, and a failed save is rolled back', (tester) async {
      final cars = FakeCarRepository(sampleCar());
      final app = await pumpApp(tester, initialLocation: '/car/5', user: buyer, cars: cars);
      await tester.tap(find.byIcon(Icons.favorite_border));
      await tester.pumpAndSettle();
      expect(cars.toggled, [5]);
      expect(app.container.read(favoritesProvider).valueOrNull, {5});
      expect(find.byIcon(Icons.favorite), findsOneWidget);

      cars.failToggle = true;
      await tester.tap(find.byIcon(Icons.favorite));
      await tester.pumpAndSettle();
      expect(app.container.read(favoritesProvider).valueOrNull, {5}, reason: 'restored after the error');
    });
  });

  group('real router', realRouterTests);

  group('home search layout', homeSearchLayoutTests);

  group('dealer contact links', () {
    test('stored numbers in any common Egyptian form become a wa.me link', () {
      for (final stored in ['+201001234567', '201001234567', '01001234567', '1001234567', '+20 100 123 4567']) {
        expect(toWhatsappLink(stored), 'https://wa.me/201001234567', reason: stored);
      }
    });

    test('missing or invalid numbers give no link', () {
      for (final stored in [null, '', '12345', '+201301234567', '+447700900123']) {
        expect(toWhatsappLink(stored), isNull, reason: '$stored');
      }
    });
  });
}

/// The app's real router (lib/core/router/app_router.dart) with its real
/// screens; only the repositories and the session are faked.
Future<({ProviderContainer container, GoRouter router})> pumpRealRouter(WidgetTester tester, {User? user}) async {
  SharedPreferences.setMockInitialValues({'onboarding_seen': true});
  final prefs = await SharedPreferences.getInstance();
  final container = ProviderContainer(overrides: [
    sharedPreferencesProvider.overrideWithValue(prefs),
    authRepositoryProvider.overrideWithValue(FakeAuthRepository()),
    carRepositoryProvider.overrideWithValue(FakeCarRepository(sampleCar())),
    marketRepositoryProvider.overrideWithValue(EmptyMarketRepository()),
    authProvider.overrideWith(() => FakeAuthNotifier(user)),
  ]);
  addTearDown(container.dispose);
  final router = container.read(routerProvider);
  await tester.pumpWidget(
    UncontrolledProviderScope(container: container, child: MaterialApp.router(routerConfig: router)),
  );
  await tester.pump();
  return (container: container, router: router);
}

/// Lets zero-length timers started by the real screens run before the test ends.
Future<void> flushTimers(WidgetTester tester) async {
  await tester.pumpWidget(const SizedBox.shrink());
  await tester.pump(const Duration(milliseconds: 10));
}

class EmptyMarketRepository extends MarketRepository {
  EmptyMarketRepository() : super(ApiClient(_NoToken()));

  @override
  Future<PartSearchResult> searchParts(String query) async => const PartSearchResult(parts: [], count: 0, noExactMatch: false);

  @override
  Future<List<PartOrder>> myOrders() async => const [];

  @override
  Future<List<AppNotification>> notifications() async => const [];
}

void realRouterTests() {
  testWidgets('real router: every buyer screen opens, and signed-in screens need an account', (tester) async {
    final guest = await pumpRealRouter(tester);
    for (final path in ['/ai-search', '/parts', '/compare']) {
      guest.router.go(path);
      await tester.pump();
      await tester.pump();
      expect(guest.router.routerDelegate.currentConfiguration.uri.path, path, reason: '$path is open to guests');
    }
    for (final path in ['/notifications', '/my-part-orders']) {
      guest.router.go(path);
      await tester.pump();
      await tester.pump();
      expect(guest.router.routerDelegate.currentConfiguration.uri.path, '/login', reason: '$path needs an account');
    }
    await flushTimers(tester);

    final signedIn = await pumpRealRouter(tester, user: buyer);
    for (final path in ['/notifications', '/my-part-orders']) {
      signedIn.router.go(path);
      await tester.pump();
      await tester.pump();
      expect(signedIn.router.routerDelegate.currentConfiguration.uri.path, path);
    }
    for (final removed in ['/subscription', '/dealer-categories']) {
      expect(() => signedIn.router.configuration.findMatch(Uri.parse(removed)).matches, returnsNormally);
      expect(signedIn.router.configuration.findMatch(Uri.parse(removed)).matches, isEmpty, reason: '$removed placeholder is gone');
    }
    await flushTimers(tester);
  });

  testWidgets('real router: guests are sent from favorites to sign-in', (tester) async {
    final app = await pumpRealRouter(tester);
    app.router.go('/favorites');
    await tester.pump();
    await tester.pump();
    expect(app.router.routerDelegate.currentConfiguration.uri.path, '/login');
    expect(find.byType(AuthScreen), findsOneWidget);
    await flushTimers(tester);
  });

  testWidgets('real router: a buyer is kept out of dealer tools, and a 401 logout returns to sign-in', (tester) async {
    final app = await pumpRealRouter(tester, user: buyer);
    app.router.go('/dealer-dashboard');
    await tester.pump();
    await tester.pump();
    expect(app.router.routerDelegate.currentConfiguration.uri.path, '/profile');

    app.container.read(authProvider.notifier).forceLogout();
    await tester.pump();
    await tester.pump();
    expect(app.router.routerDelegate.currentConfiguration.uri.path, '/login');
    await flushTimers(tester);
  });
}

/// The home hero at a phone-sized width, with an empty feed.
Future<void> pumpHome(WidgetTester tester, Size size) async {
  tester.view.physicalSize = size;
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  // The test font draws every glyph as a full-width square, which overflows the
  // collapsed app-bar title (it fits on devices). Layout is checked below.
  final reportError = FlutterError.onError;
  FlutterError.onError = (details) {
    if (!details.exceptionAsString().contains('overflowed')) reportError?.call(details);
  };
  addTearDown(() => FlutterError.onError = reportError);
  SharedPreferences.setMockInitialValues({});
  final prefs = await SharedPreferences.getInstance();
  await tester.pumpWidget(ProviderScope(
    overrides: [
      sharedPreferencesProvider.overrideWithValue(prefs),
      authProvider.overrideWith(() => FakeAuthNotifier(null)),
      homeDataProvider.overrideWith((ref) async => (cars: <Car>[], topDealers: <Dealer>[])),
    ],
    child: const MaterialApp(home: HomeScreen()),
  ));
  await tester.pump();
}

void homeSearchLayoutTests() {
  testWidgets('the search field is wide enough to use and Smart AI sits below it', (tester) async {
    await pumpHome(tester, const Size(412, 915));
    final field = tester.getRect(find.byType(TextField));
    final ai = tester.getRect(find.text('سوق السيارات الذكي'));
    expect(field.width, greaterThan(150), reason: 'was about 47 px wide on a 412 px phone');
    expect(ai.top, greaterThan(field.bottom), reason: 'the Smart AI button moves to its own row');
  });
}
