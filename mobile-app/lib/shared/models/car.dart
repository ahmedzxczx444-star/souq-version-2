import 'package:freezed_annotation/freezed_annotation.dart';

import '../../core/network/api_endpoints.dart';
import 'json_converters.dart';

part 'car.freezed.dart';
part 'car.g.dart';

/// Mirrors src/types.ts `Car`. Most fields pass through DB columns
/// unchanged (snake_case), but `createdAt`/`isPromoted` are camelCase DB
/// columns (see server.ts `cars.createdAt` in the schema/ORDER BY clauses)
/// — kept as explicit @JsonKey names rather than a blanket case converter
/// so this stays correct if the mix ever changes.
@freezed
class Car with _$Car {
  const factory Car({
    required int id,
    @JsonKey(name: 'dealer_id') required int dealerId,
    required String make,
    required String model,
    required int year,
    required num price,
    required num mileage,
    @JsonKey(name: 'fuel_type') required String fuelType,
    required String transmission,
    required String description,
    required List<String> images,
    required String location,
    required String status,
    @Default(0) num views,
    @JsonKey(name: 'favorites_count') int? favoritesCount,
    @JsonKey(fromJson: flexibleBool) @Default(false) bool featured,
    @JsonKey(name: 'isPromoted', fromJson: flexibleBool) @Default(false) bool isPromoted,
    @JsonKey(name: 'promotion_expires') String? promotionExpires,
    @JsonKey(name: 'dealer_plan_type') String? dealerPlanType,
    @JsonKey(name: 'createdAt') String? createdAt,
    @JsonKey(name: 'dealer_name') String? dealerName,
    @JsonKey(name: 'dealer_logo') String? dealerLogo,
    @JsonKey(name: 'dealer_location') String? dealerLocation,
    @JsonKey(name: 'dealer_phone') String? dealerPhone,
    @JsonKey(name: 'dealer_whatsapp') String? dealerWhatsapp,
    @JsonKey(name: 'dealer_user_id') int? dealerUserId,
    @JsonKey(name: 'dealer_rating') num? dealerRating,
  }) = _Car;

  factory Car.fromJson(Map<String, dynamic> json) => _$CarFromJson(json);
}

extension CarDisplayX on Car {
  String get title => '$make $model';
  /// [images] with server-relative paths (car photos uploaded through
  /// POST /api/cars/upload are stored as `/uploads/cars/...`) made absolute.
  List<String> get imageUrls => images.map(ApiConfig.resolveUrl).toList();
  String get coverImage => images.isNotEmpty ? ApiConfig.resolveUrl(images.first) : '';
  String get effectiveLocation => location.isNotEmpty ? location : (dealerLocation ?? '');

  /// [dealerLogo] in a format Flutter's image codecs can decode. The backend's
  /// default logos are DiceBear SVG avatars (server.ts), which a browser
  /// renders natively but `Image` cannot ("Invalid image data"); DiceBear
  /// serves the identical avatar as PNG from the sibling `/png` endpoint.
  String? get dealerLogoImage {
    final logo = dealerLogo;
    if (logo == null || logo.isEmpty) return null;
    final uri = Uri.tryParse(logo);
    if (uri != null && uri.host == 'api.dicebear.com' && uri.path.endsWith('/svg')) {
      return uri.replace(path: '${uri.path.substring(0, uri.path.length - 3)}png').toString();
    }
    return ApiConfig.resolveUrl(logo);
  }
}

/// Sent with car photo requests. Image CDNs that negotiate format (the seed
/// photos use Unsplash `auto=format`) fall back to the original file when no
/// Accept header is sent — a ~3 MB PNG per photo instead of a ~0.5 MB WebP.
const carImageHeaders = {'Accept': 'image/webp,image/png,image/jpeg,*/*;q=0.8'};
