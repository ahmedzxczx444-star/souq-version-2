// Dealer dashboard and management screens: which tools each dealer type
// gets, and that every screen loads, saves and deletes through the
// repository (never invented data), with loading / empty / error states.
import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile_app/core/l10n/app_strings.dart';
import 'package:mobile_app/core/l10n/dealer_strings.dart';
import 'package:mobile_app/core/network/api_client.dart';
import 'package:mobile_app/core/network/api_exception.dart';
import 'package:mobile_app/features/cars/presentation/add_car_screen.dart';
import 'package:mobile_app/features/dealers/data/dealer_account.dart';
import 'package:mobile_app/features/dealers/data/dealer_tools_repository.dart';
import 'package:mobile_app/features/dealers/data/resource_specs.dart';
import 'package:mobile_app/features/dealers/presentation/dealer_dashboard_screen.dart';
import 'package:mobile_app/features/dealers/presentation/manage/dealer_reels_screen.dart';
import 'package:mobile_app/features/dealers/presentation/manage/dealer_tool_gate.dart';
import 'package:mobile_app/features/dealers/presentation/manage/resource_list_screen.dart';
import 'package:mobile_app/features/parts/presentation/add_part_screen.dart';
import 'package:mobile_app/features/profile/presentation/edit_profile_screen.dart';
import 'package:mobile_app/shared/models/car.dart';
import 'package:mobile_app/shared/models/dealer_profile.dart';
import 'package:mobile_app/shared/models/user.dart';
import 'package:mobile_app/shared/providers/auth_provider.dart';
import 'package:mobile_app/shared/providers/core_providers.dart';
import 'package:shared_preferences/shared_preferences.dart';

final ar = AppStrings.ar;

Car car(int id, {String status = 'available', List<String> images = const []}) => Car(
      id: id,
      dealerId: 1,
      make: 'Toyota',
      model: 'Corolla',
      year: 2022,
      price: 900000,
      mileage: 12000,
      fuelType: 'Petrol',
      transmission: 'Automatic',
      description: 'Clean',
      images: images,
      location: 'Cairo',
      status: status,
    );

DealerAccount account(DealerKind kind, {String status = 'active', List<AccountBranch> branches = const []}) =>
    DealerAccount(id: 1, name: 'Nile Motors', status: status, kind: kind, phone: '+201001234567', branches: branches);

class FakeRepo implements DealerToolsRepository {
  FakeRepo(this.dealer);

  DealerAccount dealer;
  List<Car> cars = [];
  List<PartItem> partItems = [];
  List<DealerReel> reels = [];
  Map<String, List<Map<String, dynamic>>> recordsByPath = {};
  final calls = <String>[];
  final bodies = <Map<String, dynamic>>[];
  Object? failWith;
  Object? failAccount;

  void _maybeFail() {
    if (failWith != null) throw failWith!;
  }

  @override
  Future<DealerAccount> account() async {
    if (failAccount != null) throw failAccount!;
    return dealer;
  }

  @override
  Future<void> updateProfile(Map<String, dynamic> body) async {
    _maybeFail();
    calls.add('updateProfile');
    bodies.add(body);
  }

  @override
  Future<DealerStats> stats() async => DealerStats(totalCars: cars.length, totalFollowers: 7, totalLikes: 3);

  @override
  Future<PartsStats> partsStats() async =>
      PartsStats(totalParts: partItems.length, availableParts: partItems.where((p) => p.isAvailable).length, totalViews: 5);

  @override
  Future<ChainOverview> chainOverview() async => const ChainOverview(
        totalCars: 4,
        totalBranches: 2,
        unassignedCars: 1,
        employeeCount: 3,
        branches: [BranchPerformance(name: 'Maadi', region: 'Cairo', totalCars: 3, totalViews: 40)],
      );

  @override
  Future<List<Car>> myCars() async => cars;

  @override
  Future<int> createCar(Map<String, dynamic> body) async {
    _maybeFail();
    calls.add('createCar');
    bodies.add(body);
    return 99;
  }

  @override
  Future<void> updateCar(int id, Map<String, dynamic> body) async {
    _maybeFail();
    calls.add('updateCar:$id');
    bodies.add(body);
    cars = [for (final c in cars) c.id == id ? c.copyWith(status: body['status'] as String) : c];
  }

  @override
  Future<void> deleteCar(int id) async {
    _maybeFail();
    calls.add('deleteCar:$id');
    cars = cars.where((c) => c.id != id).toList();
  }

  @override
  Future<List<String>> uploadPhotos(List<PickedMedia> photos) async {
    calls.add('uploadPhotos:${photos.map((p) => p.name).join(',')}');
    return [for (final p in photos) '/uploads/cars/${p.name}'];
  }

  @override
  Future<String> uploadVideo(PickedMedia video, {void Function(double fraction)? onProgress}) async {
    calls.add('uploadVideo:${video.name}');
    onProgress?.call(1);
    return '/uploads/reels/${video.name}';
  }

