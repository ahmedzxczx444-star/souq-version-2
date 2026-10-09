import 'car.dart';
import 'dealer.dart';
import 'json_converters.dart';

/// One row of `dealer_branches`, as embedded in GET /api/dealers/:id.
class DealerBranch {
  const DealerBranch({this.name, this.address, this.phone, this.mapLink});

  final String? name;
  final String? address;
  final String? phone;
  final String? mapLink;

  factory DealerBranch.fromJson(Map<String, dynamic> json) => DealerBranch(
        name: json['name'] as String?,
        address: json['address'] as String?,
        phone: json['phone'] as String?,
        mapLink: json['map_link'] as String?,
      );
}

/// GET /api/dealers/:id — the dealer row plus its `cars` and `branches`,
/// mirroring the `Dealer & { cars, branches }` shape DealerScreen.tsx reads.
class DealerProfile {
  const DealerProfile({required this.dealer, required this.cars, required this.branches});

  final Dealer dealer;
  final List<Car> cars;
  final List<DealerBranch> branches;

  factory DealerProfile.fromJson(Map<String, dynamic> json) => DealerProfile(
        dealer: Dealer.fromJson(json),
        cars: ((json['cars'] as List?) ?? const [])
            .map((e) => Car.fromJson(e as Map<String, dynamic>))
            .toList(),
        branches: ((json['branches'] as List?) ?? const [])
            .map((e) => DealerBranch.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}

/// A GET /api/reels row: the reel plus the joined dealer name/logo and the
/// linked car's make/model. Used by the Reels tab and by the dealer page
/// (whose inventory grid mixes the dealer's reels in with the cars).
/// Everything but the id is optional — reels created alongside a car have
/// no caption of their own, and `car_id` may be null.
class DealerReel {
  const DealerReel({
    required this.id,
    required this.dealerId,
    this.carId,
    this.videoUrl,
    this.caption,
    this.createdAt,
    this.views = 0,
    this.likes = 0,
    this.isLiked = false,
    this.dealerName,
    this.dealerLogo,
    this.make,
    this.model,
  });

  final int id;
  final int? dealerId;
  final int? carId;
  final String? videoUrl;
  final String? caption;
  final String? createdAt;
  final int views;
  final int likes;

  /// `is_liked` is a 0/1 count for the signed-in user (0 when signed out).
  final bool isLiked;
  final String? dealerName;
  final String? dealerLogo;
  final String? make;
  final String? model;

  factory DealerReel.fromJson(Map<String, dynamic> json) => DealerReel(
        id: (json['id'] as num).toInt(),
        dealerId: (json['dealer_id'] as num?)?.toInt(),
        carId: (json['car_id'] as num?)?.toInt(),
        videoUrl: json['video_url'] as String?,
        caption: json['caption'] as String?,
        createdAt: json['created_at'] as String?,
        views: (json['views'] as num?)?.toInt() ?? 0,
        likes: (json['likes'] as num?)?.toInt() ?? 0,
        isLiked: flexibleBool(json['is_liked']),
        dealerName: json['dealer_name'] as String?,
        dealerLogo: json['dealer_logo'] as String?,
        make: json['make'] as String?,
        model: json['model'] as String?,
      );
}

/// One tile of the dealer page's inventory grid.
class DealerGridItem {
  const DealerGridItem.car(Car this.car, this.timestamp) : reel = null;
  const DealerGridItem.reel(DealerReel this.reel, this.timestamp) : car = null;

  final Car? car;
  final DealerReel? reel;
  final int timestamp;
}

/// Same merge as DealerScreen.tsx's `gridItems`: the dealer's cars and reels
/// together, newest first; an unparseable or missing date sorts last (the
/// site's `new Date(x || 0)`).
List<DealerGridItem> buildDealerGrid(List<Car> cars, List<DealerReel> reels) {
  int stamp(String? value) {
    if (value == null || value.isEmpty) return 0;
    // SQLite's CURRENT_TIMESTAMP format is "YYYY-MM-DD HH:MM:SS".
    return DateTime.tryParse(value.replaceFirst(' ', 'T'))?.millisecondsSinceEpoch ?? 0;
  }

  final items = [
    for (final car in cars) DealerGridItem.car(car, stamp(car.createdAt)),
    for (final reel in reels) DealerGridItem.reel(reel, stamp(reel.createdAt)),
  ];
  // List.sort is not stable; mergeSort-like stability is kept by index.
  final indexed = items.asMap().entries.toList()
    ..sort((a, b) {
      final byTime = b.value.timestamp.compareTo(a.value.timestamp);
      return byTime != 0 ? byTime : a.key.compareTo(b.key);
    });
  return [for (final e in indexed) e.value];
}

/// HomeScreen.tsx / FeaturedCarsScreen.tsx:
/// `car.featured || (car.views + (car.favorites_count || 0)) > 50`.
bool isFeaturedCar(Car car) => car.featured || (car.views + (car.favoritesCount ?? 0)) > 50;
