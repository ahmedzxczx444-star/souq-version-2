// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'car.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
  'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models',
);

Car _$CarFromJson(Map<String, dynamic> json) {
  return _Car.fromJson(json);
}

/// @nodoc
mixin _$Car {
  int get id => throw _privateConstructorUsedError;
  @JsonKey(name: 'dealer_id')
  int get dealerId => throw _privateConstructorUsedError;
  String get make => throw _privateConstructorUsedError;
  String get model => throw _privateConstructorUsedError;
  int get year => throw _privateConstructorUsedError;
  num get price => throw _privateConstructorUsedError;
  num get mileage => throw _privateConstructorUsedError;
  @JsonKey(name: 'fuel_type')
  String get fuelType => throw _privateConstructorUsedError;
  String get transmission => throw _privateConstructorUsedError;
  String get description => throw _privateConstructorUsedError;
  List<String> get images => throw _privateConstructorUsedError;
  String get location => throw _privateConstructorUsedError;
  String get status => throw _privateConstructorUsedError;
  num get views => throw _privateConstructorUsedError;
  @JsonKey(name: 'favorites_count')
  int? get favoritesCount => throw _privateConstructorUsedError;
  bool get featured => throw _privateConstructorUsedError;
  @JsonKey(name: 'isPromoted')
  bool get isPromoted => throw _privateConstructorUsedError;
  @JsonKey(name: 'promotion_expires')
  String? get promotionExpires => throw _privateConstructorUsedError;
  @JsonKey(name: 'dealer_plan_type')
  String? get dealerPlanType => throw _privateConstructorUsedError;
  @JsonKey(name: 'createdAt')
  String? get createdAt => throw _privateConstructorUsedError;
  @JsonKey(name: 'dealer_name')
  String? get dealerName => throw _privateConstructorUsedError;
  @JsonKey(name: 'dealer_logo')
  String? get dealerLogo => throw _privateConstructorUsedError;
  @JsonKey(name: 'dealer_location')
  String? get dealerLocation => throw _privateConstructorUsedError;
  @JsonKey(name: 'dealer_phone')
  String? get dealerPhone => throw _privateConstructorUsedError;
  @JsonKey(name: 'dealer_whatsapp')
  String? get dealerWhatsapp => throw _privateConstructorUsedError;
  @JsonKey(name: 'dealer_user_id')
  int? get dealerUserId => throw _privateConstructorUsedError;
  @JsonKey(name: 'dealer_rating')
  num? get dealerRating => throw _privateConstructorUsedError;

  /// Serializes this Car to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of Car
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $CarCopyWith<Car> get copyWith => throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $CarCopyWith<$Res> {
  factory $CarCopyWith(Car value, $Res Function(Car) then) =
      _$CarCopyWithImpl<$Res, Car>;
  @useResult
  $Res call({
    int id,
    @JsonKey(name: 'dealer_id') int dealerId,
    String make,
    String model,
    int year,
    num price,
    num mileage,
    @JsonKey(name: 'fuel_type') String fuelType,
    String transmission,
    String description,
    List<String> images,
    String location,
    String status,
    num views,
    @JsonKey(name: 'favorites_count') int? favoritesCount,
    bool featured,
    @JsonKey(name: 'isPromoted') bool isPromoted,
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
  });
}

/// @nodoc
class _$CarCopyWithImpl<$Res, $Val extends Car> implements $CarCopyWith<$Res> {
  _$CarCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of Car
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? dealerId = null,
    Object? make = null,
    Object? model = null,
    Object? year = null,
    Object? price = null,
    Object? mileage = null,
    Object? fuelType = null,
    Object? transmission = null,
    Object? description = null,
    Object? images = null,
    Object? location = null,
    Object? status = null,
    Object? views = null,
    Object? favoritesCount = freezed,
    Object? featured = null,
    Object? isPromoted = null,
    Object? promotionExpires = freezed,
    Object? dealerPlanType = freezed,
    Object? createdAt = freezed,
    Object? dealerName = freezed,
    Object? dealerLogo = freezed,
    Object? dealerLocation = freezed,
    Object? dealerPhone = freezed,
    Object? dealerWhatsapp = freezed,
    Object? dealerUserId = freezed,
    Object? dealerRating = freezed,
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
            make: null == make
                ? _value.make
                : make // ignore: cast_nullable_to_non_nullable
                      as String,
            model: null == model
                ? _value.model
                : model // ignore: cast_nullable_to_non_nullable
                      as String,
            year: null == year
                ? _value.year
                : year // ignore: cast_nullable_to_non_nullable
                      as int,
            price: null == price
                ? _value.price
                : price // ignore: cast_nullable_to_non_nullable
                      as num,
            mileage: null == mileage
                ? _value.mileage
                : mileage // ignore: cast_nullable_to_non_nullable
                      as num,
            fuelType: null == fuelType
                ? _value.fuelType
                : fuelType // ignore: cast_nullable_to_non_nullable
                      as String,
            transmission: null == transmission
                ? _value.transmission
                : transmission // ignore: cast_nullable_to_non_nullable
                      as String,
            description: null == description
                ? _value.description
                : description // ignore: cast_nullable_to_non_nullable
                      as String,
            images: null == images
                ? _value.images
                : images // ignore: cast_nullable_to_non_nullable
                      as List<String>,
            location: null == location
                ? _value.location
                : location // ignore: cast_nullable_to_non_nullable
                      as String,
            status: null == status
                ? _value.status
                : status // ignore: cast_nullable_to_non_nullable
                      as String,
            views: null == views
                ? _value.views
                : views // ignore: cast_nullable_to_non_nullable
                      as num,
            favoritesCount: freezed == favoritesCount
                ? _value.favoritesCount
                : favoritesCount // ignore: cast_nullable_to_non_nullable
                      as int?,
            featured: null == featured
                ? _value.featured
                : featured // ignore: cast_nullable_to_non_nullable
                      as bool,
            isPromoted: null == isPromoted
                ? _value.isPromoted
                : isPromoted // ignore: cast_nullable_to_non_nullable
                      as bool,
            promotionExpires: freezed == promotionExpires
                ? _value.promotionExpires
                : promotionExpires // ignore: cast_nullable_to_non_nullable
                      as String?,
            dealerPlanType: freezed == dealerPlanType
                ? _value.dealerPlanType
                : dealerPlanType // ignore: cast_nullable_to_non_nullable
                      as String?,
            createdAt: freezed == createdAt
                ? _value.createdAt
                : createdAt // ignore: cast_nullable_to_non_nullable
                      as String?,
            dealerName: freezed == dealerName
                ? _value.dealerName
                : dealerName // ignore: cast_nullable_to_non_nullable
                      as String?,
            dealerLogo: freezed == dealerLogo
                ? _value.dealerLogo
                : dealerLogo // ignore: cast_nullable_to_non_nullable
                      as String?,
            dealerLocation: freezed == dealerLocation
                ? _value.dealerLocation
                : dealerLocation // ignore: cast_nullable_to_non_nullable
                      as String?,
            dealerPhone: freezed == dealerPhone
                ? _value.dealerPhone
                : dealerPhone // ignore: cast_nullable_to_non_nullable
                      as String?,
            dealerWhatsapp: freezed == dealerWhatsapp
                ? _value.dealerWhatsapp
                : dealerWhatsapp // ignore: cast_nullable_to_non_nullable
                      as String?,
            dealerUserId: freezed == dealerUserId
                ? _value.dealerUserId
                : dealerUserId // ignore: cast_nullable_to_non_nullable
                      as int?,
            dealerRating: freezed == dealerRating
                ? _value.dealerRating
                : dealerRating // ignore: cast_nullable_to_non_nullable
                      as num?,
          )
          as $Val,
    );
  }
}