  @override
  Future<List<DealerReel>> myReels() async => reels;

  @override
  Future<void> createReel({required String videoUrl, String caption = '', int? carId}) async {
    _maybeFail();
    calls.add('createReel:$videoUrl:$caption:$carId');
    reels = [...reels, DealerReel(id: 50, dealerId: 1, videoUrl: videoUrl, caption: caption, carId: carId)];
  }

  @override
  Future<void> deleteReel(int id) async {
    calls.add('deleteReel:$id');
    reels = reels.where((r) => r.id != id).toList();
  }

  @override
  Future<List<PartItem>> parts() async => partItems;

  @override
  Future<void> createPart(Map<String, dynamic> body) async {
    _maybeFail();
    calls.add('createPart');
    bodies.add(body);
  }

  @override
  Future<void> updatePart(int id, Map<String, dynamic> body) async {
    calls.add('updatePart:$id');
    bodies.add(body);
  }

  @override
  Future<void> setPartStatus(int id, String status) async => calls.add('setPartStatus:$id:$status');

  @override
  Future<void> deletePart(int id) async {
    calls.add('deletePart:$id');
    partItems = partItems.where((p) => p.id != id).toList();
  }

  @override
  Future<List<Map<String, dynamic>>> records(String path) async {
    _maybeFail();
    return recordsByPath[path] ?? [];
  }

  @override
  Future<void> createRecord(String path, Map<String, dynamic> body) async {
    calls.add('create $path');
    bodies.add(body);
    recordsByPath[path] = [...?recordsByPath[path], {'id': 100, ...body}];
  }

  @override
  Future<void> updateRecord(String path, Map<String, dynamic> body) async {
    calls.add('update $path');
    bodies.add(body);
  }

  @override
  Future<void> deleteRecord(String path) async {
    calls.add('delete $path');
    recordsByPath.updateAll((_, list) => list.where((r) => !path.endsWith('/${r['id']}')).toList());
  }
}

class FakePicker implements MediaPicker {
  List<PickedMedia> photos = const [];
  PickedMedia? video;

  @override
  Future<List<PickedMedia>> pickPhotos({required int limit}) async => photos;

  @override
  Future<PickedMedia?> pickVideo() async => video;
}

class FakeAuthNotifier extends AuthNotifier {
  FakeAuthNotifier(this._user);

  final User? _user;

  @override
  FutureOr<User?> build() => _user;
}

const dealerUser = User(id: 5, email: 'dealer@example.com', name: 'Dealer', role: 'dealer');
const buyerUser = User(id: 6, email: 'buyer@example.com', name: 'Buyer', role: 'user');

Future<void> pump(
  WidgetTester tester,
  FakeRepo repo, {
  required Widget home,
  FakePicker? picker,
  User? user = dealerUser,
}) async {
  // Tall surface so lazily built lists show everything under test.
  tester.view.physicalSize = const Size(900, 3200);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);

  SharedPreferences.setMockInitialValues({});
  final prefs = await SharedPreferences.getInstance();
  final router = GoRouter(
    initialLocation: '/start',
    routes: [
      GoRoute(path: '/start', builder: (_, _) => home),
      GoRoute(path: '/dealer-dashboard', builder: (_, _) => const Scaffold(body: Text('DASHBOARD'))),
      GoRoute(path: '/profile', builder: (_, _) => const Scaffold(body: Text('PROFILE'))),
      GoRoute(path: '/settings', builder: (_, _) => const Scaffold(body: Text('SETTINGS'))),
      GoRoute(path: '/add-car', builder: (_, _) => const Scaffold(body: Text('ADD CAR ROUTE'))),
      GoRoute(path: '/dealer-manage/:tool', builder: (_, s) => Scaffold(body: Text('MANAGE ${s.pathParameters['tool']}'))),
      GoRoute(path: '/edit-car/:id', builder: (_, s) => Scaffold(body: Text('EDIT CAR ${s.pathParameters['id']}'))),
    ],
  );
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        sharedPreferencesProvider.overrideWithValue(prefs),
        authProvider.overrideWith(() => FakeAuthNotifier(user)),
        dealerToolsRepositoryProvider.overrideWithValue(repo),
        mediaPickerProvider.overrideWithValue(picker ?? FakePicker()),
      ],
      child: MaterialApp.router(routerConfig: router),
    ),
  );
  await tester.pumpAndSettle();
}

Finder tool(DealerTool t) => find.byKey(Key('tool-${t.name}'));

class _RecordingClient implements ApiClient {
  final calls = <String>[];
  Object? data;

  Response<dynamic> _r(String call) {
    calls.add(call);
    return Response(data: data, requestOptions: RequestOptions(path: ''), statusCode: 200);
  }

  @override
  Future<Response<dynamic>> get(String path, {Map<String, dynamic>? query}) async => _r('GET $path');

  @override
  Future<Response<dynamic>> post(String path, {Object? data, Duration? timeout}) async => _r('POST $path');

