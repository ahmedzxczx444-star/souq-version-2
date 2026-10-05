// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'dealer.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
  'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models',
);

Dealer _$DealerFromJson(Map<String, dynamic> json) {
  return _Dealer.fromJson(json);
}

/// @nodoc
mixin _$Dealer {
  int get id => throw _privateConstructorUsedError;
  String get name => throw _privateConstructorUsedError;
  String get logo => throw _privateConstructorUsedError;
  String get description => throw _privateConstructorUsedError;
  String get location => throw _privateConstructorUsedError;
  String get phone => throw _privateConstructorUsedError;
  num get rating => throw _privateConstructorUsedError;
  @JsonKey(name: 'branches_count')
  int get branchesCount => throw _privateConstructorUsedError;
  @JsonKey(name: 'reviews_count')
  int get reviewsCount => throw _privateConstructorUsedError;
  @JsonKey(name: 'is_luxury')
  bool get isLuxury => throw _privateConstructorUsedError;
  @JsonKey(name: 'car_count')
  int? get carCount => throw _privateConstructorUsedError;
  @JsonKey(name: 'whatsapp_number')
  String? get whatsappNumber => throw _privateConstructorUsedError;
  String? get address => throw _privateConstructorUsedError;
  @JsonKey(name: 'map_location_link')
  String? get mapLocationLink => throw _privateConstructorUsedError;
  num? get latitude => throw _privateConstructorUsedError;
  num? get longitude => throw _privateConstructorUsedError;
  @JsonKey(name: 'followers_count')
  int? get followersCount => throw _privateConstructorUsedError;
  String? get status => throw _privateConstructorUsedError;
  @JsonKey(name: 'planType')
  String? get planType => throw _privateConstructorUsedError;
  String? get email => throw _privateConstructorUsedError;
  @JsonKey(name: 'business_type')
  String? get businessType => throw _privateConstructorUsedError;
  @JsonKey(name: 'dealer_category')
  String? get dealerCategory => throw _privateConstructorUsedError;
  @JsonKey(name: 'delivery_supported')
  bool? get deliverySupported => throw _privateConstructorUsedError;

  /// Serializes this Dealer to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of Dealer
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $DealerCopyWith<Dealer> get copyWith => throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $DealerCopyWith<$Res> {
  factory $DealerCopyWith(Dealer value, $Res Function(Dealer) then) =
      _$DealerCopyWithImpl<$Res, Dealer>;
  @useResult
  $Res call({
    int id,
    String name,
    String logo,
    String description,
    String location,
    String phone,
    num rating,
    @JsonKey(name: 'branches_count') int branchesCount,
    @JsonKey(name: 'reviews_count') int reviewsCount,
    @JsonKey(name: 'is_luxury') bool isLuxury,
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
  });
}

/// @nodoc
class _$DealerCopyWithImpl<$Res, $Val extends Dealer>
    implements $DealerCopyWith<$Res> {
  _$DealerCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of Dealer
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? name = null,
    Object? logo = null,
    Object? description = null,
    Object? location = null,
    Object? phone = null,
    Object? rating = null,
    Object? branchesCount = null,
    Object? reviewsCount = null,
    Object? isLuxury = null,
    Object? carCount = freezed,
    Object? whatsappNumber = freezed,
    Object? address = freezed,
    Object? mapLocationLink = freezed,
    Object? latitude = freezed,
    Object? longitude = freezed,
    Object? followersCount = freezed,
    Object? status = freezed,
    Object? planType = freezed,
    Object? email = freezed,
    Object? businessType = freezed,
    Object? dealerCategory = freezed,
    Object? deliverySupported = freezed,
  }) {
    return _then(
      _value.copyWith(
            id: null == id
                ? _value.id
                : id // ignore: cast_nullable_to_non_nullable
                      as int,
            name: null == name
                ? _value.name
                : name // ignore: cast_nullable_to_non_nullable
                      as String,
            logo: null == logo
                ? _value.logo
                : logo // ignore: cast_nullable_to_non_nullable
                      as String,
            description: null == description
                ? _value.description
                : description // ignore: cast_nullable_to_non_nullable
                      as String,
            location: null == location
                ? _value.location
                : location // ignore: cast_nullable_to_non_nullable
                      as String,
            phone: null == phone
                ? _value.phone
                : phone // ignore: cast_nullable_to_non_nullable
                      as String,
            rating: null == rating
                ? _value.rating
                : rating // ignore: cast_nullable_to_non_nullable
                      as num,
            branchesCount: null == branchesCount
                ? _value.branchesCount
                : branchesCount // ignore: cast_nullable_to_non_nullable
                      as int,
            reviewsCount: null == reviewsCount
                ? _value.reviewsCount
                : reviewsCount // ignore: cast_nullable_to_non_nullable
                      as int,
            isLuxury: null == isLuxury
                ? _value.isLuxury
                : isLuxury // ignore: cast_nullable_to_non_nullable
                      as bool,
            carCount: freezed == carCount
                ? _value.carCount
                : carCount // ignore: cast_nullable_to_non_nullable
                      as int?,
            whatsappNumber: freezed == whatsappNumber
                ? _value.whatsappNumber
                : whatsappNumber // ignore: cast_nullable_to_non_nullable
                      as String?,
            address: freezed == address
                ? _value.address
                : address // ignore: cast_nullable_to_non_nullable
                      as String?,
            mapLocationLink: freezed == mapLocationLink
                ? _value.mapLocationLink
                : mapLocationLink // ignore: cast_nullable_to_non_nullable
                      as String?,
            latitude: freezed == latitude
                ? _value.latitude
                : latitude // ignore: cast_nullable_to_non_nullable
                      as num?,
            longitude: freezed == longitude
                ? _value.longitude
                : longitude // ignore: cast_nullable_to_non_nullable
                      as num?,
            followersCount: freezed == followersCount
                ? _value.followersCount
                : followersCount // ignore: cast_nullable_to_non_nullable
                      as int?,
            status: freezed == status
                ? _value.status
                : status // ignore: cast_nullable_to_non_nullable
                      as String?,
            planType: freezed == planType
                ? _value.planType
                : planType // ignore: cast_nullable_to_non_nullable
                      as String?,
            email: freezed == email
                ? _value.email
                : email // ignore: cast_nullable_to_non_nullable
                      as String?,
            businessType: freezed == businessType
                ? _value.businessType
                : businessType // ignore: cast_nullable_to_non_nullable
                      as String?,
            dealerCategory: freezed == dealerCategory
                ? _value.dealerCategory
                : dealerCategory // ignore: cast_nullable_to_non_nullable
                      as String?,
            deliverySupported: freezed == deliverySupported
                ? _value.deliverySupported
                : deliverySupported // ignore: cast_nullable_to_non_nullable
                      as bool?,
          )
          as $Val,
    );
  }
}