/// @nodoc
abstract class _$$CarImplCopyWith<$Res> implements $CarCopyWith<$Res> {
  factory _$$CarImplCopyWith(_$CarImpl value, $Res Function(_$CarImpl) then) =
      __$$CarImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({
    int id,
    @JsonKey(name: 'dealer_id') int dealerId,
    String make,
    String model,
    int year,
    num price,
    num mileage,
    @JsonKey(name: 'fuel_type') String fuelType,
    String transmission,
    String description,
    List<String> images,
    String location,
    String status,
    num views,
    @JsonKey(name: 'favorites_count') int? favoritesCount,
    bool featured,
    @JsonKey(name: 'isPromoted') bool isPromoted,
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
  });
}

/// @nodoc
class __$$CarImplCopyWithImpl<$Res> extends _$CarCopyWithImpl<$Res, _$CarImpl>
    implements _$$CarImplCopyWith<$Res> {
  __$$CarImplCopyWithImpl(_$CarImpl _value, $Res Function(_$CarImpl) _then)
    : super(_value, _then);

  /// Create a copy of Car
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? dealerId = null,
    Object? make = null,
    Object? model = null,
    Object? year = null,
    Object? price = null,
    Object? mileage = null,
    Object? fuelType = null,
    Object? transmission = null,
    Object? description = null,
    Object? images = null,
    Object? location = null,
    Object? status = null,
    Object? views = null,
    Object? favoritesCount = freezed,
    Object? featured = null,
    Object? isPromoted = null,
    Object? promotionExpires = freezed,
    Object? dealerPlanType = freezed,
    Object? createdAt = freezed,
    Object? dealerName = freezed,
    Object? dealerLogo = freezed,
    Object? dealerLocation = freezed,
    Object? dealerPhone = freezed,
    Object? dealerWhatsapp = freezed,
    Object? dealerUserId = freezed,
    Object? dealerRating = freezed,
  }) {
    return _then(
      _$CarImpl(
        id: null == id
            ? _value.id
            : id // ignore: cast_nullable_to_non_nullable
                  as int,
        dealerId: null == dealerId
            ? _value.dealerId
            : dealerId // ignore: cast_nullable_to_non_nullable
                  as int,
        make: null == make
            ? _value.make
            : make // ignore: cast_nullable_to_non_nullable
                  as String,
        model: null == model
            ? _value.model
            : model // ignore: cast_nullable_to_non_nullable
                  as String,
        year: null == year
            ? _value.year
            : year // ignore: cast_nullable_to_non_nullable
                  as int,
        price: null == price
            ? _value.price
            : price // ignore: cast_nullable_to_non_nullable
                  as num,
        mileage: null == mileage
            ? _value.mileage
            : mileage // ignore: cast_nullable_to_non_nullable
                  as num,
        fuelType: null == fuelType
            ? _value.fuelType
            : fuelType // ignore: cast_nullable_to_non_nullable
                  as String,
        transmission: null == transmission
            ? _value.transmission
            : transmission // ignore: cast_nullable_to_non_nullable
                  as String,
        description: null == description
            ? _value.description
            : description // ignore: cast_nullable_to_non_nullable
                  as String,
        images: null == images
            ? _value._images
            : images // ignore: cast_nullable_to_non_nullable
                  as List<String>,
        location: null == location
            ? _value.location
            : location // ignore: cast_nullable_to_non_nullable
                  as String,
        status: null == status
            ? _value.status
            : status // ignore: cast_nullable_to_non_nullable
                  as String,
        views: null == views
            ? _value.views
            : views // ignore: cast_nullable_to_non_nullable
                  as num,
        favoritesCount: freezed == favoritesCount
            ? _value.favoritesCount
            : favoritesCount // ignore: cast_nullable_to_non_nullable
                  as int?,
        featured: null == featured
            ? _value.featured
            : featured // ignore: cast_nullable_to_non_nullable
                  as bool,
        isPromoted: null == isPromoted
            ? _value.isPromoted
            : isPromoted // ignore: cast_nullable_to_non_nullable
                  as bool,
        promotionExpires: freezed == promotionExpires
            ? _value.promotionExpires
            : promotionExpires // ignore: cast_nullable_to_non_nullable
                  as String?,
        dealerPlanType: freezed == dealerPlanType
            ? _value.dealerPlanType
            : dealerPlanType // ignore: cast_nullable_to_non_nullable
                  as String?,
        createdAt: freezed == createdAt
            ? _value.createdAt
            : createdAt // ignore: cast_nullable_to_non_nullable
                  as String?,
        dealerName: freezed == dealerName
            ? _value.dealerName
            : dealerName // ignore: cast_nullable_to_non_nullable
                  as String?,
        dealerLogo: freezed == dealerLogo
            ? _value.dealerLogo
            : dealerLogo // ignore: cast_nullable_to_non_nullable
                  as String?,
        dealerLocation: freezed == dealerLocation
            ? _value.dealerLocation
            : dealerLocation // ignore: cast_nullable_to_non_nullable
                  as String?,
        dealerPhone: freezed == dealerPhone
            ? _value.dealerPhone
            : dealerPhone // ignore: cast_nullable_to_non_nullable
                  as String?,
        dealerWhatsapp: freezed == dealerWhatsapp
            ? _value.dealerWhatsapp
            : dealerWhatsapp // ignore: cast_nullable_to_non_nullable
                  as String?,
        dealerUserId: freezed == dealerUserId
            ? _value.dealerUserId
            : dealerUserId // ignore: cast_nullable_to_non_nullable
                  as int?,
        dealerRating: freezed == dealerRating
            ? _value.dealerRating
            : dealerRating // ignore: cast_nullable_to_non_nullable
                  as num?,
      ),
    );
  }
}

