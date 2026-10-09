// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'dealer.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$DealerImpl _$$DealerImplFromJson(Map<String, dynamic> json) => _$DealerImpl(
  id: (json['id'] as num).toInt(),
  name: json['name'] as String,
  logo: json['logo'] as String,
  description: json['description'] as String?,
  location: json['location'] as String?,
  phone: json['phone'] as String,
  rating: json['rating'] as num,
  branchesCount: (json['branches_count'] as num).toInt(),
  reviewsCount: (json['reviews_count'] as num).toInt(),
  isLuxury: flexibleBool(json['is_luxury']),
  carCount: (json['car_count'] as num?)?.toInt(),
  whatsappNumber: json['whatsapp_number'] as String?,
  address: json['address'] as String?,
  mapLocationLink: json['map_location_link'] as String?,
  latitude: json['latitude'] as num?,
  longitude: json['longitude'] as num?,
  followersCount: (json['followers_count'] as num?)?.toInt(),
  status: json['status'] as String?,
  planType: json['planType'] as String?,
  email: json['email'] as String?,
  businessType: json['business_type'] as String?,
  dealerCategory: json['dealer_category'] as String?,
  deliverySupported: flexibleBoolOrNull(json['delivery_supported']),
);

Map<String, dynamic> _$$DealerImplToJson(_$DealerImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'logo': instance.logo,
      'description': instance.description,
      'location': instance.location,
      'phone': instance.phone,
      'rating': instance.rating,
      'branches_count': instance.branchesCount,
      'reviews_count': instance.reviewsCount,
      'is_luxury': instance.isLuxury,
      'car_count': instance.carCount,
      'whatsapp_number': instance.whatsappNumber,
      'address': instance.address,
      'map_location_link': instance.mapLocationLink,
      'latitude': instance.latitude,
      'longitude': instance.longitude,
      'followers_count': instance.followersCount,
      'status': instance.status,
      'planType': instance.planType,
      'email': instance.email,
      'business_type': instance.businessType,
      'dealer_category': instance.dealerCategory,
      'delivery_supported': instance.deliverySupported,
    };
