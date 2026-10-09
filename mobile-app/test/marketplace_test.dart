// Buyer-marketplace data tests: dealer profile parsing, the website's
// "featured" rule and inventory ordering, logo URL handling, and the dealer
// repository's requests. Payloads mirror server.ts response shapes.
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_app/core/l10n/app_strings.dart';
import 'package:mobile_app/core/network/api_client.dart';
import 'package:mobile_app/core/network/api_endpoints.dart';
import 'package:mobile_app/core/network/image_urls.dart';
import 'package:mobile_app/features/dealers/data/dealer_repository.dart';
import 'package:mobile_app/shared/models/car.dart';
import 'package:mobile_app/shared/models/dealer_profile.dart';

/// A `cars.*` row as embedded in GET /api/dealers/:id (raw integer flags,
/// no dealer_* columns).
Map<String, dynamic> dealerCarJson(int id, {String? createdAt, Object featured = 0, num views = 0}) => {
      'id': id,
      'dealer_id': 3,
      'make': 'Bentley',
      'model': 'Continental GT',
      'year': 2022,
      'price': 18200000,
      'mileage': 8000,
      'location': 'Sheikh Zayed, Giza',
      'fuel_type': 'Petrol',
      'transmission': 'Automatic',
      'description': 'Grey.',
      'images': ['https://images.example.com/c$id.jpg'],
      'status': 'available',
      'views': views,
      'featured': featured,
      'createdAt': createdAt,
      'is_promoted': 0,
      'promotion_expires': null,
      'branch_id': null,
    };

/// GET /api/dealers/:id.
Map<String, dynamic> dealerProfileJson() => {
      'id': 3,
      'user_id': 4,
      'name': 'Rotana Motors',
      'logo': 'https://api.dicebear.com/7.x/initials/svg?seed=Rotana%20Motors&backgroundColor=92400e',
      'description': null,
      'location': null,
      'phone': '+201000000000',
      'whatsapp_number': '+201000000000',
      'address': '12 Example St',
      'map_location_link': null,
      'rating': 4.9,
      'branches_count': 2,
      'reviews_count': 0,
      'is_luxury': 1,
      'latitude': null,
      'longitude': null,
      'status': 'active',
      'business_type': 'car_dealer',
      'dealer_category': 'single',
      'parts_specialties': null,
      'delivery_supported': 0,
      'avg_rating': null,
      'reviews_count_new': 0,
      'followers_count': 7,
      'cars': [
        dealerCarJson(6, createdAt: '2026-07-26 00:04:43', featured: 1),
        dealerCarJson(7, createdAt: '2026-08-01 10:00:00'),
      ],
      'branches': [
        {'id': 1, 'dealer_id': 3, 'name': 'Main branch', 'address': 'Giza', 'map_link': null, 'phone': '+201111111111'},
        {'id': 2, 'dealer_id': 3, 'name': null, 'address': null, 'map_link': 'https://maps.example.com/x', 'phone': null},
      ],
    };

/// GET /api/reels rows.
List<Map<String, dynamic>> reelsJson() => [
      {
        'id': 1,
        'car_id': 6,
        'dealer_id': 3,
        'video_url': 'https://videos.example.com/a.mp4',
        'caption': 'Ghost',
        'views': 0,
        'created_at': '2026-07-30 12:00:00',
        'dealer_name': 'Rotana Motors',
        'is_liked': 0,
      },
      {
        'id': 2,
        'car_id': 1,
        'dealer_id': 1,
        'video_url': 'https://videos.example.com/b.mp4',
        'caption': null,
        'views': 3,
        'created_at': '2026-07-29 12:00:00',
        'dealer_name': 'United Motors',
        'is_liked': 0,
      },
    ];

class _FakeClient implements ApiClient {
  _FakeClient(this.responses);

  final Map<String, Object?> responses;
  final calls = <String>[];

  Response<dynamic> _respond(String method, String path, [Object? detail]) {
    calls.add('$method $path${detail == null ? '' : ' $detail'}');
    return Response(data: responses[path], requestOptions: RequestOptions(path: path), statusCode: 200);
  }

  @override
  Future<Response<dynamic>> get(String path, {Map<String, dynamic>? query}) async => _respond('GET', path, query);

  @override
  Future<Response<dynamic>> post(String path, {Object? data}) async => _respond('POST', path, data);

  @override
  Future<Response<dynamic>> put(String path, {Object? data}) async => _respond('PUT', path, data);

  @override
  Future<Response<dynamic>> delete(String path) async => _respond('DELETE', path);
}

