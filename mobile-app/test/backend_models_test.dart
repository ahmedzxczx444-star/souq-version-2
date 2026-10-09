// Parsing tests against the JSON shapes server.ts actually returns. The
// payloads below mirror real responses (values shortened, no personal data):
//  - GET /api/cars and /api/search coerce `featured` to a boolean
//  - GET /api/favorites passes the raw SQLite integer through
//  - GET /api/dealers returns raw dealer rows (`is_luxury`,
//    `delivery_supported` as 0/1; description/location null for dealers
//    created through registration)
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_app/core/network/api_endpoints.dart';
import 'package:mobile_app/shared/models/car.dart';
import 'package:mobile_app/shared/models/dealer.dart';
import 'package:mobile_app/shared/models/json_converters.dart';

/// GET /api/cars item.
Map<String, dynamic> feedCarJson() => {
      'id': 4,
      'dealer_id': 2,
      'make': 'Toyota',
      'model': 'Corolla',
      'year': 2020,
      'price': 780000,
      'mileage': 45000,
      'location': 'Nasr City, Cairo',
      'fuel_type': 'Petrol',
      'transmission': 'Automatic',
      'description': 'Silver, regular maintenance.',
      'images': ['https://images.example.com/photo-1.jpg?w=1200', 'https://images.example.com/photo-2.jpg'],
      'status': 'available',
      'views': 2,
      'featured': false,
      'createdAt': '2026-07-26 00:04:43',
      'is_promoted': 0,
      'promotion_expires': null,
      'branch_id': null,
      'dealer_name': 'Al Nasr Auto',
      'dealer_logo': 'https://api.dicebear.com/7.x/initials/svg?seed=Al%20Nasr%20Auto&backgroundColor=1a4d3e',
      'dealer_location': 'Nasr City, Cairo',
      'dealer_user_id': 3,
      'dealer_rating': 4.4,
      'user_plan': 'free',
      'favorites_count': 0,
    };

/// GET /api/favorites item: `cars.*` + dealer_name, flags as raw integers,
/// none of the feed's other dealer_* columns.
Map<String, dynamic> favoriteCarJson({Object? featured = 1}) => {
      'id': 6,
      'dealer_id': 3,
      'make': 'Rolls-Royce',
      'model': 'Ghost',
      'year': 2023,
      'price': 24500000,
      'mileage': 3000,
      'location': 'Sheikh Zayed, Giza',
      'fuel_type': 'Petrol',
      'transmission': 'Automatic',
      'description': 'Black, starlight roof.',
      'images': ['/uploads/cars/car-1759000000000-123456789.jpg'],
      'status': 'available',
      'views': 0,
      'featured': featured,
      'createdAt': '2026-07-26 00:04:43',
      'is_promoted': 0,
      'promotion_expires': null,
      'branch_id': null,
      'dealer_name': 'Rotana Motors',
    };

/// GET /api/dealers?type=top item for a seeded dealer.
Map<String, dynamic> seededDealerJson() => {
      'id': 3,
      'user_id': 4,
      'name': 'Rotana Motors',
      'logo': 'https://api.dicebear.com/7.x/initials/svg?seed=Rotana%20Motors&backgroundColor=92400e',
      'description': 'Luxury cars.',
      'location': 'Sheikh Zayed, Giza',
      'phone': '+201000000000',
      'whatsapp_number': '+201000000000',
      'address': null,
      'map_location_link': null,
      'rating': 4.9,
      'branches_count': 1,
      'reviews_count': 0,
      'is_luxury': 1,
      'latitude': null,
      'longitude': null,
      'status': 'active',
      'business_type': 'car_dealer',
      'dealer_category': 'single',
      'parts_specialties': null,
      'delivery_supported': 0,
      'car_count': 2,
      'followers_count': 0,
      'avg_rating': null,
      'score': 22.0,
    };