/// @nodoc
abstract class _$$DealerImplCopyWith<$Res> implements $DealerCopyWith<$Res> {
  factory _$$DealerImplCopyWith(
    _$DealerImpl value,
    $Res Function(_$DealerImpl) then,
  ) = __$$DealerImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({
    int id,
    String name,
    String logo,
    String description,
    String location,
    String phone,
    num rating,
    @JsonKey(name: 'branches_count') int branchesCount,
    @JsonKey(name: 'reviews_count') int reviewsCount,
    @JsonKey(name: 'is_luxury') bool isLuxury,
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
  });
}

/// @nodoc
class __$$DealerImplCopyWithImpl<$Res>
    extends _$DealerCopyWithImpl<$Res, _$DealerImpl>
    implements _$$DealerImplCopyWith<$Res> {
  __$$DealerImplCopyWithImpl(
    _$DealerImpl _value,
    $Res Function(_$DealerImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of Dealer
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? name = null,
    Object? logo = null,
    Object? description = null,
    Object? location = null,
    Object? phone = null,
    Object? rating = null,
    Object? branchesCount = null,
    Object? reviewsCount = null,
    Object? isLuxury = null,
    Object? carCount = freezed,
    Object? whatsappNumber = freezed,
    Object? address = freezed,
    Object? mapLocationLink = freezed,
    Object? latitude = freezed,
    Object? longitude = freezed,
    Object? followersCount = freezed,
    Object? status = freezed,
    Object? planType = freezed,
    Object? email = freezed,
    Object? businessType = freezed,
    Object? dealerCategory = freezed,
    Object? deliverySupported = freezed,
  }) {
    return _then(
      _$DealerImpl(
        id: null == id
            ? _value.id
            : id // ignore: cast_nullable_to_non_nullable
                  as int,
        name: null == name
            ? _value.name
            : name // ignore: cast_nullable_to_non_nullable
                  as String,
        logo: null == logo
            ? _value.logo
            : logo // ignore: cast_nullable_to_non_nullable
                  as String,
        description: null == description
            ? _value.description
            : description // ignore: cast_nullable_to_non_nullable
                  as String,
        location: null == location
            ? _value.location
            : location // ignore: cast_nullable_to_non_nullable
                  as String,
        phone: null == phone
            ? _value.phone
            : phone // ignore: cast_nullable_to_non_nullable
                  as String,
        rating: null == rating
            ? _value.rating
            : rating // ignore: cast_nullable_to_non_nullable
                  as num,
        branchesCount: null == branchesCount
            ? _value.branchesCount
            : branchesCount // ignore: cast_nullable_to_non_nullable
                  as int,
        reviewsCount: null == reviewsCount
            ? _value.reviewsCount
            : reviewsCount // ignore: cast_nullable_to_non_nullable
                  as int,
        isLuxury: null == isLuxury
            ? _value.isLuxury
            : isLuxury // ignore: cast_nullable_to_non_nullable
                  as bool,
        carCount: freezed == carCount
            ? _value.carCount
            : carCount // ignore: cast_nullable_to_non_nullable
                  as int?,
        whatsappNumber: freezed == whatsappNumber
            ? _value.whatsappNumber
            : whatsappNumber // ignore: cast_nullable_to_non_nullable
                  as String?,
        address: freezed == address
            ? _value.address
            : address // ignore: cast_nullable_to_non_nullable
                  as String?,
        mapLocationLink: freezed == mapLocationLink
            ? _value.mapLocationLink
            : mapLocationLink // ignore: cast_nullable_to_non_nullable
                  as String?,
        latitude: freezed == latitude
            ? _value.latitude
            : latitude // ignore: cast_nullable_to_non_nullable
                  as num?,
        longitude: freezed == longitude
            ? _value.longitude
            : longitude // ignore: cast_nullable_to_non_nullable
                  as num?,
        followersCount: freezed == followersCount
            ? _value.followersCount
            : followersCount // ignore: cast_nullable_to_non_nullable
                  as int?,
        status: freezed == status
            ? _value.status
            : status // ignore: cast_nullable_to_non_nullable
                  as String?,
        planType: freezed == planType
            ? _value.planType
            : planType // ignore: cast_nullable_to_non_nullable
                  as String?,
        email: freezed == email
            ? _value.email
            : email // ignore: cast_nullable_to_non_nullable
                  as String?,
        businessType: freezed == businessType
            ? _value.businessType
            : businessType // ignore: cast_nullable_to_non_nullable
                  as String?,
        dealerCategory: freezed == dealerCategory
            ? _value.dealerCategory
            : dealerCategory // ignore: cast_nullable_to_non_nullable
                  as String?,
        deliverySupported: freezed == deliverySupported
            ? _value.deliverySupported
            : deliverySupported // ignore: cast_nullable_to_non_nullable
                  as bool?,
      ),
    );
  }
}

