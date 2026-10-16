// Buyer features added after the first port: search filters, Smart AI,
// comparison, the parts marketplace, notifications, dealer registration
// types, and translated connection errors. Everything runs on fakes; no
// request leaves the machine.
import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile_app/core/l10n/app_strings.dart';
import 'package:mobile_app/core/network/api_client.dart';
import 'package:mobile_app/core/network/api_exception.dart';
import 'package:mobile_app/core/network/error_text.dart';
import 'package:mobile_app/core/storage/token_storage.dart';
import 'package:mobile_app/features/ai/data/ai_search_repository.dart';
import 'package:mobile_app/features/ai/presentation/ai_search_screen.dart';
import 'package:mobile_app/features/auth/data/auth_repository.dart';
import 'package:mobile_app/features/auth/presentation/auth_screen.dart';
import 'package:mobile_app/features/cars/data/car_filters.dart';
import 'package:mobile_app/features/cars/data/car_repository.dart';
import 'package:mobile_app/features/cars/presentation/compare_cars_screen.dart';
import 'package:mobile_app/features/cars/presentation/search_results_screen.dart';
import 'package:mobile_app/features/notifications/presentation/notifications_screen.dart';
import 'package:mobile_app/features/parts/data/market_repository.dart';
import 'package:mobile_app/features/parts/presentation/my_part_orders_screen.dart';
import 'package:mobile_app/features/parts/presentation/part_details_screen.dart';
import 'package:mobile_app/features/parts/presentation/parts_marketplace_screen.dart';
import 'package:mobile_app/shared/models/car.dart';
import 'package:mobile_app/shared/models/user.dart';
import 'package:mobile_app/shared/providers/auth_provider.dart';
import 'package:mobile_app/shared/providers/compare_provider.dart';
import 'package:mobile_app/shared/providers/core_providers.dart';
import 'package:shared_preferences/shared_preferences.dart';

const buyer = User(id: 7, email: 'buyer@example.com', name: 'Buyer', role: 'user');

Car car(int id, {String make = 'Toyota', String model = 'Corolla', int year = 2020, num price = 900000, num mileage = 50000,
        String fuel = 'بنزين', String gearbox = 'Automatic', String location = 'Nasr City, Cairo'}) =>
    Car(
      id: id,
      dealerId: 1,
      make: make,
      model: model,
      year: year,
      price: price,
      mileage: mileage,
      fuelType: fuel,
      transmission: gearbox,
      description: '',
      images: const [],
      location: location,
      status: 'available',
      dealerName: 'Dealer $id',
    );

final cars = [
  car(1, make: 'BMW', model: '320i', year: 2022, price: 2450000, mileage: 18000, location: 'New Cairo'),
  car(2, make: 'Kia', model: 'Sportage', year: 2021, price: 1200000, mileage: 40000, gearbox: 'Manual', location: 'Giza'),
  car(3, make: 'Toyota', model: 'Corolla', year: 2019, price: 750000, mileage: 90000, fuel: 'ديزل'),
];

class _NoToken extends TokenStorage {
  _NoToken() : super(const FlutterSecureStorage());

  @override
  Future<String?> readToken() async => null;
}

class FakeAuthNotifier extends AuthNotifier {
  FakeAuthNotifier(this.initial);

  final User? initial;

  @override
  FutureOr<User?> build() => initial;

  @override
  Future<void> logout() async => state = const AsyncData(null);
}

class FakeCarRepository extends CarRepository {
  FakeCarRepository({this.result, this.error}) : super(ApiClient(_NoToken()));

  SearchResult? result;
  Object? error;
  final queries = <String>[];

  @override
  Future<SearchResult> search(String query) async {
    queries.add(query);
    if (error != null) throw error!;
    return result!;
  }

  @override
  Future<List<Car>> getFavorites() async => const [];
}

class FakeAiRepository extends AiSearchRepository {
  FakeAiRepository() : super(ApiClient(_NoToken()));

  final calls = <({String message, List<String> history, Map<String, dynamic> slots})>[];
  final replies = <Object>[];

  @override
  Future<AiChatReply> chat(String message, List<AiChatMessage> history, Map<String, dynamic> slots) async {
    calls.add((message: message, history: [for (final h in history) '${h.role}:${h.content}'], slots: slots));
    final next = replies.removeAt(0);
    if (next is Exception) throw next;
    return next as AiChatReply;
  }
}