/// Same endpoint for a dealer created through POST /api/auth/register.
Map<String, dynamic> registeredDealerJson() => {
      ...seededDealerJson(),
      'id': 5,
      'description': null,
      'location': null,
      'address': '12 Example St',
      'is_luxury': 0,
    };

void main() {
  group('flexible booleans', () {
    test('integers', () {
      expect(flexibleBool(0), isFalse);
      expect(flexibleBool(1), isTrue);
    });
    test('booleans', () {
      expect(flexibleBool(false), isFalse);
      expect(flexibleBool(true), isTrue);
    });
    test('null is false for plain flags and null for optional ones', () {
      expect(flexibleBool(null), isFalse);
      expect(flexibleBoolOrNull(null), isNull);
    });
    test('unreadable values are rejected rather than guessed', () {
      expect(() => flexibleBool('maybe'), throwsFormatException);
      expect(() => flexibleBool(<String>[]), throwsFormatException);
    });
  });

  group('Car.fromJson', () {
    test('feed item with boolean flags', () {
      final off = Car.fromJson(feedCarJson());
      expect(off.featured, isFalse);
      expect(off.isPromoted, isFalse);

      final on = Car.fromJson({...feedCarJson(), 'featured': true, 'isPromoted': true});
      expect(on.featured, isTrue);
      expect(on.isPromoted, isTrue);
    });

    test('favorites item with integer flags (0 and 1)', () {
      expect(Car.fromJson(favoriteCarJson(featured: 1)).featured, isTrue);
      expect(Car.fromJson(favoriteCarJson(featured: 0)).featured, isFalse);

      final promoted = Car.fromJson({...favoriteCarJson(), 'isPromoted': 1});
      expect(promoted.isPromoted, isTrue);
      expect(Car.fromJson({...favoriteCarJson(), 'isPromoted': 0}).isPromoted, isFalse);
    });

    test('missing or null optional fields keep their existing defaults', () {
      final json = favoriteCarJson()
        ..remove('featured')
        ..remove('views');
      final car = Car.fromJson(json);
      expect(car.featured, isFalse);
      expect(car.isPromoted, isFalse);
      expect(car.views, 0);
      expect(car.favoritesCount, isNull);
      expect(car.promotionExpires, isNull);
      expect(car.dealerLogo, isNull);
      expect(car.dealerLogoImage, isNull);
      expect(car.dealerPhone, isNull);

      expect(Car.fromJson({...favoriteCarJson(), 'featured': null}).featured, isFalse);
    });

    test('the rest of the listing is read unchanged', () {
      final car = Car.fromJson(feedCarJson());
      expect(car.id, 4);
      expect(car.dealerId, 2);
      expect(car.price, 780000);
      expect(car.status, 'available');
      expect(car.images, hasLength(2));
      expect(car.dealerName, 'Al Nasr Auto');
    });
  });

  group('Dealer.fromJson', () {
    test('integer flags', () {
      final dealer = Dealer.fromJson(seededDealerJson());
      expect(dealer.isLuxury, isTrue);
      expect(dealer.deliverySupported, isFalse);
      expect(Dealer.fromJson({...seededDealerJson(), 'is_luxury': 0, 'delivery_supported': 1}).isLuxury, isFalse);
      expect(Dealer.fromJson({...seededDealerJson(), 'delivery_supported': 1}).deliverySupported, isTrue);
    });

    test('boolean flags', () {
      final dealer = Dealer.fromJson({...seededDealerJson(), 'is_luxury': true, 'delivery_supported': false});
      expect(dealer.isLuxury, isTrue);
      expect(dealer.deliverySupported, isFalse);
      expect(Dealer.fromJson({...seededDealerJson(), 'is_luxury': false}).isLuxury, isFalse);
    });

    test('null description and location stay null', () {
      final dealer = Dealer.fromJson(registeredDealerJson());
      expect(dealer.description, isNull);
      expect(dealer.location, isNull);
      expect(dealer.name, 'Rotana Motors');
      expect(dealer.address, '12 Example St');
    });

    test('present description and location are kept', () {
      final dealer = Dealer.fromJson(seededDealerJson());
      expect(dealer.description, 'Luxury cars.');
      expect(dealer.location, 'Sheikh Zayed, Giza');
    });

    test('missing optional fields', () {
      final json = seededDealerJson()
        ..remove('delivery_supported')
        ..remove('car_count')
        ..remove('followers_count')
        ..remove('whatsapp_number');
      final dealer = Dealer.fromJson(json);
      expect(dealer.deliverySupported, isNull);
      expect(dealer.carCount, isNull);
      expect(dealer.followersCount, isNull);
      expect(dealer.whatsappNumber, isNull);
    });
  });

  group('ApiConfig.resolveUrl', () {
    const base = 'http://127.0.0.1:3000';

    test('relative paths are resolved against the API base URL', () {
      expect(ApiConfig.resolveUrl('/uploads/cars/a.jpg', base: base), 'http://127.0.0.1:3000/uploads/cars/a.jpg');
      expect(ApiConfig.resolveUrl('/uploads/cars/a.jpg'), '${ApiConfig.baseUrl}/uploads/cars/a.jpg');
    });

    test('a trailing slash or a path on the base does not duplicate segments', () {
      expect(ApiConfig.resolveUrl('/uploads/a.jpg', base: 'http://host:3000/'), 'http://host:3000/uploads/a.jpg');
      expect(ApiConfig.resolveUrl('/uploads/a.jpg', base: 'https://api.example.com'), 'https://api.example.com/uploads/a.jpg');
    });

    test('absolute http and https URLs are unchanged', () {
      const https = 'https://images.example.com/photo-1.jpg?q=80&w=1200&auto=format&fit=crop';
      const http = 'http://cdn.example.com/a.png';
      expect(ApiConfig.resolveUrl(https, base: base), https);
      expect(ApiConfig.resolveUrl(http, base: base), http);
    });

    test('other forms are left alone', () {
      expect(ApiConfig.resolveUrl('', base: base), '');
      expect(ApiConfig.resolveUrl('//cdn.example.com/a.png', base: base), '//cdn.example.com/a.png');
      expect(ApiConfig.resolveUrl('data:image/png;base64,AAAA', base: base), 'data:image/png;base64,AAAA');
    });
  });

  group('Car image URLs', () {
    test('uploaded (relative) photos become absolute', () {
      final car = Car.fromJson(favoriteCarJson());
      expect(car.coverImage, '${ApiConfig.baseUrl}/uploads/cars/car-1759000000000-123456789.jpg');
      expect(car.imageUrls, [car.coverImage]);
      expect(car.images.single, startsWith('/uploads/'), reason: 'the stored value itself is not rewritten');
    });

    test('absolute photos are unchanged', () {
      final car = Car.fromJson(feedCarJson());
      expect(car.coverImage, 'https://images.example.com/photo-1.jpg?w=1200');
      expect(car.imageUrls, car.images);
    });

    test('no photos gives an empty cover', () {
      final car = Car.fromJson({...feedCarJson(), 'images': <String>[]});
      expect(car.coverImage, '');
      expect(car.imageUrls, isEmpty);
    });

    test('dealer logo: DiceBear SVG still maps to PNG, relative logos are resolved', () {
      expect(
        Car.fromJson(feedCarJson()).dealerLogoImage,
        'https://api.dicebear.com/7.x/initials/png?seed=Al%20Nasr%20Auto&backgroundColor=1a4d3e',
      );
      final uploaded = Car.fromJson({...feedCarJson(), 'dealer_logo': '/uploads/logos/x.png'});
      expect(uploaded.dealerLogoImage, '${ApiConfig.baseUrl}/uploads/logos/x.png');
    });
  });
}
