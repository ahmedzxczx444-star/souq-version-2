import 'package:freezed_annotation/freezed_annotation.dart';

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
    @Default(false) bool featured,
    @JsonKey(name: 'isPromoted') @Default(false) bool isPromoted,
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
  String get coverImage => images.isNotEmpty ? images.first : '';
  String get effectiveLocation => location.isNotEmpty ? location : (dealerLocation ?? '');
}