/// @nodoc
@JsonSerializable()
class _$CarImpl implements _Car {
  const _$CarImpl({
    required this.id,
    @JsonKey(name: 'dealer_id') required this.dealerId,
    required this.make,
    required this.model,
    required this.year,
    required this.price,
    required this.mileage,
    @JsonKey(name: 'fuel_type') required this.fuelType,
    required this.transmission,
    required this.description,
    required final List<String> images,
    required this.location,
    required this.status,
    this.views = 0,
    @JsonKey(name: 'favorites_count') this.favoritesCount,
    this.featured = false,
    @JsonKey(name: 'isPromoted') this.isPromoted = false,
    @JsonKey(name: 'promotion_expires') this.promotionExpires,
    @JsonKey(name: 'dealer_plan_type') this.dealerPlanType,
    @JsonKey(name: 'createdAt') this.createdAt,
    @JsonKey(name: 'dealer_name') this.dealerName,
    @JsonKey(name: 'dealer_logo') this.dealerLogo,
    @JsonKey(name: 'dealer_location') this.dealerLocation,
    @JsonKey(name: 'dealer_phone') this.dealerPhone,
    @JsonKey(name: 'dealer_whatsapp') this.dealerWhatsapp,
    @JsonKey(name: 'dealer_user_id') this.dealerUserId,
    @JsonKey(name: 'dealer_rating') this.dealerRating,
  }) : _images = images;

