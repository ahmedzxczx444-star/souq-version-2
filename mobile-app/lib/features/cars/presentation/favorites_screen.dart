import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';
import '../../../shared/models/car.dart';
import '../../../shared/providers/core_providers.dart';
import '../../../shared/providers/favorites_provider.dart';
import '../../../shared/providers/language_provider.dart';
import '../../../shared/widgets/car_card.dart';
import '../../../shared/widgets/web_layout.dart';

final _favoriteCarsProvider = FutureProvider.autoDispose(
  (ref) => ref.watch(carRepositoryProvider).getFavorites(),
);

/// Mirrors src/screens/FavoritesScreen.tsx (GET /api/favorites). Reachable
/// only when signed in — the router redirects '/favorites' to '/login'
/// otherwise (see core/router/app_router.dart's protected-route list).
class FavoritesScreen extends ConsumerWidget {
  const FavoritesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = ref.watch(stringsProvider);
    final carsAsync = ref.watch(_favoriteCarsProvider);
    final favoriteIds = ref.watch(favoritesProvider).valueOrNull ?? <int>{};

    return Scaffold(
      appBar: AppBar(title: Text(strings.favorites)),
      body: WebColumn(
        child: RefreshIndicator(
          onRefresh: () => ref.refresh(_favoriteCarsProvider.future),
          child: carsAsync.when(
            loading: () => const Center(
              child: CircularProgressIndicator(color: AppColors.emeraldAccent),
            ),
            error: (e, _) => Center(child: Text('$e')),
            data: (cars) {
              if (cars.isEmpty) {
                return ListView(
                  children: [
                    const SizedBox(height: 120),
                    const Icon(
                      Icons.favorite_border_rounded,
                      size: 48,
                      color: AppColors.gray400,
                    ),
                    const SizedBox(height: 16),
                    Center(
                      child: Text(
                        strings.noFavorites,
                        style: const TextStyle(
                          fontWeight: FontWeight.w900,
                          fontSize: 16,
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Center(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 48),
                        child: Text(
                          strings.tapHeart,
                          textAlign: TextAlign.center,
                          style: const TextStyle(color: AppColors.gray400),
                        ),
                      ),
                    ),
                  ],
                );
              }
              return ListView(
                padding: const EdgeInsets.fromLTRB(12, 16, 12, 32),
                children: [
                  for (final Car car in cars)
                    CarCardWidget(
                      car: car,
                      strings: strings,
                      isFavorite: favoriteIds.contains(car.id),
                      onTap: () => context.push('/car/${car.id}'),
                      onFavoriteToggle: () =>
                          ref.read(favoritesProvider.notifier).toggle(car.id),
                    ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}
