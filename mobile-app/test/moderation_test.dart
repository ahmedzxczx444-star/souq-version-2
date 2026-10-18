// Reporting content and blocking dealers (routes/moderation.ts): the API
// calls, the report sheet's states, the blocked-accounts screen, and hiding
// a blocked dealer's content. Everything runs on fakes; no request leaves
// the machine.
import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile_app/core/network/api_client.dart';
import 'package:mobile_app/core/network/api_endpoints.dart';
import 'package:mobile_app/core/network/api_exception.dart';
import 'package:mobile_app/core/storage/token_storage.dart';
import 'package:mobile_app/features/dealers/data/dealer_repository.dart';
import 'package:mobile_app/features/dealers/presentation/dealer_profile_screen.dart';
import 'package:mobile_app/features/moderation/data/moderation_repository.dart';
import 'package:mobile_app/features/moderation/presentation/blocked_accounts_screen.dart';
import 'package:mobile_app/features/moderation/presentation/report_sheet.dart';
import 'package:mobile_app/features/parts/data/market_repository.dart';
import 'package:mobile_app/features/parts/presentation/part_details_screen.dart';
import 'package:mobile_app/features/parts/presentation/parts_marketplace_screen.dart';
import 'package:mobile_app/shared/models/dealer_profile.dart';
import 'package:mobile_app/shared/models/user.dart';
import 'package:mobile_app/shared/providers/auth_provider.dart';
import 'package:mobile_app/shared/providers/core_providers.dart';
import 'package:shared_preferences/shared_preferences.dart';

const buyer = User(id: 7, email: 'buyer@example.com', name: 'Buyer', role: 'user');

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
}

/// Records every request and answers with [response].
class RecordingClient implements ApiClient {
  RecordingClient([this.response]);

  Object? response;
  final calls = <({String method, String path, Object? data})>[];

  Response<dynamic> _answer(String method, String path, [Object? data]) {
    calls.add((method: method, path: path, data: data));
    return Response(data: response, requestOptions: RequestOptions(path: path), statusCode: 200);
  }

  @override
  Future<Response<dynamic>> get(String path, {Map<String, dynamic>? query}) async => _answer('GET', path);

  @override
  Future<Response<dynamic>> post(String path, {Object? data, Duration? timeout}) async => _answer('POST', path, data);

  @override
  Future<Response<dynamic>> delete(String path) async => _answer('DELETE', path);

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class FakeModerationRepository extends ModerationRepository {
  FakeModerationRepository() : super(ApiClient(_NoToken()));

  List<BlockedAccount> blocked = [];
  Object? reportError;
  Object? blocksError;
  bool alreadyReported = false;
  int blockLoads = 0;
  final reports = <String>[];
  final actions = <String>[];

  @override
  Future<bool> report(ReportTarget target, int targetId, {required String reason, String? details}) async {
    if (reportError != null) throw reportError!;
    reports.add('${target.name}:$targetId:$reason:${details ?? ''}');
    return alreadyReported;
  }

  @override
  Future<List<BlockedAccount>> blocks() async {
    blockLoads++;
    if (blocksError != null) throw blocksError!;
    return blocked;
  }

  @override
  Future<void> blockDealer(int dealerId) async {
    actions.add('block:$dealerId');
    blocked = [...blocked, BlockedAccount(userId: 100 + dealerId, dealerId: dealerId, name: 'Dealer $dealerId')];
  }

  @override
  Future<void> unblock(int userId) async {
    actions.add('unblock:$userId');
    blocked = blocked.where((b) => b.userId != userId).toList();
  }
}

class FakeMarketRepository extends MarketRepository {
  FakeMarketRepository(this.parts) : super(ApiClient(_NoToken()));

  final List<MarketPart> parts;

  @override
  Future<PartSearchResult> searchParts(String query) async => PartSearchResult(parts: parts, count: parts.length, noExactMatch: false);

  @override
  Future<MarketPart> getPart(int id) async => parts.firstWhere((p) => p.id == id);
}

class FakeDealerRepository extends DealerRepository {
  FakeDealerRepository() : super(ApiClient(_NoToken()));

  @override
  Future<DealerProfile> getProfile(int id) async => DealerProfile.fromJson({
        'id': id, 'name': 'Nile Motors', 'logo': '', 'phone': '+201001234567', 'rating': 4.5,
        'branches_count': 1, 'reviews_count': 3, 'is_luxury': 0,
        'cars': [
          {
            'id': 11, 'dealer_id': id, 'make': 'Kia', 'model': 'Sportage', 'year': 2022, 'price': 1500000,
            'mileage': 1000, 'fuel_type': 'بنزين', 'transmission': 'Automatic', 'description': '',
            'images': <String>[], 'location': 'Cairo', 'status': 'available',
          },
        ],
        'branches': <Object>[],
      });

