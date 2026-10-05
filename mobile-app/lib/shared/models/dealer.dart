import 'package:freezed_annotation/freezed_annotation.dart';

part 'dealer.freezed.dart';
part 'dealer.g.dart';

/// Mirrors src/types.ts `Dealer`. Full profile fields (branches, coords,
/// subscription window) are included even though the dealer profile screen
/// itself is a Phase 2 placeholder, since GET /api/dealers already returns
/// this whole shape today (used by the home screen's top-dealers strip).
@freezed
class Dealer with _$Dealer {
  const factory Dealer({
    required int id,
    required String name,
    required String logo,
    required String description,
    required String location,
    required String phone,
    required num rating,
    @JsonKey(name: 'branches_count') required int branchesCount,
    @JsonKey(name: 'reviews_count') required int reviewsCount,
    @JsonKey(name: 'is_luxury') required bool isLuxury,
    @JsonKey(name: 'car_count') int? carCount,
    @JsonKey(name: 'whatsapp_number') String? whatsappNumber,
    String? address,
    @JsonKey(name: 'map_location_link') String? mapLocationLink,
    num? latitude,
    num? longitude,
    @JsonKey(name: 'followers_count') int? followersCount,
    String? status,
    @JsonKey(name: 'planType') String? planType,
    String? email,
    @JsonKey(name: 'business_type') String? businessType,
    @JsonKey(name: 'dealer_category') String? dealerCategory,
    @JsonKey(name: 'delivery_supported') bool? deliverySupported,
  }) = _Dealer;

  factory Dealer.fromJson(Map<String, dynamic> json) => _$DealerFromJson(json);
}