/// @nodoc
@JsonSerializable()
class _$DealerImpl implements _Dealer {
  const _$DealerImpl({
    required this.id,
    required this.name,
    required this.logo,
    required this.description,
    required this.location,
    required this.phone,
    required this.rating,
    @JsonKey(name: 'branches_count') required this.branchesCount,
    @JsonKey(name: 'reviews_count') required this.reviewsCount,
    @JsonKey(name: 'is_luxury') required this.isLuxury,
    @JsonKey(name: 'car_count') this.carCount,
    @JsonKey(name: 'whatsapp_number') this.whatsappNumber,
    this.address,
    @JsonKey(name: 'map_location_link') this.mapLocationLink,
    this.latitude,
    this.longitude,
    @JsonKey(name: 'followers_count') this.followersCount,
    this.status,
    @JsonKey(name: 'planType') this.planType,
    this.email,
    @JsonKey(name: 'business_type') this.businessType,
    @JsonKey(name: 'dealer_category') this.dealerCategory,
    @JsonKey(name: 'delivery_supported') this.deliverySupported,
  });

  factory _$DealerImpl.fromJson(Map<String, dynamic> json) =>
      _$$DealerImplFromJson(json);

  @override
  final int id;
  @override
  final String name;
  @override
  final String logo;
  @override
  final String description;
  @override
  final String location;
  @override
  final String phone;
  @override
  final num rating;
  @override
  @JsonKey(name: 'branches_count')
  final int branchesCount;
  @override
  @JsonKey(name: 'reviews_count')
  final int reviewsCount;
  @override
  @JsonKey(name: 'is_luxury')
  final bool isLuxury;
  @override
  @JsonKey(name: 'car_count')
  final int? carCount;
  @override
  @JsonKey(name: 'whatsapp_number')
  final String? whatsappNumber;
  @override
  final String? address;
  @override
  @JsonKey(name: 'map_location_link')
  final String? mapLocationLink;
  @override
  final num? latitude;
  @override
  final num? longitude;
  @override
  @JsonKey(name: 'followers_count')
  final int? followersCount;
  @override
  final String? status;
  @override
  @JsonKey(name: 'planType')
  final String? planType;
  @override
  final String? email;
  @override
  @JsonKey(name: 'business_type')
  final String? businessType;
  @override
  @JsonKey(name: 'dealer_category')
  final String? dealerCategory;
  @override
  @JsonKey(name: 'delivery_supported')
  final bool? deliverySupported;

