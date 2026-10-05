// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'reel.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$ReelImpl _$$ReelImplFromJson(Map<String, dynamic> json) => _$ReelImpl(
  id: (json['id'] as num).toInt(),
  dealerId: (json['dealer_id'] as num).toInt(),
  videoUrl: json['video_url'] as String,
  caption: json['caption'] as String,
  views: json['views'] as num? ?? 0,
  likes: json['likes'] as num? ?? 0,
);

Map<String, dynamic> _$$ReelImplToJson(_$ReelImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'dealer_id': instance.dealerId,
      'video_url': instance.videoUrl,
      'caption': instance.caption,
      'views': instance.views,
      'likes': instance.likes,
    };
