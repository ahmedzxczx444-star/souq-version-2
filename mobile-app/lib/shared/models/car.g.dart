// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'car.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$CarImpl _$$CarImplFromJson(Map<String, dynamic> json) => _$CarImpl(
  id: (json['id'] as num).toInt(),
  dealerId: (json['dealer_id'] as num).toInt(),
  make: json['make'] as String,
  model: json['model'] as String,
  year: (json['year'] as num).toInt(),
  price: json['price'] as num,
  mileage: json['mileage'] as num,
  fuelType: json['fuel_type'] as String,
  transmission: json['transmission'] as String,
  description: json['description'] as String,
  images: (json['images'] as List<dynamic>).map((e) => e as String).toList(),
  location: json['location'] as String,
  status: json['status'] as String,
  views: json['views'] as num? ?? 0,
  favoritesCount: (json['favorites_count'] as num?)?.toInt(),
  featured: json['featured'] as bool? ?? false,
  isPromoted: json['isPromoted'] as bool? ?? false,
  promotionExpires: json['promotion_expires'] as String?,
  dealerPlanType: json['dealer_plan_type'] as String?,
  createdAt: json['createdAt'] as String?,
  dealerName: json['dealer_name'] as String?,
  dealerLogo: json['dealer_logo'] as String?,
  dealerLocation: json['dealer_location'] as String?,
  dealerPhone: json['dealer_phone'] as String?,
  dealerWhatsapp: json['dealer_whatsapp'] as String?,
  dealerUserId: (json['dealer_user_id'] as num?)?.toInt(),
  dealerRating: json['dealer_rating'] as num?,
);

Map<String, dynamic> _$$CarImplToJson(_$CarImpl instance) => <String, dynamic>{
  'id': instance.id,
  'dealer_id': instance.dealerId,
  'make': instance.make,
  'model': instance.model,
  'year': instance.year,
  'price': instance.price,
  'mileage': instance.mileage,
  'fuel_type': instance.fuelType,
  'transmission': instance.transmission,
  'description': instance.description,
  'images': instance.images,
  'location': instance.location,
  'status': instance.status,
  'views': instance.views,
  'favorites_count': instance.favoritesCount,
  'featured': instance.featured,
  'isPromoted': instance.isPromoted,
  'promotion_expires': instance.promotionExpires,
  'dealer_plan_type': instance.dealerPlanType,
  'createdAt': instance.createdAt,
  'dealer_name': instance.dealerName,
  'dealer_logo': instance.dealerLogo,
  'dealer_location': instance.dealerLocation,
  'dealer_phone': instance.dealerPhone,
  'dealer_whatsapp': instance.dealerWhatsapp,
  'dealer_user_id': instance.dealerUserId,
  'dealer_rating': instance.dealerRating,
};