  @override
  String toString() {
    return 'Dealer(id: $id, name: $name, logo: $logo, description: $description, location: $location, phone: $phone, rating: $rating, branchesCount: $branchesCount, reviewsCount: $reviewsCount, isLuxury: $isLuxury, carCount: $carCount, whatsappNumber: $whatsappNumber, address: $address, mapLocationLink: $mapLocationLink, latitude: $latitude, longitude: $longitude, followersCount: $followersCount, status: $status, planType: $planType, email: $email, businessType: $businessType, dealerCategory: $dealerCategory, deliverySupported: $deliverySupported)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$DealerImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.name, name) || other.name == name) &&
            (identical(other.logo, logo) || other.logo == logo) &&
            (identical(other.description, description) ||
                other.description == description) &&
            (identical(other.location, location) ||
                other.location == location) &&
            (identical(other.phone, phone) || other.phone == phone) &&
            (identical(other.rating, rating) || other.rating == rating) &&
            (identical(other.branchesCount, branchesCount) ||
                other.branchesCount == branchesCount) &&
            (identical(other.reviewsCount, reviewsCount) ||
                other.reviewsCount == reviewsCount) &&
            (identical(other.isLuxury, isLuxury) ||
                other.isLuxury == isLuxury) &&
            (identical(other.carCount, carCount) ||
                other.carCount == carCount) &&
            (identical(other.whatsappNumber, whatsappNumber) ||
                other.whatsappNumber == whatsappNumber) &&
            (identical(other.address, address) || other.address == address) &&
            (identical(other.mapLocationLink, mapLocationLink) ||
                other.mapLocationLink == mapLocationLink) &&
            (identical(other.latitude, latitude) ||
                other.latitude == latitude) &&
            (identical(other.longitude, longitude) ||
                other.longitude == longitude) &&
            (identical(other.followersCount, followersCount) ||
                other.followersCount == followersCount) &&
            (identical(other.status, status) || other.status == status) &&
            (identical(other.planType, planType) ||
                other.planType == planType) &&
            (identical(other.email, email) || other.email == email) &&
            (identical(other.businessType, businessType) ||
                other.businessType == businessType) &&
            (identical(other.dealerCategory, dealerCategory) ||
                other.dealerCategory == dealerCategory) &&
            (identical(other.deliverySupported, deliverySupported) ||
                other.deliverySupported == deliverySupported));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hashAll([
    runtimeType,
    id,
    name,
    logo,
    description,
    location,
    phone,
    rating,
    branchesCount,
    reviewsCount,
    isLuxury,
    carCount,
    whatsappNumber,
    address,
    mapLocationLink,
    latitude,
    longitude,
    followersCount,
    status,
    planType,
    email,
    businessType,
    dealerCategory,
    deliverySupported,
  ]);

