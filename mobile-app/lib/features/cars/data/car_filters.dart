import '../../../shared/models/car.dart';

enum CarSort { relevance, priceLow, priceHigh, newestYear, lowestMileage }

/// Filters for a list of cars the app already has (GET /api/search only
/// takes free text, so price, year and the rest are applied on the phone to
/// the returned results). Empty fields mean "any".
class CarFilters {
  const CarFilters({
    this.make,
    this.minPrice,
    this.maxPrice,
    this.minYear,
    this.maxYear,
    this.fuelType,
    this.transmission,
    this.city,
    this.sort = CarSort.relevance,
  });

  final String? make;
  final num? minPrice;
  final num? maxPrice;
  final int? minYear;
  final int? maxYear;
  final String? fuelType;
  final String? transmission;
  final String? city;
  final CarSort sort;

  /// How many filters narrow the list (sorting is not counted).
  int get activeCount => [make, minPrice, maxPrice, minYear, maxYear, fuelType, transmission, city]
      .where((v) => v != null && (v is! String || v.isNotEmpty))
      .length;

  bool get isEmpty => activeCount == 0 && sort == CarSort.relevance;

  List<Car> apply(List<Car> cars) {
    bool same(String? a, String b) => a == null || a.isEmpty || a.trim().toLowerCase() == b.trim().toLowerCase();
    final out = cars.where((c) {
      if (!same(make, c.make)) return false;
      if (minPrice != null && c.price < minPrice!) return false;
      if (maxPrice != null && c.price > maxPrice!) return false;
      if (minYear != null && c.year < minYear!) return false;
      if (maxYear != null && c.year > maxYear!) return false;
      if (!same(fuelType, c.fuelType)) return false;
      if (!same(transmission, c.transmission)) return false;
      if (city != null && city!.isNotEmpty && !c.location.toLowerCase().contains(city!.trim().toLowerCase())) return false;
      return true;
    }).toList();
    switch (sort) {
      case CarSort.relevance:
        break;
      case CarSort.priceLow:
        out.sort((a, b) => a.price.compareTo(b.price));
      case CarSort.priceHigh:
        out.sort((a, b) => b.price.compareTo(a.price));
      case CarSort.newestYear:
        out.sort((a, b) => b.year.compareTo(a.year));
      case CarSort.lowestMileage:
        out.sort((a, b) => a.mileage.compareTo(b.mileage));
    }
    return out;
  }

  /// The distinct values present in [cars] for a field, for the pickers.
  static List<String> optionsOf(List<Car> cars, String Function(Car) field) {
    final seen = <String, String>{};
    for (final c in cars) {
      final v = field(c).trim();
      if (v.isNotEmpty) seen.putIfAbsent(v.toLowerCase(), () => v);
    }
    return seen.values.toList()..sort();
  }

  static const _unset = Object();

  CarFilters copyWith({
    Object? make = _unset,
    Object? minPrice = _unset,
    Object? maxPrice = _unset,
    Object? minYear = _unset,
    Object? maxYear = _unset,
    Object? fuelType = _unset,
    Object? transmission = _unset,
    Object? city = _unset,
    CarSort? sort,
  }) =>
      CarFilters(
        make: identical(make, _unset) ? this.make : make as String?,
        minPrice: identical(minPrice, _unset) ? this.minPrice : minPrice as num?,
        maxPrice: identical(maxPrice, _unset) ? this.maxPrice : maxPrice as num?,
        minYear: identical(minYear, _unset) ? this.minYear : minYear as int?,
        maxYear: identical(maxYear, _unset) ? this.maxYear : maxYear as int?,
        fuelType: identical(fuelType, _unset) ? this.fuelType : fuelType as String?,
        transmission: identical(transmission, _unset) ? this.transmission : transmission as String?,
        city: identical(city, _unset) ? this.city : city as String?,
        sort: sort ?? this.sort,
      );
}
