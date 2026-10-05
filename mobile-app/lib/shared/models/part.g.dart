// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'part.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$PartImpl _$$PartImplFromJson(Map<String, dynamic> json) => _$PartImpl(
  id: (json['id'] as num).toInt(),
  dealerId: (json['dealer_id'] as num).toInt(),
  name: json['name'] as String,
  images: (json['images'] as List<dynamic>).map((e) => e as String).toList(),
  price: json['price'] as num?,
  status: json['status'] as String,
);

Map<String, dynamic> _$$PartImplToJson(_$PartImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'dealer_id': instance.dealerId,
      'name': instance.name,
      'images': instance.images,
      'price': instance.price,
      'status': instance.status,
    };