  /// Create a copy of Dealer
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$DealerImplCopyWith<_$DealerImpl> get copyWith =>
      __$$DealerImplCopyWithImpl<_$DealerImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$DealerImplToJson(this);
  }
}

abstract class _Dealer implements Dealer {
  const factory _Dealer({
    required final int id,
    required final String name,
    required final String logo,
    required final String description,
    required final String location,
    required final String phone,
    required final num rating,
    @JsonKey(name: 'branches_count') required final int branchesCount,
    @JsonKey(name: 'reviews_count') required final int reviewsCount,
    @JsonKey(name: 'is_luxury') required final bool isLuxury,
    @JsonKey(name: 'car_count') final int? carCount,
    @JsonKey(name: 'whatsapp_number') final String? whatsappNumber,
    final String? address,
    @JsonKey(name: 'map_location_link') final String? mapLocationLink,
    final num? latitude,
    final num? longitude,
    @JsonKey(name: 'followers_count') final int? followersCount,
    final String? status,
    @JsonKey(name: 'planType') final String? planType,
    final String? email,
    @JsonKey(name: 'business_type') final String? businessType,
    @JsonKey(name: 'dealer_category') final String? dealerCategory,
    @JsonKey(name: 'delivery_supported') final bool? deliverySupported,
  }) = _$DealerImpl;

  factory _Dealer.fromJson(Map<String, dynamic> json) = _$DealerImpl.fromJson;

  @override
  int get id;
  @override
  String get name;
  @override
  String get logo;
  @override
  String get description;
  @override
  String get location;
  @override
  String get phone;
  @override
  num get rating;
  @override
  @JsonKey(name: 'branches_count')
  int get branchesCount;
  @override
  @JsonKey(name: 'reviews_count')
  int get reviewsCount;
  @override
  @JsonKey(name: 'is_luxury')
  bool get isLuxury;
  @override
  @JsonKey(name: 'car_count')
  int? get carCount;
  @override
  @JsonKey(name: 'whatsapp_number')
  String? get whatsappNumber;
  @override
  String? get address;
  @override
  @JsonKey(name: 'map_location_link')
  String? get mapLocationLink;
  @override
  num? get latitude;
  @override
  num? get longitude;
  @override
  @JsonKey(name: 'followers_count')
  int? get followersCount;
  @override
  String? get status;
  @override
  @JsonKey(name: 'planType')
  String? get planType;
  @override
  String? get email;
  @override
  @JsonKey(name: 'business_type')
  String? get businessType;
  @override
  @JsonKey(name: 'dealer_category')
  String? get dealerCategory;
  @override
  @JsonKey(name: 'delivery_supported')
  bool? get deliverySupported;

  /// Create a copy of Dealer
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$DealerImplCopyWith<_$DealerImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