  @override
  Future<List<DealerReel>> getReels(int dealerId) async => const [];

  @override
  Future<bool> getFollowStatus(int id) async => false;
}

MarketPart part(int id, int dealerId) => MarketPart(id: id, dealerId: dealerId, name: 'Part $id', price: 100, dealerName: 'Shop $dealerId');

Future<ProviderContainer> pump(
  WidgetTester tester, {
  required Widget home,
  required FakeModerationRepository moderation,
  User? user = buyer,
  List<Override> overrides = const [],
  String path = '/',
}) async {
  tester.view.physicalSize = const Size(412, 1600);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  SharedPreferences.setMockInitialValues({});
  final sp = await SharedPreferences.getInstance();
  final container = ProviderContainer(overrides: [
    sharedPreferencesProvider.overrideWithValue(sp),
    authProvider.overrideWith(() => FakeAuthNotifier(user)),
    moderationRepositoryProvider.overrideWithValue(moderation),
    ...overrides,
  ]);
  addTearDown(container.dispose);
  final router = GoRouter(initialLocation: path, routes: [
    GoRoute(path: path, builder: (_, _) => home),
    GoRoute(path: '/login', builder: (_, _) => const Scaffold(body: Text('LOGIN'))),
    GoRoute(path: '/part/:id', builder: (_, s) => Scaffold(body: Text('PART ${s.pathParameters['id']}'))),
    GoRoute(path: '/car/:id', builder: (_, s) => Scaffold(body: Text('CAR ${s.pathParameters['id']}'))),
  ]);
  addTearDown(router.dispose);
  await tester.pumpWidget(UncontrolledProviderScope(container: container, child: MaterialApp.router(routerConfig: router)));
  await tester.pumpAndSettle();
  return container;
}

/// A page with one button that opens the report sheet for car 5.
class _ReportHost extends ConsumerWidget {
  const _ReportHost();