  factory _$CarImpl.fromJson(Map<String, dynamic> json) =>
      _$$CarImplFromJson(json);

  @override
  final int id;
  @override
  @JsonKey(name: 'dealer_id')
  final int dealerId;
  @override
  final String make;
  @override
  final String model;
  @override
  final int year;
  @override
  final num price;
  @override
  final num mileage;
  @override
  @JsonKey(name: 'fuel_type')
  final String fuelType;
  @override
  final String transmission;
  @override
  final String description;
  final List<String> _images;
  @override
  List<String> get images {
    if (_images is EqualUnmodifiableListView) return _images;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_images);
  }

  @override
  final String location;
  @override
  final String status;
  @override
  @JsonKey()
  final num views;
  @override
  @JsonKey(name: 'favorites_count')
  final int? favoritesCount;
  @override
  @JsonKey()
  final bool featured;
  @override
  @JsonKey(name: 'isPromoted')
  final bool isPromoted;
  @override
  @JsonKey(name: 'promotion_expires')
  final String? promotionExpires;
  @override
  @JsonKey(name: 'dealer_plan_type')
  final String? dealerPlanType;
  @override
  @JsonKey(name: 'createdAt')
  final String? createdAt;
  @override
  @JsonKey(name: 'dealer_name')
  final String? dealerName;
  @override
  @JsonKey(name: 'dealer_logo')
  final String? dealerLogo;
  @override
  @JsonKey(name: 'dealer_location')
  final String? dealerLocation;
  @override
  @JsonKey(name: 'dealer_phone')
  final String? dealerPhone;
  @override
  @JsonKey(name: 'dealer_whatsapp')
  final String? dealerWhatsapp;
  @override
  @JsonKey(name: 'dealer_user_id')
  final int? dealerUserId;
  @override
  @JsonKey(name: 'dealer_rating')
  final num? dealerRating;

  @override
  String toString() {
    return 'Car(id: $id, dealerId: $dealerId, make: $make, model: $model, year: $year, price: $price, mileage: $mileage, fuelType: $fuelType, transmission: $transmission, description: $description, images: $images, location: $location, status: $status, views: $views, favoritesCount: $favoritesCount, featured: $featured, isPromoted: $isPromoted, promotionExpires: $promotionExpires, dealerPlanType: $dealerPlanType, createdAt: $createdAt, dealerName: $dealerName, dealerLogo: $dealerLogo, dealerLocation: $dealerLocation, dealerPhone: $dealerPhone, dealerWhatsapp: $dealerWhatsapp, dealerUserId: $dealerUserId, dealerRating: $dealerRating)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$CarImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.dealerId, dealerId) ||
                other.dealerId == dealerId) &&
            (identical(other.make, make) || other.make == make) &&
            (identical(other.model, model) || other.model == model) &&
            (identical(other.year, year) || other.year == year) &&
            (identical(other.price, price) || other.price == price) &&
            (identical(other.mileage, mileage) || other.mileage == mileage) &&
            (identical(other.fuelType, fuelType) ||
                other.fuelType == fuelType) &&
            (identical(other.transmission, transmission) ||
                other.transmission == transmission) &&
            (identical(other.description, description) ||
                other.description == description) &&
            const DeepCollectionEquality().equals(other._images, _images) &&
            (identical(other.location, location) ||
                other.location == location) &&
            (identical(other.status, status) || other.status == status) &&
            (identical(other.views, views) || other.views == views) &&
            (identical(other.favoritesCount, favoritesCount) ||
                other.favoritesCount == favoritesCount) &&
            (identical(other.featured, featured) ||
                other.featured == featured) &&
            (identical(other.isPromoted, isPromoted) ||
                other.isPromoted == isPromoted) &&
            (identical(other.promotionExpires, promotionExpires) ||
                other.promotionExpires == promotionExpires) &&
            (identical(other.dealerPlanType, dealerPlanType) ||
                other.dealerPlanType == dealerPlanType) &&
            (identical(other.createdAt, createdAt) ||
                other.createdAt == createdAt) &&
            (identical(other.dealerName, dealerName) ||
                other.dealerName == dealerName) &&
            (identical(other.dealerLogo, dealerLogo) ||
                other.dealerLogo == dealerLogo) &&
            (identical(other.dealerLocation, dealerLocation) ||
                other.dealerLocation == dealerLocation) &&
            (identical(other.dealerPhone, dealerPhone) ||
                other.dealerPhone == dealerPhone) &&
            (identical(other.dealerWhatsapp, dealerWhatsapp) ||
                other.dealerWhatsapp == dealerWhatsapp) &&
            (identical(other.dealerUserId, dealerUserId) ||
                other.dealerUserId == dealerUserId) &&
            (identical(other.dealerRating, dealerRating) ||
                other.dealerRating == dealerRating));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hashAll([
    runtimeType,
    id,
    dealerId,
    make,
    model,
    year,
    price,
    mileage,
    fuelType,
    transmission,
    description,
    const DeepCollectionEquality().hash(_images),
    location,
    status,
    views,
    favoritesCount,
    featured,
    isPromoted,
    promotionExpires,
    dealerPlanType,
    createdAt,
    dealerName,
    dealerLogo,
    dealerLocation,
    dealerPhone,
    dealerWhatsapp,
    dealerUserId,
    dealerRating,
  ]);

  /// Create a copy of Car
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$CarImplCopyWith<_$CarImpl> get copyWith =>
      __$$CarImplCopyWithImpl<_$CarImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$CarImplToJson(this);
  }
}

