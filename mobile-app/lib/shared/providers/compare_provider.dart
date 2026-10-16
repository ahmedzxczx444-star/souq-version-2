import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/car.dart';

/// Cars picked for side-by-side comparison (up to [CompareNotifier.max]).
/// Kept for the session only; the website has no saved comparisons either.
class CompareNotifier extends Notifier<List<Car>> {
  static const max = 3;

  @override
  List<Car> build() => const [];

  bool contains(int carId) => state.any((c) => c.id == carId);

  /// Adds or removes [car]. Returns false when the list is already full.
  bool toggle(Car car) {
    if (contains(car.id)) {
      remove(car.id);
      return true;
    }
    if (state.length >= max) return false;
    state = [...state, car];
    return true;
  }

  void remove(int carId) => state = [for (final c in state) if (c.id != carId) c];

  void clear() => state = const [];
}

final compareProvider = NotifierProvider<CompareNotifier, List<Car>>(CompareNotifier.new);
