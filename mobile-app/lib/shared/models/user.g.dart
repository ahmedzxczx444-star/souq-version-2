// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'user.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$UserImpl _$$UserImplFromJson(Map<String, dynamic> json) => _$UserImpl(
  id: (json['id'] as num).toInt(),
  email: json['email'] as String,
  name: json['name'] as String,
  role: json['role'] as String?,
  dealerId: (json['dealerId'] as num?)?.toInt(),
  planType: json['planType'] as String?,
  isVerified: json['is_verified'] as bool?,
);

Map<String, dynamic> _$$UserImplToJson(_$UserImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'email': instance.email,
      'name': instance.name,
      'role': instance.role,
      'dealerId': instance.dealerId,
      'planType': instance.planType,
      'is_verified': instance.isVerified,
    };