class FakeMarketRepository extends MarketRepository {
  FakeMarketRepository() : super(ApiClient(_NoToken()));

  List<MarketPart> parts = [];
  MarketPart? part;
  List<PartOrder> orders = [];
  List<AppNotification> notificationList = [];
  bool failMarkRead = false;
  final searches = <String>[];
  final placed = <String>[];
  final marked = <int>[];

  @override
  Future<PartSearchResult> searchParts(String query) async {
    searches.add(query);
    final q = query.toLowerCase();
    final found = parts.where((p) => q.isEmpty || p.name.toLowerCase().contains(q)).toList();
    return PartSearchResult(parts: found, count: found.length, noExactMatch: false);
  }

  @override
  Future<MarketPart> getPart(int id) async => part!;

  @override
  Future<int> placeOrder(int partId, {required String deliveryMethod, String? deliveryAddress, String? notes}) async {
    placed.add('$partId:$deliveryMethod:${deliveryAddress ?? ''}:${notes ?? ''}');
    return 99;
  }

  @override
  Future<List<PartOrder>> myOrders() async => orders;

  @override
  Future<List<AppNotification>> notifications() async => notificationList;

  @override
  Future<void> markRead(int id) async {
    marked.add(id);
    if (failMarkRead) throw ApiException('', kind: ApiErrorKind.network);
  }
}

class FakeAuthRepository implements AuthRepository {
  final registered = <Map<String, dynamic>>[];

