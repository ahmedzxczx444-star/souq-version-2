// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'reel.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
  'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models',
);

Reel _$ReelFromJson(Map<String, dynamic> json) {
  return _Reel.fromJson(json);
}

/// @nodoc
mixin _$Reel {
  int get id => throw _privateConstructorUsedError;
  @JsonKey(name: 'dealer_id')
  int get dealerId => throw _privateConstructorUsedError;
  @JsonKey(name: 'video_url')
  String get videoUrl => throw _privateConstructorUsedError;
  String get caption => throw _privateConstructorUsedError;
  num get views => throw _privateConstructorUsedError;
  num get likes => throw _privateConstructorUsedError;

  /// Serializes this Reel to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of Reel
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $ReelCopyWith<Reel> get copyWith => throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $ReelCopyWith<$Res> {
  factory $ReelCopyWith(Reel value, $Res Function(Reel) then) =
      _$ReelCopyWithImpl<$Res, Reel>;
  @useResult
  $Res call({
    int id,
    @JsonKey(name: 'dealer_id') int dealerId,
    @JsonKey(name: 'video_url') String videoUrl,
    String caption,
    num views,
    num likes,
  });
}

/// @nodoc
class _$ReelCopyWithImpl<$Res, $Val extends Reel>
    implements $ReelCopyWith<$Res> {
  _$ReelCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of Reel
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? dealerId = null,
    Object? videoUrl = null,
    Object? caption = null,
    Object? views = null,
    Object? likes = null,
  }) {
    return _then(
      _value.copyWith(
            id: null == id
                ? _value.id
                : id // ignore: cast_nullable_to_non_nullable
                      as int,
            dealerId: null == dealerId
                ? _value.dealerId
                : dealerId // ignore: cast_nullable_to_non_nullable
                      as int,
            videoUrl: null == videoUrl
                ? _value.videoUrl
                : videoUrl // ignore: cast_nullable_to_non_nullable
                      as String,
            caption: null == caption
                ? _value.caption
                : caption // ignore: cast_nullable_to_non_nullable
                      as String,
            views: null == views
                ? _value.views
                : views // ignore: cast_nullable_to_non_nullable
                      as num,
            likes: null == likes
                ? _value.likes
                : likes // ignore: cast_nullable_to_non_nullable
                      as num,
          )
          as $Val,
    );
  }
}

/// @nodoc
abstract class _$$ReelImplCopyWith<$Res> implements $ReelCopyWith<$Res> {
  factory _$$ReelImplCopyWith(
    _$ReelImpl value,
    $Res Function(_$ReelImpl) then,
  ) = __$$ReelImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({
    int id,
    @JsonKey(name: 'dealer_id') int dealerId,
    @JsonKey(name: 'video_url') String videoUrl,
    String caption,
    num views,
    num likes,
  });
}

/// @nodoc
class __$$ReelImplCopyWithImpl<$Res>
    extends _$ReelCopyWithImpl<$Res, _$ReelImpl>
    implements _$$ReelImplCopyWith<$Res> {
  __$$ReelImplCopyWithImpl(_$ReelImpl _value, $Res Function(_$ReelImpl) _then)
    : super(_value, _then);

  /// Create a copy of Reel
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? dealerId = null,
    Object? videoUrl = null,
    Object? caption = null,
    Object? views = null,
    Object? likes = null,
  }) {
    return _then(
      _$ReelImpl(
        id: null == id
            ? _value.id
            : id // ignore: cast_nullable_to_non_nullable
                  as int,
        dealerId: null == dealerId
            ? _value.dealerId
            : dealerId // ignore: cast_nullable_to_non_nullable
                  as int,
        videoUrl: null == videoUrl
            ? _value.videoUrl
            : videoUrl // ignore: cast_nullable_to_non_nullable
                  as String,
        caption: null == caption
            ? _value.caption
            : caption // ignore: cast_nullable_to_non_nullable
                  as String,
        views: null == views
            ? _value.views
            : views // ignore: cast_nullable_to_non_nullable
                  as num,
        likes: null == likes
            ? _value.likes
            : likes // ignore: cast_nullable_to_non_nullable
                  as num,
      ),
    );
  }
}

/// @nodoc
@JsonSerializable()
class _$ReelImpl implements _Reel {
  const _$ReelImpl({
    required this.id,
    @JsonKey(name: 'dealer_id') required this.dealerId,
    @JsonKey(name: 'video_url') required this.videoUrl,
    required this.caption,
    this.views = 0,
    this.likes = 0,
  });

  factory _$ReelImpl.fromJson(Map<String, dynamic> json) =>
      _$$ReelImplFromJson(json);

  @override
  final int id;
  @override
  @JsonKey(name: 'dealer_id')
  final int dealerId;
  @override
  @JsonKey(name: 'video_url')
  final String videoUrl;
  @override
  final String caption;
  @override
  @JsonKey()
  final num views;
  @override
  @JsonKey()
  final num likes;

  @override
  String toString() {
    return 'Reel(id: $id, dealerId: $dealerId, videoUrl: $videoUrl, caption: $caption, views: $views, likes: $likes)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$ReelImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.dealerId, dealerId) ||
                other.dealerId == dealerId) &&
            (identical(other.videoUrl, videoUrl) ||
                other.videoUrl == videoUrl) &&
            (identical(other.caption, caption) || other.caption == caption) &&
            (identical(other.views, views) || other.views == views) &&
            (identical(other.likes, likes) || other.likes == likes));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode =>
      Object.hash(runtimeType, id, dealerId, videoUrl, caption, views, likes);

  /// Create a copy of Reel
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$ReelImplCopyWith<_$ReelImpl> get copyWith =>
      __$$ReelImplCopyWithImpl<_$ReelImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$ReelImplToJson(this);
  }
}

abstract class _Reel implements Reel {
  const factory _Reel({
    required final int id,
    @JsonKey(name: 'dealer_id') required final int dealerId,
    @JsonKey(name: 'video_url') required final String videoUrl,
    required final String caption,
    final num views,
    final num likes,
  }) = _$ReelImpl;

  factory _Reel.fromJson(Map<String, dynamic> json) = _$ReelImpl.fromJson;

  @override
  int get id;
  @override
  @JsonKey(name: 'dealer_id')
  int get dealerId;
  @override
  @JsonKey(name: 'video_url')
  String get videoUrl;
  @override
  String get caption;
  @override
  num get views;
  @override
  num get likes;

  /// Create a copy of Reel
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$ReelImplCopyWith<_$ReelImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
