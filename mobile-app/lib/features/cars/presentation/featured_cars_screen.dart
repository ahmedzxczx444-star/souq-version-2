import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/l10n/app_strings.dart';
import '../../../shared/models/dealer_profile.dart';
import '../../../shared/providers/auth_provider.dart';
import '../../../shared/providers/core_providers.dart';
import '../../../shared/providers/favorites_provider.dart';
import '../../../shared/providers/language_provider.dart';
import '../../../shared/widgets/car_card.dart';
import '../../../shared/widgets/web_layout.dart';

final _featuredCarsProvider = FutureProvider.autoDispose((ref) async {
  final cars = await ref.watch(carRepositoryProvider).getAll();
  return cars.where(isFeaturedCar).toList();
});

/// Mirrors src/screens/FeaturedCarsScreen.tsx: GET /api/cars filtered with
/// the same rule as Home's strip, shown as full feed cards.
class FeaturedCarsScreen extends ConsumerWidget {
  const FeaturedCarsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = ref.watch(stringsProvider);
    final carsAsync = ref.watch(_featuredCarsProvider);
    final favorites = ref.watch(favoritesProvider).valueOrNull ?? <int>{};
    final cars = carsAsync.valueOrNull ?? const [];

    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          child: WebColumn(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 24, 16, 96),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  WebListHeader(
                    title: strings.featuredCars,
                    subtitle: '${cars.length} ${strings.carsCount}',
                    onBack: () => context.pop(),
                  ),
                  if (carsAsync.isLoading && !carsAsync.hasValue)
                    for (var i = 0; i < 3; i++)
                      const Padding(padding: EdgeInsets.only(bottom: 16), child: WebSkeleton(height: 256))
                  else
                    for (final car in cars)
                      Padding(
                        // `gap-6` between cards, on top of the card's own `mb-4`.
                        padding: const EdgeInsets.only(bottom: 8),
                        child: CarCardWidget(
                          car: car,
                          strings: strings,
                          isFavorite: favorites.contains(car.id),
                          onTap: () => context.push('/car/${car.id}'),
                          onFavoriteToggle: () {
                            if (ref.read(authProvider).valueOrNull == null) {
                              context.push('/login');
                              return;
                            }
                            ref.read(favoritesProvider.notifier).toggle(car.id);
                          },
                        ),
                      ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