abstract class _Car implements Car {
  const factory _Car({
    required final int id,
    @JsonKey(name: 'dealer_id') required final int dealerId,
    required final String make,
    required final String model,
    required final int year,
    required final num price,
    required final num mileage,
    @JsonKey(name: 'fuel_type') required final String fuelType,
    required final String transmission,
    required final String description,
    required final List<String> images,
    required final String location,
    required final String status,
    final num views,
    @JsonKey(name: 'favorites_count') final int? favoritesCount,
    final bool featured,
    @JsonKey(name: 'isPromoted') final bool isPromoted,
    @JsonKey(name: 'promotion_expires') final String? promotionExpires,
    @JsonKey(name: 'dealer_plan_type') final String? dealerPlanType,
    @JsonKey(name: 'createdAt') final String? createdAt,
    @JsonKey(name: 'dealer_name') final String? dealerName,
    @JsonKey(name: 'dealer_logo') final String? dealerLogo,
    @JsonKey(name: 'dealer_location') final String? dealerLocation,
    @JsonKey(name: 'dealer_phone') final String? dealerPhone,
    @JsonKey(name: 'dealer_whatsapp') final String? dealerWhatsapp,
    @JsonKey(name: 'dealer_user_id') final int? dealerUserId,
    @JsonKey(name: 'dealer_rating') final num? dealerRating,
  }) = _$CarImpl;