  @override
  Future<RegisterResult> register({
    required String email,
    required String password,
    required String name,
    required String role,
    String? captchaToken,
    Map<String, dynamic> extra = const {},
  }) async {
    registered.add({'email': email, 'role': role, ...extra});
    return RegisterResult(email: email, requiresOtpVerification: true);
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

/// Records what an ApiClient was asked to send.
class RecordingClient implements ApiClient {
  RecordingClient(this.response);

  final Object? response;
  final sent = <({String path, Object? data, Duration? timeout})>[];

  @override
  Future<Response<dynamic>> post(String path, {Object? data, Duration? timeout}) async {
    sent.add((path: path, data: data, timeout: timeout));
    return Response(data: response, requestOptions: RequestOptions(path: path), statusCode: 200);
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

Future<ProviderContainer> pump(
  WidgetTester tester, {
  required String initial,
  required List<RouteBase> routes,
  List<Override> overrides = const [],
  User? user,
  Map<String, Object> prefs = const {},
}) async {
  // A tall phone-sized window so lazily built lists show their lower rows.
  tester.view.physicalSize = const Size(412, 1600);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  SharedPreferences.setMockInitialValues(prefs);
  final sp = await SharedPreferences.getInstance();
  final container = ProviderContainer(overrides: [
    sharedPreferencesProvider.overrideWithValue(sp),
    authProvider.overrideWith(() => FakeAuthNotifier(user)),
    ...overrides,
  ]);
  addTearDown(container.dispose);
  final router = GoRouter(initialLocation: initial, routes: [
    ...routes,
    GoRoute(path: '/login', builder: (_, _) => const Scaffold(body: Text('LOGIN'))),
    GoRoute(path: '/car/:id', builder: (_, s) => Scaffold(body: Text('CAR ${s.pathParameters['id']}'))),
    GoRoute(path: '/part/:id', builder: (_, s) => Scaffold(body: Text('PART ${s.pathParameters['id']}'))),
  ]);
  addTearDown(router.dispose);
  await tester.pumpWidget(UncontrolledProviderScope(container: container, child: MaterialApp.router(routerConfig: router)));
  await tester.pumpAndSettle();
  return container;
}

void main() {
  group('car filters', () {
    test('each filter narrows the list and counts as active', () {
      expect(const CarFilters().apply(cars).map((c) => c.id), [1, 2, 3]);
      expect(const CarFilters(make: 'bmw').apply(cars).map((c) => c.id), [1], reason: 'make ignores case');
      expect(const CarFilters(minPrice: 1000000).apply(cars).map((c) => c.id), [1, 2]);
      expect(const CarFilters(maxPrice: 1200000).apply(cars).map((c) => c.id), [2, 3]);
      expect(const CarFilters(minYear: 2020, maxYear: 2021).apply(cars).map((c) => c.id), [2]);
      expect(const CarFilters(fuelType: 'ديزل').apply(cars).map((c) => c.id), [3]);
      expect(const CarFilters(transmission: 'Manual').apply(cars).map((c) => c.id), [2]);
      expect(const CarFilters(city: 'cairo').apply(cars).map((c) => c.id), [1, 3], reason: 'city matches inside the location');
      expect(const CarFilters(make: 'Kia', minPrice: 1, city: 'giza').activeCount, 3);
      expect(const CarFilters(sort: CarSort.priceLow).activeCount, 0);
    });

    test('sorting', () {
      expect(const CarFilters(sort: CarSort.priceLow).apply(cars).map((c) => c.id), [3, 2, 1]);
      expect(const CarFilters(sort: CarSort.priceHigh).apply(cars).map((c) => c.id), [1, 2, 3]);
      expect(const CarFilters(sort: CarSort.newestYear).apply(cars).map((c) => c.id), [1, 2, 3]);
      expect(const CarFilters(sort: CarSort.lowestMileage).apply(cars).map((c) => c.id), [1, 2, 3]);
    });

    test('picker options are the distinct values present, sorted', () {
      expect(CarFilters.optionsOf([...cars, car(4, make: 'bmw')], (c) => c.make), ['BMW', 'Kia', 'Toyota']);
      expect(const CarFilters(make: 'Kia').copyWith(make: null).make, isNull);
    });
  });

  group('search results', () {
    final routes = [GoRoute(path: '/search', builder: (_, s) => SearchResultsScreen(query: s.uri.queryParameters['q'] ?? ''))];

    testWidgets('the filter sheet narrows the results and can be cleared', (tester) async {
      final repo = FakeCarRepository(result: SearchResult(cars: cars, noExactMatch: false));
      await pump(tester, initial: '/search?q=car', routes: routes, overrides: [carRepositoryProvider.overrideWithValue(repo)]);
      expect(repo.queries, ['car'], reason: 'one request');
      expect(find.textContaining('3 '), findsWidgets);

      await tester.tap(find.byKey(const Key('open-filters')));
      await tester.pumpAndSettle();
      await tester.enterText(find.descendant(of: find.byKey(const Key('price-min')), matching: find.byType(TextFormField)), '1000000');
      await tester.ensureVisible(find.byKey(const Key('filters-apply')));
      await tester.tap(find.byKey(const Key('filters-apply')));
      await tester.pumpAndSettle();
      expect(find.textContaining('2 '), findsWidgets);
      expect(find.textContaining('1 فلتر مفعّل'), findsOneWidget);
      expect(repo.queries, ['car'], reason: 'filtering does not ask the server again');

      await tester.tap(find.textContaining('مسح الكل'));
      await tester.pumpAndSettle();
      expect(find.textContaining('فلتر مفعّل'), findsNothing);
    });

    testWidgets('no connection shows a translated message and retry asks again', (tester) async {
      final repo = FakeCarRepository(error: ApiException('', kind: ApiErrorKind.network));
      await pump(tester, initial: '/search?q=bmw', routes: routes, overrides: [carRepositoryProvider.overrideWithValue(repo)]);
      expect(find.text(AppStrings.ar.networkError), findsOneWidget);
      repo
        ..error = null
        ..result = SearchResult(cars: [cars.first], noExactMatch: true);
      await tester.tap(find.byKey(const Key('retry')));
      await tester.pumpAndSettle();
      expect(repo.queries, ['bmw', 'bmw']);
      expect(find.textContaining('أقرب السيارات'), findsOneWidget, reason: 'the no-exact-match banner');
    });
  });

  group('error messages', () {
    test('server text, connection, timeout and anything else', () {
      const s = AppStrings.en;
      expect(errorMessage(ApiException('Car not found', statusCode: 404), s), 'Car not found');
      expect(errorMessage(ApiException('', statusCode: 500), s), s.genericError);
      expect(errorMessage(ApiException('', kind: ApiErrorKind.network), s), s.networkError);
      expect(errorMessage(ApiException('', kind: ApiErrorKind.timeout), s), s.timeoutError);
      expect(errorMessage(StateError('boom'), s), s.genericError);
      expect(errorMessage(ApiException('', kind: ApiErrorKind.network), AppStrings.ar), contains('الإنترنت'));
    });
  });

  group('Smart AI', () {
    test('the repository sends the last ten turns and the slots, with a long timeout', () async {
      final client = RecordingClient({
        'text': 'لقيت لك سيارة',
        'cars': [
          {'id': 1, 'dealer_id': 1, 'make': 'BMW', 'model': '320i', 'year': 2022, 'price': 1, 'mileage': 1, 'fuel_type': 'x',
           'transmission': 'x', 'description': '', 'images': [], 'location': 'x', 'status': 'available'},
          {'id': 'broken'},
        ],
        'slots': {'make': 'BMW'},
      });
      final history = [for (var i = 0; i < 14; i++) AiChatMessage(role: i.isEven ? 'user' : 'assistant', content: 'm$i')];
      final reply = await AiSearchRepository(client).chat('bmw', history, {'year': 2022});

      final sent = client.sent.single;
      expect(sent.path, '/api/ai-search/chat');
      expect(sent.timeout, AiSearchRepository.timeout);
      final body = sent.data as Map<String, dynamic>;
      expect(body['message'], 'bmw');
      expect((body['history'] as List).length, 10);
      expect((body['history'] as List).first, {'role': 'user', 'content': 'm4'});
      expect(body['slots'], {'year': 2022});
      expect(reply.cars.map((c) => c.id), [1], reason: 'an unreadable row is skipped');
      expect(reply.slots, {'make': 'BMW'});
    });

    testWidgets('a reply shows its cars; a failure can be retried without repeating the message', (tester) async {
      final repo = FakeAiRepository()
        ..replies.addAll([
          AiChatReply(text: 'لقيت لك سيارة', cars: [cars.first], slots: const {'make': 'BMW'}),
          ApiException('', kind: ApiErrorKind.timeout),
          AiChatReply(text: 'دي أرخص سيارة', cars: [cars[2]], slots: const {'make': 'BMW', 'maxPrice': 800000}),
        ]);
      await pump(tester,
          initial: '/ai',
          routes: [GoRoute(path: '/ai', builder: (_, _) => const AiSearchScreen())],
          overrides: [aiSearchRepositoryProvider.overrideWithValue(repo)]);

      await tester.enterText(find.byKey(const Key('ai-input')), 'عايز BMW');
      await tester.tap(find.byKey(const Key('ai-send')));
      await tester.pumpAndSettle();
      expect(find.text('لقيت لك سيارة'), findsOneWidget);
      expect(find.byKey(const Key('ai-car-1')), findsOneWidget);

      await tester.enterText(find.byKey(const Key('ai-input')), 'أرخص');
      await tester.tap(find.byKey(const Key('ai-send')));
      await tester.pumpAndSettle();
      expect(find.text(AppStrings.ar.timeoutError), findsOneWidget);

      await tester.tap(find.byKey(const Key('ai-retry')));
      await tester.pumpAndSettle();
      expect(find.text('دي أرخص سيارة'), findsOneWidget);
      expect(find.text('أرخص'), findsOneWidget, reason: 'the retried message is shown once');
      expect(repo.calls[1].history, ['user:عايز BMW', 'assistant:لقيت لك سيارة']);
      expect(repo.calls[2].history, repo.calls[1].history, reason: 'the retry does not add the failed message to the history');
      expect(repo.calls[2].slots, {'make': 'BMW'}, reason: 'slots from the last reply are sent back');

      await tester.tap(find.byKey(const Key('ai-car-3')));
      await tester.pumpAndSettle();
      expect(find.text('CAR 3'), findsOneWidget);
    });
  });

  group('comparison', () {
    test('holds up to three cars and toggles', () {
      final c = ProviderContainer();
      addTearDown(c.dispose);
      final n = c.read(compareProvider.notifier);
      expect(n.toggle(cars[0]), isTrue);
      expect(n.toggle(cars[1]), isTrue);
      expect(n.toggle(cars[2]), isTrue);
      expect(n.toggle(car(4)), isFalse, reason: 'full');
      expect(n.toggle(cars[1]), isTrue, reason: 'removing is always allowed');
      expect(c.read(compareProvider).map((x) => x.id), [1, 3]);
    });

    testWidgets('empty state, then the table marks the best values', (tester) async {
      final container = await pump(tester, initial: '/compare', routes: [GoRoute(path: '/compare', builder: (_, _) => const CompareCarsScreen())]);
      expect(find.text(AppStrings.ar.isArabic ? 'لم تختر سيارات للمقارنة' : ''), findsOneWidget);

      container.read(compareProvider.notifier)
        ..toggle(cars[0])
        ..toggle(cars[2]);
      await tester.pumpAndSettle();
      Color colorOf(String label, int id) =>
          tester.widget<Text>(find.byKey(Key('compare-cell-$label-$id'))).style!.color!;
      expect(colorOf('السعر', 3), isNot(colorOf('السعر', 1)), reason: 'the cheaper car is highlighted');
      expect(colorOf(AppStrings.ar.year, 1), isNot(colorOf(AppStrings.ar.year, 3)), reason: 'the newer car is highlighted');

      await tester.tap(find.byKey(const Key('compare-remove-1')));
      await tester.pumpAndSettle();
      expect(container.read(compareProvider).map((c) => c.id), [3]);
      expect(find.textContaining('أضف سيارة أخرى'), findsOneWidget);
    });
  });

  group('parts marketplace', () {
    MarketPart part(int id, String name, {bool delivery = true}) => MarketPart(
          id: id,
          dealerId: 5,
          name: name,
          price: 1500,
          deliverySupported: delivery,
          dealerName: 'Parts Shop',
          dealerPhone: '+201001234567',
          dealerWhatsapp: '+201001234567',
          compatibility: const [PartFit(make: 'Kia', model: 'Cerato', yearFrom: 2018, yearTo: 2021)],
        );

    test('parses the rows the server sends', () {
      final p = MarketPart.fromJson({
        'id': 3, 'dealer_id': 2, 'name': 'Brake pads', 'part_number': 'BP-1', 'manufacturer': 'Bosch',
        'condition_status': 'new', 'images': ['/uploads/parts/a.jpg'], 'price': 850, 'status': 'available',
        'delivery_supported': true,
        'compatibility': [{'make': 'Kia', 'model': 'Cerato', 'year_from': 2018, 'year_to': 2021}],
        'dealer_name': 'Shop', 'dealer_whatsapp': '+201001234567', 'dealer_map_link': '',
      });
      expect(p.partNumber, 'BP-1');
      expect(p.deliverySupported, isTrue);
      expect(p.compatibility.single.label, 'Kia Cerato 2018–2021');
      expect(p.dealerMapLink, isNull, reason: 'blank links are dropped');
      expect(p.imageUrls.single, endsWith('/uploads/parts/a.jpg'));

      final order = PartOrder.fromJson({
        'id': 9, 'status': 'confirmed', 'delivery_method': 'delivery', 'dealer_name': 'Shop',
        'items': [{'part_name': 'Brake pads', 'part_number': 'BP-1', 'price_at_order': 850}],
      });
      expect(order.items.single.name, 'Brake pads');
      final n = AppNotification.fromJson({'notification_id': 4, 'type': 'follow', 'message': 'hi', 'is_read': 0});
      expect((n.id, n.isRead, n.read().isRead), (4, false, true));
    });

    testWidgets('browse, search and open a part', (tester) async {
      final repo = FakeMarketRepository()..parts = [part(1, 'Brake pads'), part(2, 'Oil filter')];
      await pump(tester,
          initial: '/parts',
          routes: [GoRoute(path: '/parts', builder: (_, _) => const PartsMarketplaceScreen())],
          overrides: [marketRepositoryProvider.overrideWithValue(repo)]);
      expect(find.byKey(const Key('part-1')), findsOneWidget);
      expect(find.byKey(const Key('part-2')), findsOneWidget);

      await tester.enterText(find.byKey(const Key('parts-search')), 'oil');
      await tester.pump(const Duration(milliseconds: 500));
      await tester.pumpAndSettle();
      expect(repo.searches, ['', 'oil'], reason: 'typing is debounced into one search');
      expect(find.byKey(const Key('part-1')), findsNothing);

      await tester.tap(find.byKey(const Key('part-2')));
      await tester.pumpAndSettle();
      expect(find.text('PART 2'), findsOneWidget);
    });

    testWidgets('details: contact buttons, guests are sent to sign in', (tester) async {
      final repo = FakeMarketRepository()..part = part(1, 'Brake pads');
      await pump(tester,
          initial: '/p',
          routes: [GoRoute(path: '/p', builder: (_, _) => const PartDetailsScreen(partId: 1))],
          overrides: [marketRepositoryProvider.overrideWithValue(repo)]);
      expect(find.byKey(const Key('part-whatsapp')), findsOneWidget);
      expect(find.byKey(const Key('part-call')), findsOneWidget);
      expect(find.byKey(const Key('part-map')), findsNothing, reason: 'no map link');
      expect(find.textContaining('Kia Cerato'), findsOneWidget);

      await tester.ensureVisible(find.byKey(const Key('part-order')));
      await tester.tap(find.byKey(const Key('part-order')));
      await tester.pumpAndSettle();
      expect(find.text('LOGIN'), findsOneWidget);
      expect(repo.placed, isEmpty);
    });

    testWidgets('signed in: delivery needs an address, then the request is sent', (tester) async {
      final repo = FakeMarketRepository()..part = part(1, 'Brake pads');
      await pump(tester,
          initial: '/p',
          user: buyer,
          routes: [GoRoute(path: '/p', builder: (_, _) => const PartDetailsScreen(partId: 1))],
          overrides: [marketRepositoryProvider.overrideWithValue(repo)]);
      await tester.ensureVisible(find.byKey(const Key('part-order')));
      await tester.tap(find.byKey(const Key('part-order')));
      await tester.pumpAndSettle();

      await tester.tap(find.descendant(of: find.byType(SegmentedButton<String>), matching: find.text('توصيل')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('order-submit')));
      await tester.pumpAndSettle();
      expect(find.text('اكتب عنوان التوصيل'), findsOneWidget);
      expect(repo.placed, isEmpty);

      await tester.enterText(find.byKey(const Key('order-address')), 'Nasr City');
      await tester.enterText(find.byKey(const Key('order-notes')), 'Call first');
      await tester.tap(find.byKey(const Key('order-submit')));
      await tester.pumpAndSettle();
      expect(repo.placed, ['1:delivery:Nasr City:Call first']);
      expect(find.text('تم إرسال طلبك للتاجر'), findsOneWidget);
    });

    testWidgets('my orders: empty state and an order with its status', (tester) async {
      final repo = FakeMarketRepository();
      await pump(tester,
          initial: '/o',
          user: buyer,
          routes: [GoRoute(path: '/o', builder: (_, _) => const MyPartOrdersScreen())],
          overrides: [marketRepositoryProvider.overrideWithValue(repo)]);
      expect(find.text('لا توجد طلبات بعد'), findsOneWidget);
    });
  });

  group('notifications', () {
    final routes = [GoRoute(path: '/n', builder: (_, _) => const NotificationsScreen())];

    testWidgets('lists newest first; opening one marks it read, and a failed save is rolled back', (tester) async {
      final repo = FakeMarketRepository()
        ..notificationList = const [
          AppNotification(id: 2, type: 'follow', message: 'قام مستخدم بمتابعة معرضك', isRead: false),
          AppNotification(id: 1, type: 'approval', message: 'تمت الموافقة', isRead: true),
        ];
      final container = await pump(tester, initial: '/n', user: buyer, routes: routes, overrides: [marketRepositoryProvider.overrideWithValue(repo)]);
      expect(find.byKey(const Key('notifications-read-all')), findsOneWidget);

      await tester.tap(find.byKey(const Key('notification-2')));
      await tester.pumpAndSettle();
      expect(repo.marked, [2]);
      expect(container.read(notificationsProvider).value!.first.isRead, isTrue);
      expect(find.byKey(const Key('notifications-read-all')), findsNothing);

      await tester.tap(find.byKey(const Key('notification-1')));
      await tester.pumpAndSettle();
      expect(repo.marked, [2], reason: 'already read: no request');
    });

    testWidgets('a failed mark-as-read is rolled back', (tester) async {
      final repo = FakeMarketRepository()
        ..failMarkRead = true
        ..notificationList = const [AppNotification(id: 5, type: 'favorite', message: 'x', isRead: false)];
      final container = await pump(tester, initial: '/n', user: buyer, routes: routes, overrides: [marketRepositoryProvider.overrideWithValue(repo)]);
      await tester.tap(find.byKey(const Key('notification-5')));
      await tester.pumpAndSettle();
      expect(container.read(notificationsProvider).value!.single.isRead, isFalse);
    });

    testWidgets('empty state', (tester) async {
      await pump(tester, initial: '/n', user: buyer, routes: routes, overrides: [marketRepositoryProvider.overrideWithValue(FakeMarketRepository())]);
      expect(find.text('لا توجد إشعارات'), findsOneWidget);
    });
  });

  group('dealer registration', () {
    Future<FakeAuthRepository> openDealerForm(WidgetTester tester) async {
      final repo = FakeAuthRepository();
      await pump(tester,
          initial: '/login',
          routes: [
            GoRoute(path: '/login', builder: (_, _) => const AuthScreen()),
            GoRoute(path: '/otp', builder: (_, _) => const Scaffold(body: Text('OTP'))),
          ].sublist(0),
          overrides: [authRepositoryProvider.overrideWithValue(repo)]);
      final toggle = find.byType(TextButton).at(1);
      await tester.ensureVisible(toggle);
      await tester.tap(toggle);
      await tester.pumpAndSettle();
      final chips = find.byWidgetPredicate((w) => w.runtimeType.toString() == '_RoleChip');
      await tester.tap(chips.at(1));
      await tester.pumpAndSettle();
      final fields = find.byType(TextField);
      await tester.enterText(fields.at(0), 'Shop');
      await tester.enterText(fields.at(1), 'shop@example.com');
      await tester.enterText(fields.at(2), 'long-enough');
      await tester.enterText(fields.at(3), 'long-enough');
      return repo;
    }

    Future<void> fillPhonesAndSubmit(WidgetTester tester) async {
      final phone = find.widgetWithText(TextField, 'رقم الهاتف');
      final whatsapp = find.widgetWithText(TextField, 'رقم واتساب');
      await tester.ensureVisible(phone);
      await tester.enterText(phone, '1001234567');
      await tester.enterText(whatsapp, '1001234567');
      final submit = find.byType(ElevatedButton).first;
      await tester.ensureVisible(submit);
      await tester.tap(submit);
      await tester.pumpAndSettle();
    }

    testWidgets('a car dealer sends its category', (tester) async {
      final repo = await openDealerForm(tester);
      await tester.ensureVisible(find.byKey(const Key('dealer-category')));
      await tester.tap(find.byKey(const Key('dealer-category')));
      await tester.pumpAndSettle();
      await tester.tap(find.text('مستورد سيارات').last);
      await tester.pumpAndSettle();
      await fillPhonesAndSubmit(tester);
      expect(repo.registered.single['business_type'], 'car_dealer');
      expect(repo.registered.single['dealer_category'], 'importer');
      expect(find.text('OTP'), findsOneWidget);
    });

    testWidgets('a parts dealer sends no category', (tester) async {
      final repo = await openDealerForm(tester);
      await tester.ensureVisible(find.byKey(const Key('business-parts')));
      await tester.tap(find.byKey(const Key('business-parts')));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('dealer-category')), findsNothing);
      await fillPhonesAndSubmit(tester);
      expect(repo.registered.single['business_type'], 'parts_dealer');
      expect(repo.registered.single.containsKey('dealer_category'), isFalse);
    });

    testWidgets('missing fields are explained in the current language before anything is sent', (tester) async {
      final repo = FakeAuthRepository();
      await pump(tester,
          initial: '/login',
          prefs: const {'lang': 'en'},
          routes: [GoRoute(path: '/login', builder: (_, _) => const AuthScreen())],
          overrides: [authRepositoryProvider.overrideWithValue(repo)]);
      await tester.tap(find.byType(ElevatedButton).first);
      await tester.pumpAndSettle();
      expect(find.text('Enter your email address'), findsOneWidget);
      expect(repo.registered, isEmpty);
    });
  });
}
