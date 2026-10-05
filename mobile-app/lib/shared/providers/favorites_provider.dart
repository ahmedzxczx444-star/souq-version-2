import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'auth_provider.dart';
import 'core_providers.dart';

/// Set of favorited car IDs, mirroring src/App.tsx's `favorites: number[]`
/// state (fetched once on login via GET /api/favorites, toggled optimistically
/// via POST /api/favorites/:carId).
class FavoritesNotifier extends AsyncNotifier<Set<int>> {
  @override
  FutureOr<Set<int>> build() async {
    final user = await ref.watch(authProvider.future);
    if (user == null) return <int>{};
    final cars = await ref.watch(carRepositoryProvider).getFavorites();
    return cars.map((c) => c.id).toSet();
  }

  Future<void> toggle(int carId) async {
    final current = state.valueOrNull ?? <int>{};
    final optimistic = Set<int>.from(current);
    if (optimistic.contains(carId)) {
      optimistic.remove(carId);
    } else {
      optimistic.add(carId);
    }
    state = AsyncData(optimistic);
    try {
      await ref.read(carRepositoryProvider).toggleFavorite(carId);
    } catch (_) {
      state = AsyncData(current);
    }
  }
}

final favoritesProvider = AsyncNotifierProvider<FavoritesNotifier, Set<int>>(FavoritesNotifier.new);