  factory _Car.fromJson(Map<String, dynamic> json) = _$CarImpl.fromJson;

  @override
  int get id;
  @override
  @JsonKey(name: 'dealer_id')
  int get dealerId;
  @override
  String get make;
  @override
  String get model;
  @override
  int get year;
  @override
  num get price;
  @override
  num get mileage;
  @override
  @JsonKey(name: 'fuel_type')
  String get fuelType;
  @override
  String get transmission;
  @override
  String get description;
  @override
  List<String> get images;
  @override
  String get location;
  @override
  String get status;
  @override
  num get views;
  @override
  @JsonKey(name: 'favorites_count')
  int? get favoritesCount;
  @override
  bool get featured;
  @override
  @JsonKey(name: 'isPromoted')
  bool get isPromoted;
  @override
  @JsonKey(name: 'promotion_expires')
  String? get promotionExpires;
  @override
  @JsonKey(name: 'dealer_plan_type')
  String? get dealerPlanType;
  @override
  @JsonKey(name: 'createdAt')
  String? get createdAt;
  @override
  @JsonKey(name: 'dealer_name')
  String? get dealerName;
  @override
  @JsonKey(name: 'dealer_logo')
  String? get dealerLogo;
  @override
  @JsonKey(name: 'dealer_location')
  String? get dealerLocation;
  @override
  @JsonKey(name: 'dealer_phone')
  String? get dealerPhone;
  @override
  @JsonKey(name: 'dealer_whatsapp')
  String? get dealerWhatsapp;
  @override
  @JsonKey(name: 'dealer_user_id')
  int? get dealerUserId;
  @override
  @JsonKey(name: 'dealer_rating')
  num? get dealerRating;

  /// Create a copy of Car
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$CarImplCopyWith<_$CarImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