  @override
  Widget build(BuildContext context, WidgetRef ref) => Scaffold(
        body: Center(
          child: TextButton(
            key: const Key('open-report'),
            onPressed: () => showReportSheet(context, ref, ReportTarget.car, 5),
            child: const Text('open'),
          ),
        ),
      );
}

Future<void> openSheet(WidgetTester tester) async {
  await tester.tap(find.byKey(const Key('open-report')));
  await tester.pumpAndSettle();
}

void main() {
  group('API', () {
    test('endpoints match routes/moderation.ts', () {
      expect(ApiEndpoints.reports, '/api/reports');
      expect(ApiEndpoints.blocks, '/api/blocks');
      expect(ApiEndpoints.unblock(12), '/api/blocks/12');
      expect(ReportTarget.values.map((t) => t.name), ['car', 'reel', 'part', 'dealer', 'user']);
      expect(reportReasons, unorderedEquals(['spam', 'fraud', 'inappropriate', 'offensive', 'misleading', 'other']));
    });

    test('the repository sends the shapes the server validates', () async {
      final client = RecordingClient({'success': true, 'id': 3});
      final repo = ModerationRepository(client);

      expect(await repo.report(ReportTarget.reel, 9, reason: 'spam', details: '  '), isFalse);
      expect(client.calls.last.data, {'target_type': 'reel', 'target_id': 9, 'reason': 'spam'},
          reason: 'blank details are not sent');
      client.response = {'success': true, 'id': 3, 'alreadyReported': true};
      expect(await repo.report(ReportTarget.part, 4, reason: 'other', details: ' fake '), isTrue);
      expect((client.calls.last.data as Map)['details'], 'fake');

      await repo.blockDealer(6);
      expect((client.calls.last.method, client.calls.last.path), ('POST', '/api/blocks'));
      expect(client.calls.last.data, {'dealer_id': 6});
      await repo.unblock(21);
      expect((client.calls.last.method, client.calls.last.path), ('DELETE', '/api/blocks/21'));

      client.response = [
        {'user_id': 21, 'dealer_id': 6, 'name': 'Nile Motors', 'created_at': '2026-10-17'},
        {'user_id': 22, 'dealer_id': null, 'name': null},
      ];
      final list = await repo.blocks();
      expect(list.map((b) => (b.userId, b.dealerId, b.name)), [(21, 6, 'Nile Motors'), (22, null, null)]);
    });

    test('guests have no blocks and never call the server', () async {
      final repo = FakeModerationRepository()..blocked = [const BlockedAccount(userId: 1, dealerId: 2)];
      final container = ProviderContainer(overrides: [
        authProvider.overrideWith(() => FakeAuthNotifier(null)),
        moderationRepositoryProvider.overrideWithValue(repo),
      ]);
      addTearDown(container.dispose);
      expect(await container.read(blockedAccountsProvider.future), isEmpty);
      expect(container.read(blockedDealerIdsProvider), isEmpty);
      expect(repo.blockLoads, 0);
    });

    test('a failed block list hides nothing', () async {
      final repo = FakeModerationRepository()..blocksError = ApiException('', kind: ApiErrorKind.network);
      final container = ProviderContainer(overrides: [
        authProvider.overrideWith(() => FakeAuthNotifier(buyer)),
        moderationRepositoryProvider.overrideWithValue(repo),
      ]);
      addTearDown(container.dispose);
      await expectLater(container.read(blockedAccountsProvider.future), throwsA(isA<ApiException>()));
      expect(container.read(blockedDealerIdsProvider), isEmpty);
    });
  });

  group('report sheet', () {
    testWidgets('guests are sent to sign in instead', (tester) async {
      final repo = FakeModerationRepository();
      await pump(tester, home: const _ReportHost(), moderation: repo, user: null);
      await openSheet(tester);
      expect(find.text('LOGIN'), findsOneWidget);
      expect(repo.reports, isEmpty);
    });

    testWidgets('needs a reason, and details for "other"', (tester) async {
      final repo = FakeModerationRepository();
      await pump(tester, home: const _ReportHost(), moderation: repo);
      await openSheet(tester);

      await tester.tap(find.byKey(const Key('report-submit')));
      await tester.pumpAndSettle();
      expect(find.text('اختر سبب البلاغ'), findsOneWidget);

      await tester.tap(find.byKey(const Key('report-reason-other')));
      await tester.tap(find.byKey(const Key('report-submit')));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('report-error')), findsOneWidget);
      expect(repo.reports, isEmpty, reason: 'nothing reaches the server until the form is valid');

      await tester.enterText(find.byKey(const Key('report-details')), 'Asks for a deposit first');
      await tester.tap(find.byKey(const Key('report-submit')));
      await tester.pumpAndSettle();
      expect(repo.reports, ['car:5:other:Asks for a deposit first']);
      expect(find.byKey(const Key('report-submit')), findsNothing, reason: 'the sheet closes');
      expect(find.text('شكرًا، وصلنا بلاغك وسنراجعه.'), findsOneWidget);
    });

    testWidgets('server errors stay on the sheet so the user can retry', (tester) async {
      final repo = FakeModerationRepository()
        ..reportError = ApiException('Too many reports today. Please try again tomorrow.', statusCode: 429);
      await pump(tester, home: const _ReportHost(), moderation: repo);
      await openSheet(tester);
      await tester.tap(find.byKey(const Key('report-reason-fraud')));
      await tester.tap(find.byKey(const Key('report-submit')));
      await tester.pumpAndSettle();
      expect(find.text('أرسلت بلاغات كثيرة اليوم. حاول مرة أخرى غدًا.'), findsOneWidget);
      expect(find.byKey(const Key('report-submit')), findsOneWidget);

      repo.reportError = ApiException('This content no longer exists', statusCode: 404);
      await tester.tap(find.byKey(const Key('report-submit')));
      await tester.pumpAndSettle();
      expect(find.text('هذا المحتوى لم يعد موجودًا.'), findsOneWidget);

      repo.reportError = ApiException('', kind: ApiErrorKind.network);
      await tester.tap(find.byKey(const Key('report-submit')));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('report-error')), findsOneWidget);

      repo.reportError = null;
      await tester.tap(find.byKey(const Key('report-submit')));
      await tester.pumpAndSettle();
      expect(repo.reports, ['car:5:fraud:']);
    });

    testWidgets('a repeat report says it is already under review', (tester) async {
      final repo = FakeModerationRepository()..alreadyReported = true;
      await pump(tester, home: const _ReportHost(), moderation: repo);
      await openSheet(tester);
      await tester.tap(find.byKey(const Key('report-reason-spam')));
      await tester.tap(find.byKey(const Key('report-submit')));
      await tester.pumpAndSettle();
      expect(find.text('أبلغت عن هذا المحتوى من قبل وما زال قيد المراجعة.'), findsOneWidget);
    });

    testWidgets('part details opens the sheet for that part', (tester) async {
      final repo = FakeModerationRepository();
      await pump(tester,
          home: const PartDetailsScreen(partId: 3),
          moderation: repo,
          overrides: [marketRepositoryProvider.overrideWithValue(FakeMarketRepository([part(3, 5)]))]);
      await tester.tap(find.byKey(const Key('report-part')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('report-reason-misleading')));
      await tester.tap(find.byKey(const Key('report-submit')));
      await tester.pumpAndSettle();
      expect(repo.reports, ['part:3:misleading:']);
    });
  });

  group('blocking', () {
    testWidgets("a blocked dealer's parts are hidden from the marketplace", (tester) async {
      final repo = FakeModerationRepository()..blocked = [const BlockedAccount(userId: 50, dealerId: 2, name: 'Shop 2')];
      await pump(tester,
          home: const PartsMarketplaceScreen(),
          moderation: repo,
          overrides: [marketRepositoryProvider.overrideWithValue(FakeMarketRepository([part(1, 1), part(2, 2)]))]);
      expect(find.byKey(const Key('part-1')), findsOneWidget);
      expect(find.byKey(const Key('part-2')), findsNothing);
    });

    testWidgets('block a dealer from its page, then unblock it', (tester) async {
      final repo = FakeModerationRepository();
      await pump(tester,
          home: const DealerProfileScreen(dealerId: 4),
          moderation: repo,
          overrides: [dealerRepositoryProvider.overrideWithValue(FakeDealerRepository())]);
      expect(find.byKey(const Key('blocked-dealer-notice')), findsNothing);

      await tester.tap(find.byKey(const Key('dealer-menu')));
      await tester.pumpAndSettle();
      await tester.tap(find.text('حظر المعرض'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('إلغاء'));
      await tester.pumpAndSettle();
      expect(repo.actions, isEmpty, reason: 'cancelling the confirmation blocks nothing');

      await tester.tap(find.byKey(const Key('dealer-menu')));
      await tester.pumpAndSettle();
      await tester.tap(find.text('حظر المعرض'));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('confirm-block')));
      await tester.pumpAndSettle();
      expect(repo.actions, ['block:4']);
      expect(find.byKey(const Key('blocked-dealer-notice')), findsOneWidget, reason: 'the inventory is hidden');

      await tester.tap(find.byKey(const Key('dealer-menu')));
      await tester.pumpAndSettle();
      await tester.tap(find.text('إلغاء الحظر'));
      await tester.pumpAndSettle();
      expect(repo.actions, ['block:4', 'unblock:104']);
      expect(find.byKey(const Key('blocked-dealer-notice')), findsNothing);
    });

    testWidgets('guests who try to block are sent to sign in', (tester) async {
      final repo = FakeModerationRepository();
      await pump(tester,
          home: const DealerProfileScreen(dealerId: 4),
          moderation: repo,
          user: null,
          overrides: [dealerRepositoryProvider.overrideWithValue(FakeDealerRepository())]);
      await tester.tap(find.byKey(const Key('dealer-menu')));
      await tester.pumpAndSettle();
      await tester.tap(find.text('حظر المعرض'));
      await tester.pumpAndSettle();
      expect(find.text('LOGIN'), findsOneWidget);
      expect(repo.actions, isEmpty);
    });

    testWidgets("a dealer sees no report or block menu on its own page", (tester) async {
      const dealerUser = User(id: 9, email: 'd@example.com', name: 'D', role: 'dealer', dealerId: 4);
      await pump(tester,
          home: const DealerProfileScreen(dealerId: 4),
          moderation: FakeModerationRepository(),
          user: dealerUser,
          overrides: [dealerRepositoryProvider.overrideWithValue(FakeDealerRepository())]);
      expect(find.byKey(const Key('dealer-menu')), findsNothing);
    });

    testWidgets('blocked accounts: list, unblock, empty state', (tester) async {
      final repo = FakeModerationRepository()
        ..blocked = [const BlockedAccount(userId: 21, dealerId: 6, name: 'Nile Motors'), const BlockedAccount(userId: 22)];
      await pump(tester, home: const BlockedAccountsScreen(), moderation: repo);
      expect(find.text('Nile Motors'), findsOneWidget);
      expect(find.text('حساب محذوف'), findsOneWidget, reason: 'an erased account has no name');

      await tester.tap(find.byKey(const Key('unblock-21')));
      await tester.pumpAndSettle();
      expect(repo.actions, ['unblock:21']);
      expect(find.text('Nile Motors'), findsNothing);

      await tester.tap(find.byKey(const Key('unblock-22')));
      await tester.pumpAndSettle();
      expect(find.text('لم تحظر أي حساب'), findsOneWidget);
    });

    testWidgets('blocked accounts: a failed load can be retried', (tester) async {
      final repo = FakeModerationRepository()..blocksError = ApiException('', kind: ApiErrorKind.network);
      await pump(tester, home: const BlockedAccountsScreen(), moderation: repo);
      expect(find.byKey(const Key('retry')), findsOneWidget);

      repo
        ..blocksError = null
        ..blocked = [const BlockedAccount(userId: 21, dealerId: 6, name: 'Nile Motors')];
      await tester.tap(find.byKey(const Key('retry')));
      await tester.pumpAndSettle();
      expect(find.text('Nile Motors'), findsOneWidget);
    });
  });
}