  @override
  Future<Response<dynamic>> put(String path, {Object? data}) async => _r('PUT $path');

  @override
  Future<Response<dynamic>> delete(String path) async => _r('DELETE $path');

  @override
  Future<Response<dynamic>> upload(
    String path, {
    required String field,
    required List<({String path, String name, String mimeType})> files,
    void Function(int sent, int total)? onProgress,
  }) async =>
      _r('UPLOAD $path $field ${files.map((f) => '${f.name}:${f.mimeType}').join(',')}');
}

void main() {
  group('dealer types', () {
    test('backend fields map to the six dashboards', () {
      expect(dealerKindOf(businessType: 'car_dealer', dealerCategory: 'single'), DealerKind.single);
      expect(dealerKindOf(businessType: null, dealerCategory: null), DealerKind.single);
      expect(dealerKindOf(dealerCategory: 'multi_branch'), DealerKind.multiBranch);
      expect(dealerKindOf(dealerCategory: 'chain'), DealerKind.chain);
      expect(dealerKindOf(dealerCategory: 'importer'), DealerKind.importer);
      expect(dealerKindOf(dealerCategory: 'official_agent'), DealerKind.officialAgent);
      // A parts dealer is a parts dealer whatever category is stored.
      expect(dealerKindOf(businessType: 'parts_dealer', dealerCategory: 'chain'), DealerKind.parts);
    });

    test('each type gets exactly the tools its API group allows', () {
      const shared = {DealerTool.addCar, DealerTool.reels, DealerTool.profile};
      expect(toolsFor(DealerKind.single).toSet(), shared);
      expect(toolsFor(DealerKind.multiBranch).toSet(), {...shared, DealerTool.branches, DealerTool.employees});
      expect(toolsFor(DealerKind.chain).toSet(), {...shared, DealerTool.branches, DealerTool.employees});
      expect(toolsFor(DealerKind.importer).toSet(),
          {...shared, DealerTool.warehouses, DealerTool.shipments, DealerTool.preorders});
      expect(toolsFor(DealerKind.officialAgent).toSet(),
          {...shared, DealerTool.serviceCenters, DealerTool.offers, DealerTool.warranties});
      expect(toolsFor(DealerKind.parts).toSet(), {DealerTool.addPart, DealerTool.partOrders, DealerTool.profile});
    });

    test('every record tool has a spec pointing at its own API group', () {
      expect(resourceSpecs[DealerTool.branches]!.path, '/api/dealer/branches');
      expect(resourceSpecs[DealerTool.employees]!.path, '/api/dealer/employees');
      expect(resourceSpecs[DealerTool.warehouses]!.path, '/api/importer/warehouses');
      expect(resourceSpecs[DealerTool.shipments]!.path, '/api/importer/shipments');
      expect(resourceSpecs[DealerTool.preorders]!.path, '/api/importer/preorders');
      expect(resourceSpecs[DealerTool.serviceCenters]!.path, '/api/official/service-centers');
      expect(resourceSpecs[DealerTool.offers]!.path, '/api/official/offers');
      expect(resourceSpecs[DealerTool.warranties]!.path, '/api/official/warranties');
      expect(resourceSpecs[DealerTool.partOrders]!.path, '/api/parts/orders');
      expect(resourceSpecs[DealerTool.partOrders]!.status!.path(4), '/api/parts/orders/4/status');
    });
  });

  group('models and request bodies', () {
    test('DealerAccount and PartItem parse backend rows', () {
      final dealer = DealerAccount.fromJson({
        'id': 3,
        'name': 'Delta Parts',
        'status': 'pending',
        'business_type': 'parts_dealer',
        'dealer_category': 'single',
        'phone': '+201001234567',
        'description': null,
        'branches': [
          {'name': 'Main', 'address': 'Street 1', 'phone': null, 'map_link': null},
        ],
      });
      expect(dealer.kind, DealerKind.parts);
      expect(dealer.isActive, isFalse);
      expect(dealer.description, '');
      expect(dealer.branches.single.name, 'Main');

      final part = PartItem.fromJson({
        'id': 9,
        'name': 'Oil filter',
        'part_number': null,
        'images': ['/uploads/cars/a.png'],
        'price': 450,
        'status': 'unavailable',
        'delivery_supported': true,
        'compatibility': [
          {'make': 'Toyota', 'model': 'Corolla', 'year_from': 2015, 'year_to': 2022},
        ],
      });
      expect(part.isAvailable, isFalse);
      expect(part.coverImage, endsWith('/uploads/cars/a.png'));
      expect(part.compatibility.single.toJson(), {'make': 'Toyota', 'model': 'Corolla', 'yearFrom': 2015, 'yearTo': 2022});
    });

    test('upload rules match the server limits', () {
      expect(UploadRules.photoAllowed(const PickedMedia(path: 'a', name: 'a.JPG', sizeBytes: 1000)), isTrue);
      expect(UploadRules.photoAllowed(const PickedMedia(path: 'a', name: 'a.gif')), isFalse);
      expect(UploadRules.photoAllowed(const PickedMedia(path: 'a', name: 'a.png', sizeBytes: 6 * 1024 * 1024)), isFalse);
      expect(UploadRules.videoAllowed(const PickedMedia(path: 'v', name: 'v.mov', sizeBytes: 50 * 1024 * 1024)), isTrue);
      expect(UploadRules.videoAllowed(const PickedMedia(path: 'v', name: 'v.avi')), isFalse);
      expect(UploadRules.videoAllowed(const PickedMedia(path: 'v', name: 'v.mp4', sizeBytes: 101 * 1024 * 1024)), isFalse);
    });

    test('record bodies carry only what each route reads', () {
      final employees = resourceSpecs[DealerTool.employees]!;
      expect(buildRecordBody(employees, {'email': ' a@b.com ', 'role': 'regional_manager'}), {
        'email': 'a@b.com',
        'role': 'regional_manager',
        'permissions': {'manage_cars': true, 'manage_branches': true, 'view_reports': true},
      });
      // Editing keeps the branch assignment the form does not show, and never resends the email.
      expect(buildRecordBody(employees, {'email': 'x', 'role': 'staff'}, existing: {'id': 2, 'branch_id': 8}),
          {'role': 'staff', 'branch_id': 8});

      final centers = resourceSpecs[DealerTool.serviceCenters]!;
      final body = buildRecordBody(centers, {'name': 'C', 'address': 'A', 'phone': '', 'services': 'Oil، Brakes, Tires'});
      expect(body['services'], ['Oil', 'Brakes', 'Tires']);
      expect(initialRecordValues(centers, {'services': '["Oil","Brakes"]'})['services'], 'Oil, Brakes');

      final warranties = resourceSpecs[DealerTool.warranties]!;
      final w = buildRecordBody(warranties,
          {'car_id': '12', 'warranty_type': 'Factory', 'duration_months': '36', 'coverage_details': ''});
      expect(w['car_id'], 12);
      expect(w['duration_months'], 36);
    });

    test('listingBody keeps every field when only the status changes', () {
      final body = listingBody(car(1, images: ['/uploads/cars/a.png']), status: 'sold');
      expect(body['status'], 'sold');
      expect(body['images'], ['/uploads/cars/a.png']);
      expect(body.keys.toSet(), {
        'make', 'model', 'year', 'price', 'mileage', 'location', 'fuel_type', 'transmission', 'description', 'images', 'status',
      });
    });

    test('the repository calls the backend routes the server defines', () async {
      final client = _RecordingClient();
      final repo = DealerToolsRepository(client);
      client.data = {'id': 4};
      await repo.createCar({});
      await repo.updateCar(4, {});
      await repo.deleteCar(4);
      await repo.deleteReel(7);
      await repo.setPartStatus(3, 'unavailable');
      client.data = {'images': ['/uploads/cars/x.png']};
      await repo.uploadPhotos(const [PickedMedia(path: 'p', name: 'x.png')]);
      client.data = {'video_url': '/uploads/reels/v.mov'};
      await repo.uploadVideo(const PickedMedia(path: 'v', name: 'v.mov'));
      expect(client.calls, [
        'POST /api/cars',
        'PUT /api/cars/4',
        'DELETE /api/cars/4',
        'DELETE /api/reels/7',
        'PUT /api/parts/3/status',
        'UPLOAD /api/cars/upload images x.png:image/png',
        'UPLOAD /api/reels/upload video v.mov:video/quicktime',
      ]);
    });
  });

  group('dashboard', () {
    for (final kind in DealerKind.values) {
      testWidgets('${kind.name}: shows its own tools and no others', (tester) async {
        final repo = FakeRepo(account(kind));
        await pump(tester, repo, home: const DealerDashboardScreen());

        expect(find.text('Nile Motors'), findsOneWidget);
        expect(find.text(ar.kindLabel(kind.name)), findsOneWidget);
        for (final t in DealerTool.values) {
          expect(tool(t), toolsFor(kind).contains(t) ? findsOneWidget : findsNothing, reason: '${kind.name} / ${t.name}');
        }
        expect(find.byKey(const Key('chain-overview')), kind == DealerKind.chain ? findsOneWidget : findsNothing);
        expect(find.text(kind == DealerKind.parts ? ar.noPartsYet : ar.noListingsYet), findsOneWidget);
        expect(find.byKey(const Key('dealer-status-banner')), findsNothing);
      });
    }

    testWidgets('a pending dealer sees why and cannot open the publishing tools', (tester) async {
      final repo = FakeRepo(account(DealerKind.single, status: 'pending'));
      await pump(tester, repo, home: const DealerDashboardScreen());
      expect(find.text(ar.pendingApprovalTitle), findsOneWidget);

      await tester.tap(tool(DealerTool.addCar));
      await tester.pumpAndSettle();
      expect(find.text('ADD CAR ROUTE'), findsNothing);
    });

    testWidgets('tools navigate; record tools carry their name', (tester) async {
      final repo = FakeRepo(account(DealerKind.importer));
      await pump(tester, repo, home: const DealerDashboardScreen());
      await tester.tap(tool(DealerTool.shipments));
      await tester.pumpAndSettle();
      expect(find.text('MANAGE shipments'), findsOneWidget);
    });

    testWidgets('a failed load shows the server message and retries', (tester) async {
      final repo = FakeRepo(account(DealerKind.single))..failAccount = ApiException('Only dealers can access this', statusCode: 403);
      await pump(tester, repo, home: const DealerDashboardScreen());
      expect(find.text('Only dealers can access this'), findsOneWidget);
      expect(find.text('Nile Motors'), findsNothing);

      repo.failAccount = null;
      await tester.tap(find.byKey(const Key('retry')));
      await tester.pumpAndSettle();
      expect(find.text('Nile Motors'), findsOneWidget);
    });

    testWidgets('a buyer gets no dashboard', (tester) async {
      final repo = FakeRepo(account(DealerKind.single));
      await pump(tester, repo, home: const DealerDashboardScreen(), user: buyerUser);
      expect(find.text(ar.dealersOnly), findsOneWidget);
      expect(find.text('Nile Motors'), findsNothing);
    });

    testWidgets('listings: change status, then delete after confirming', (tester) async {
      final repo = FakeRepo(account(DealerKind.single))..cars = [car(1), car(2, status: 'hidden')];
      await pump(tester, repo, home: const DealerDashboardScreen());
      expect(find.byKey(const Key('listing-1')), findsOneWidget);
      expect(find.textContaining(ar.hiddenByAdmin), findsOneWidget);

      await tester.tap(find.byKey(const Key('listing-menu-1')));
      await tester.pumpAndSettle();
      await tester.tap(find.text(ar.sold).last);
      await tester.pumpAndSettle();
      expect(repo.calls, ['updateCar:1']);
      expect(repo.bodies.single['status'], 'sold');
      expect(repo.bodies.single['make'], 'Toyota');

      // The hidden listing offers no way to republish it.
      await tester.tap(find.byKey(const Key('listing-menu-2')));
      await tester.pumpAndSettle();
      expect(find.text(ar.available), findsNothing);
      await tester.tap(find.text(ar.delete).last);
      await tester.pumpAndSettle();
      await tester.tap(find.text(ar.cancel));
      await tester.pumpAndSettle();
      expect(repo.calls, ['updateCar:1'], reason: 'cancelled delete does nothing');

      await tester.tap(find.byKey(const Key('listing-menu-2')));
      await tester.pumpAndSettle();
      await tester.tap(find.text(ar.delete).last);
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('confirm-delete')));
      await tester.pumpAndSettle();
      expect(repo.calls, ['updateCar:1', 'deleteCar:2']);
      expect(find.byKey(const Key('listing-2')), findsNothing);
    });

    testWidgets('parts dealer: inventory with availability toggle and delete', (tester) async {
      final repo = FakeRepo(account(DealerKind.parts))
        ..partItems = [const PartItem(id: 3, name: 'Oil filter', price: 450, partNumber: 'OF-1')];
      await pump(tester, repo, home: const DealerDashboardScreen());
      expect(find.text('Oil filter'), findsOneWidget);
      expect(find.byKey(const Key('listing-1')), findsNothing);

      await tester.tap(find.byKey(const Key('part-menu-3')));
      await tester.pumpAndSettle();
      await tester.tap(find.text(ar.unavailable).last);
      await tester.pumpAndSettle();
      expect(repo.calls, ['setPartStatus:3:unavailable']);

      await tester.tap(find.byKey(const Key('part-menu-3')));
      await tester.pumpAndSettle();
      await tester.tap(find.text(ar.delete).last);
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('confirm-delete')));
      await tester.pumpAndSettle();
      expect(repo.calls.last, 'deletePart:3');
      expect(find.text(ar.noPartsYet), findsOneWidget);
    });
  });

  group('listing form', () {
    Future<void> fill(WidgetTester tester, String key, String text) => tester.enterText(find.byKey(Key(key)), text);

    testWidgets('validates before anything is uploaded', (tester) async {
      final repo = FakeRepo(account(DealerKind.single));
      await pump(tester, repo, home: const AddCarScreen());
      await tester.tap(find.byKey(const Key('car-submit')));
      await tester.pumpAndSettle();
      expect(find.text(ar.requiredField), findsNWidgets(2));
      expect(find.text(ar.invalidYear), findsOneWidget);
      expect(repo.calls, isEmpty);

      await fill(tester, 'car-make', 'BMW');
      await fill(tester, 'car-model', 'X5');
      await fill(tester, 'car-year', '2021');
      await fill(tester, 'car-price', '2500000');
      await tester.tap(find.byKey(const Key('car-submit')));
      await tester.pumpAndSettle();
      expect(find.text(ar.photoRequired), findsOneWidget);
      expect(repo.calls, isEmpty);
    });

    testWidgets('uploads the photos and video, then creates the listing', (tester) async {
      final repo = FakeRepo(account(DealerKind.single));
      final picker = FakePicker()
        ..photos = const [
          PickedMedia(path: 'a.jpg', name: 'a.jpg', sizeBytes: 1000),
          PickedMedia(path: 'b.gif', name: 'b.gif', sizeBytes: 1000),
        ]
        ..video = const PickedMedia(path: 'clip.mp4', name: 'clip.mp4', sizeBytes: 5000);
      await pump(tester, repo, home: const AddCarScreen(), picker: picker);

      await tester.tap(find.byKey(const Key('add-photos')));
      await tester.pumpAndSettle();
      expect(find.text(ar.photoRejected), findsOneWidget, reason: 'the GIF is refused on the device');
      expect(find.text('${ar.photos} (1/10)'), findsOneWidget);

      await tester.tap(find.byKey(const Key('car-video')));
      await tester.pumpAndSettle();
      expect(find.text('clip.mp4'), findsOneWidget);

      await fill(tester, 'car-make', 'BMW');
      await fill(tester, 'car-model', 'X5');
      await fill(tester, 'car-year', '2021');
      await fill(tester, 'car-price', '2500000');
      await fill(tester, 'car-mileage', '30000');
      await fill(tester, 'car-location', 'Giza');
      await tester.tap(find.byKey(const Key('car-submit')));
      await tester.pumpAndSettle();

      expect(repo.calls, ['uploadPhotos:a.jpg', 'uploadVideo:clip.mp4', 'createCar']);
      expect(repo.bodies.single, {
        'make': 'BMW',
        'model': 'X5',
        'year': 2021,
        'price': 2500000,
        'mileage': 30000,
        'location': 'Giza',
        'fuel_type': 'Petrol',
        'transmission': 'Automatic',
        'description': '',
        'images': ['/uploads/cars/a.jpg'],
        'status': 'available',
        'video_url': '/uploads/reels/clip.mp4',
      });
      expect(find.text('DASHBOARD'), findsOneWidget);
    });

    testWidgets('a server refusal is shown and a retry does not upload the photos again', (tester) async {
      final repo = FakeRepo(account(DealerKind.single))
        ..failWith = ApiException('Your account is pending approval', statusCode: 403);
      final picker = FakePicker()..photos = const [PickedMedia(path: 'a.jpg', name: 'a.jpg')];
      await pump(tester, repo, home: const AddCarScreen(), picker: picker);
      await tester.tap(find.byKey(const Key('add-photos')));
      await tester.pumpAndSettle();
      await fill(tester, 'car-make', 'BMW');
      await fill(tester, 'car-model', 'X5');
      await fill(tester, 'car-year', '2021');
      await fill(tester, 'car-price', '1');
      await tester.tap(find.byKey(const Key('car-submit')));
      await tester.pumpAndSettle();
      expect(find.text('Your account is pending approval'), findsOneWidget);

      repo.failWith = null;
      await tester.tap(find.byKey(const Key('car-submit')));
      await tester.pumpAndSettle();
      expect(repo.calls, ['uploadPhotos:a.jpg', 'createCar']);
    });

    testWidgets('editing starts from the listing and saves with PUT', (tester) async {
      final repo = FakeRepo(account(DealerKind.single));
      await pump(tester, repo, home: AddCarScreen(car: car(8, status: 'reserved', images: ['/uploads/cars/old.png'])));
      expect(find.text(ar.editCar), findsOneWidget);
      expect(find.text('Corolla'), findsOneWidget);
      expect(find.byKey(const Key('car-video')), findsNothing, reason: 'the edit route has no video field');

      await fill(tester, 'car-price', '880000');
      await tester.tap(find.byKey(const Key('car-submit')));
      await tester.pumpAndSettle();
      expect(repo.calls, ['updateCar:8']);
      expect(repo.bodies.single['price'], 880000);
      expect(repo.bodies.single['status'], 'reserved');
      expect(repo.bodies.single['images'], ['/uploads/cars/old.png']);
    });
  });

  group('record lists', () {
    testWidgets('branches: empty state, add, edit, delete', (tester) async {
      final repo = FakeRepo(account(DealerKind.multiBranch));
      await pump(tester, repo, home: const ResourceListScreen(tool: DealerTool.branches));
      expect(find.text(ar.nothingHere), findsOneWidget);

      await tester.tap(find.byKey(const Key('record-add')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('record-save')));
      await tester.pumpAndSettle();
      expect(repo.calls, isEmpty, reason: 'name and address are required');

      await tester.enterText(find.byKey(const Key('field-name')), 'Maadi');
      await tester.enterText(find.byKey(const Key('field-address')), 'Road 9');
      await tester.tap(find.byKey(const Key('field-is_headquarters')));
      await tester.tap(find.byKey(const Key('record-save')));
      await tester.pumpAndSettle();
      expect(repo.calls, ['create /api/dealer/branches']);
      expect(repo.bodies.single,
          {'name': 'Maadi', 'address': 'Road 9', 'phone': '', 'region': '', 'map_link': '', 'is_headquarters': true});
      expect(find.text('Maadi'), findsOneWidget);

      await tester.tap(find.byKey(const Key('record-edit-100')));
      await tester.pumpAndSettle();
      await tester.enterText(find.byKey(const Key('field-region')), 'Cairo');
      await tester.tap(find.byKey(const Key('record-save')));
      await tester.pumpAndSettle();
      expect(repo.calls.last, 'update /api/dealer/branches/100');
      expect(repo.bodies.last['region'], 'Cairo');

      await tester.tap(find.byKey(const Key('record-delete-100')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('confirm-delete')));
      await tester.pumpAndSettle();
      expect(repo.calls.last, 'delete /api/dealer/branches/100');
      expect(find.text(ar.nothingHere), findsOneWidget);
    });

    testWidgets('pre-orders are read-only apart from their status', (tester) async {
      final repo = FakeRepo(account(DealerKind.importer))
        ..recordsByPath['/api/importer/preorders'] = [
          {'id': 4, 'car_make': 'Kia', 'car_model': 'EV6', 'desired_year': 2025, 'status': 'requested', 'customer_name': 'Omar'},
        ];
      await pump(tester, repo, home: const ResourceListScreen(tool: DealerTool.preorders));
      expect(find.text('Kia EV6 2025'), findsOneWidget);
      expect(find.byKey(const Key('record-add')), findsNothing);
      expect(find.byKey(const Key('record-delete-4')), findsNothing);

      await tester.tap(find.byKey(const Key('record-status-4-confirmed')));
      await tester.pumpAndSettle();
      expect(repo.calls, ['update /api/importer/preorders/4']);
      expect(repo.bodies.single, {'status': 'confirmed'});
    });

    testWidgets('a refusal from the API is shown, not hidden', (tester) async {
      final repo = FakeRepo(account(DealerKind.single))
        ..failWith = ApiException('This feature is not available for your dealer type', statusCode: 403);
      await pump(tester, repo, home: const ResourceListScreen(tool: DealerTool.warehouses));
      expect(find.text('This feature is not available for your dealer type'), findsOneWidget);
    });

    testWidgets('the gate keeps a dealer out of another type\'s tool', (tester) async {
      final repo = FakeRepo(account(DealerKind.single));
      await pump(
        tester,
        repo,
        home: DealerToolGate(tool: DealerTool.branches, builder: (_) => const ResourceListScreen(tool: DealerTool.branches)),
      );
      expect(find.text('هذه الخاصية غير متاحة لنوع حسابك'), findsOneWidget);
      expect(find.byKey(const Key('record-add')), findsNothing);
    });

    testWidgets('the gate opens the tool for a type that has it', (tester) async {
      final repo = FakeRepo(account(DealerKind.chain));
      await pump(
        tester,
        repo,
        home: DealerToolGate(tool: DealerTool.branches, builder: (_) => const ResourceListScreen(tool: DealerTool.branches)),
      );
      expect(find.byKey(const Key('record-add')), findsOneWidget);
    });
  });

  group('reels', () {
    testWidgets('post a reel from a picked video, then delete it', (tester) async {
      final repo = FakeRepo(account(DealerKind.single))..cars = [car(1)];
      final picker = FakePicker()..video = const PickedMedia(path: 'r.mov', name: 'r.mov', sizeBytes: 9000);
      await pump(tester, repo, home: const DealerReelsScreen(), picker: picker);
      expect(find.text(ar.noReelsYet), findsOneWidget);

      await tester.tap(find.byKey(const Key('reel-new')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('reel-submit')));
      await tester.pumpAndSettle();
      expect(repo.calls, isEmpty, reason: 'no video chosen yet');

      await tester.tap(find.byKey(const Key('reel-pick')));
      await tester.pumpAndSettle();
      await tester.enterText(find.byKey(const Key('reel-caption')), 'New arrival');
      await tester.tap(find.byKey(const Key('reel-submit')));
      await tester.pumpAndSettle();
      expect(repo.calls, ['uploadVideo:r.mov', 'createReel:/uploads/reels/r.mov:New arrival:null']);
      expect(find.text('New arrival'), findsOneWidget);

      await tester.tap(find.byKey(const Key('reel-delete-50')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('confirm-delete')));
      await tester.pumpAndSettle();
      expect(repo.calls.last, 'deleteReel:50');
      expect(find.text(ar.noReelsYet), findsOneWidget);
    });

    testWidgets('an unsupported video is refused before upload', (tester) async {
      final repo = FakeRepo(account(DealerKind.single));
      final picker = FakePicker()..video = const PickedMedia(path: 'r.avi', name: 'r.avi');
      await pump(tester, repo, home: const DealerReelsScreen(), picker: picker);
      await tester.tap(find.byKey(const Key('reel-new')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('reel-pick')));
      await tester.pumpAndSettle();
      expect(find.text(ar.videoRejected), findsOneWidget);
      await tester.tap(find.byKey(const Key('reel-submit')));
      await tester.pumpAndSettle();
      expect(repo.calls, isEmpty);
    });
  });

  group('showroom profile', () {
    testWidgets('validates the phone and saves it in +20 form with the branch list', (tester) async {
      final repo = FakeRepo(account(DealerKind.single, branches: const [AccountBranch(name: 'Main', address: 'St 1')]));
      await pump(tester, repo, home: const EditProfileScreen());
      expect(find.text('Nile Motors'), findsOneWidget);
      expect(find.text('1001234567'), findsOneWidget, reason: 'stored +20 number shown as its local part');

      await tester.enterText(find.byKey(const Key('profile-phone')), '12345');
      await tester.tap(find.byKey(const Key('profile-submit')));
      await tester.pumpAndSettle();
      expect(find.text(ar.invalidPhone), findsOneWidget);
      expect(repo.calls, isEmpty);

      await tester.enterText(find.byKey(const Key('profile-phone')), '1112223334');
      await tester.enterText(find.byKey(const Key('profile-name')), 'Nile Motors Group');
      await tester.tap(find.byKey(const Key('profile-submit')));
      await tester.pumpAndSettle();
      expect(repo.calls, ['updateProfile']);
      final body = repo.bodies.single;
      expect(body['name'], 'Nile Motors Group');
      expect(body['phone'], '+201112223334');
      expect(body['whatsapp_number'], '');
      expect(body['branches'], [
        {'name': 'Main', 'address': 'St 1'},
      ]);
    });

    testWidgets('multi-branch dealers never overwrite their managed branches from here', (tester) async {
      final repo = FakeRepo(account(DealerKind.multiBranch));
      await pump(tester, repo, home: const EditProfileScreen());
      expect(find.byKey(const Key('branches-note')), findsOneWidget);
      expect(find.byKey(const Key('branch-add')), findsNothing);
      await tester.tap(find.byKey(const Key('profile-submit')));
      await tester.pumpAndSettle();
      expect(repo.bodies.single.containsKey('branches'), isFalse);
    });

    testWidgets('buyers are told there is nothing to edit yet', (tester) async {
      final repo = FakeRepo(account(DealerKind.single));
      await pump(tester, repo, home: const EditProfileScreen(), user: buyerUser);
      expect(find.text(ar.buyerProfileNote), findsOneWidget);
      expect(find.byKey(const Key('profile-submit')), findsNothing);
    });
  });

  group('parts form', () {
    testWidgets('creates a part with its compatibility rows', (tester) async {
      final repo = FakeRepo(account(DealerKind.parts));
      await pump(tester, repo, home: const AddPartScreen());
      await tester.tap(find.byKey(const Key('part-submit')));
      await tester.pumpAndSettle();
      expect(repo.calls, isEmpty, reason: 'a name is required');

      await tester.enterText(find.byKey(const Key('part-name')), 'Brake pads');
      await tester.enterText(find.byKey(const Key('part-number')), 'BP-77');
      await tester.enterText(find.byKey(const Key('part-price')), '900');
      await tester.tap(find.byKey(const Key('part-delivery')));
      await tester.tap(find.byKey(const Key('compat-add')));
      await tester.pumpAndSettle();
      final row = find.descendant(of: find.byKey(const Key('compat-0')), matching: find.byType(TextFormField));
      await tester.enterText(row.at(0), 'Toyota');
      await tester.enterText(row.at(1), 'Corolla');
      await tester.enterText(row.at(2), '2015');
      await tester.tap(find.byKey(const Key('part-submit')));
      await tester.pumpAndSettle();

      expect(repo.calls, ['createPart']);
      expect(repo.bodies.single, {
        'name': 'Brake pads',
        'part_number': 'BP-77',
        'manufacturer': '',
        'category': '',
        'part_subtype': 'new_parts',
        'condition_status': 'new',
        'images': <String>[],
        'price': 900,
        'status': 'available',
        'delivery_supported': true,
        'compatibility': [
          {'make': 'Toyota', 'model': 'Corolla', 'yearFrom': 2015, 'yearTo': null},
        ],
      });
    });

    testWidgets('editing saves with PUT to that part', (tester) async {
      final repo = FakeRepo(account(DealerKind.parts));
      await pump(
        tester,
        repo,
        home: const AddPartScreen(part: PartItem(id: 6, name: 'Filter', status: 'unavailable', subtype: 'half_cut')),
      );
      expect(find.text(ar.editPart), findsOneWidget);
      await tester.tap(find.byKey(const Key('part-submit')));
      await tester.pumpAndSettle();
      expect(repo.calls, ['updatePart:6']);
      expect(repo.bodies.single['status'], 'unavailable');
      expect(repo.bodies.single['part_subtype'], 'half_cut');
    });
  });
}