void main() {
  group('DealerProfile.fromJson', () {
    test('reads the dealer, its cars and its branches', () {
      final profile = DealerProfile.fromJson(dealerProfileJson());
      expect(profile.dealer.name, 'Rotana Motors');
      expect(profile.dealer.isLuxury, isTrue);
      expect(profile.dealer.description, isNull);
      expect(profile.dealer.followersCount, 7);
      expect(profile.cars.map((c) => c.id), [6, 7]);
      expect(profile.cars.first.featured, isTrue, reason: 'embedded cars carry raw 0/1 flags');
      expect(profile.branches, hasLength(2));
      expect(profile.branches.first.name, 'Main branch');
      expect(profile.branches.first.phone, '+201111111111');
      expect(profile.branches.last.name, isNull);
      expect(profile.branches.last.mapLink, 'https://maps.example.com/x');
    });

    test('tolerates a dealer with no cars or branches keys', () {
      final json = dealerProfileJson()
        ..remove('cars')
        ..remove('branches');
      final profile = DealerProfile.fromJson(json);
      expect(profile.cars, isEmpty);
      expect(profile.branches, isEmpty);
    });
  });

  group('inventory grid (DealerScreen.tsx gridItems)', () {
    test('cars and reels are merged newest first', () {
      final profile = DealerProfile.fromJson(dealerProfileJson());
      final reels = reelsJson().map(DealerReel.fromJson).where((r) => r.dealerId == 3).toList();
      final grid = buildDealerGrid(profile.cars, reels);
      expect(
        grid.map((i) => i.car != null ? 'car${i.car!.id}' : 'reel${i.reel!.id}'),
        ['car7', 'reel1', 'car6'],
      );
    });

    test('items without a date sort last and keep their order', () {
      final cars = [
        Car.fromJson(dealerCarJson(1)),
        Car.fromJson(dealerCarJson(2, createdAt: '2026-01-01 00:00:00')),
        Car.fromJson(dealerCarJson(3)),
      ];
      expect(buildDealerGrid(cars, const []).map((i) => i.car!.id), [2, 1, 3]);
    });
  });

  group('featured rule (featured || views + favorites_count > 50)', () {
    test('flagged cars are featured', () {
      expect(isFeaturedCar(Car.fromJson(dealerCarJson(1, featured: 1))), isTrue);
      expect(isFeaturedCar(Car.fromJson(dealerCarJson(1, featured: true))), isTrue);
    });

    test('popular cars are featured only above 50', () {
      expect(isFeaturedCar(Car.fromJson(dealerCarJson(1, views: 50))), isFalse);
      expect(isFeaturedCar(Car.fromJson(dealerCarJson(1, views: 51))), isTrue);
      expect(isFeaturedCar(Car.fromJson({...dealerCarJson(1, views: 40), 'favorites_count': 11})), isTrue);
      expect(isFeaturedCar(Car.fromJson(dealerCarJson(1))), isFalse);
    });
  });

  group('displayImageUrl', () {
    test('DiceBear SVG avatars are requested as PNG', () {
      expect(
        displayImageUrl('https://api.dicebear.com/7.x/initials/svg?seed=Rotana%20Motors&backgroundColor=92400e'),
        'https://api.dicebear.com/7.x/initials/png?seed=Rotana%20Motors&backgroundColor=92400e',
      );
    });

    test('other URLs are kept, relative paths resolved, empty is null', () {
      expect(displayImageUrl('https://cdn.example.com/logo.png'), 'https://cdn.example.com/logo.png');
      expect(displayImageUrl('/uploads/logos/x.png'), '${ApiConfig.baseUrl}/uploads/logos/x.png');
      expect(displayImageUrl(''), isNull);
      expect(displayImageUrl(null), isNull);
    });
  });

  group('DealerRepository', () {
    test('getTop asks for type=top; getAll sends no filter', () async {
      final client = _FakeClient({
        '/api/dealers': [dealerProfileJson()],
      });
      final repo = DealerRepository(client);
      final top = await repo.getTop();
      final all = await repo.getAll();
      expect(top.single.name, 'Rotana Motors');
      expect(all.single.id, 3);
      expect(client.calls, ['GET /api/dealers {type: top}', 'GET /api/dealers']);
    });

    test('getProfile and getReels (only this dealer\'s reels)', () async {
      final client = _FakeClient({
        '/api/dealers/3': dealerProfileJson(),
        '/api/reels': reelsJson(),
      });
      final repo = DealerRepository(client);
      expect((await repo.getProfile(3)).cars, hasLength(2));
      final reels = await repo.getReels(3);
      expect(reels.map((r) => r.id), [1]);
      expect(reels.single.caption, 'Ghost');
    });

    test('follow status, follow toggle and rating hit the site\'s endpoints', () async {
      final client = _FakeClient({
        '/api/dealers/3/follow-status': {'followed': false},
        '/api/dealers/3/follow': {'followed': true},
        '/api/dealers/3/rate': {'success': true},
      });
      final repo = DealerRepository(client);
      expect(await repo.getFollowStatus(3), isFalse);
      expect(await repo.toggleFollow(3), isTrue);
      await repo.rate(3, 4);
      expect(client.calls, [
        'GET /api/dealers/3/follow-status',
        'POST /api/dealers/3/follow',
        'POST /api/dealers/3/rate {rating: 4}',
      ]);
    });
  });

  group('marketplace copy matches translations.ts', () {
    test('Arabic and English', () {
      expect(AppStrings.ar.topDealers, 'أفضل المعارض');
      expect(AppStrings.ar.featuredCars, 'سيارات مميزة');
      expect(AppStrings.ar.viewAll, 'عرض الكل');
      expect(AppStrings.ar.carsCount, 'سيارة');
      expect(AppStrings.en.topDealers, 'Top Dealers');
      expect(AppStrings.en.findDreamRide, 'Find your dream ride today');
      expect(AppStrings.en.inventory, 'Inventory');
    });
  });
}
