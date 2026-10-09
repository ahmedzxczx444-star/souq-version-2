import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';
import '../../../shared/providers/auth_provider.dart';
import '../../../shared/providers/core_providers.dart';
import '../../../shared/providers/favorites_provider.dart';
import '../../../shared/providers/language_provider.dart';
import '../../../shared/widgets/car_card.dart';
import '../../../shared/widgets/web_layout.dart';
import '../data/car_repository.dart';

final _searchProvider = FutureProvider.autoDispose.family<SearchResult, String>(
  (ref, query) => ref.watch(carRepositoryProvider).search(query),
);

/// Mirrors src/screens/SearchResultsScreen.tsx (GET /api/search?q=...),
/// including the "no exact match, here's the closest" banner the backend
/// signals via `noExactMatch`.
class SearchResultsScreen extends ConsumerWidget {
  const SearchResultsScreen({super.key, required this.query});

  final String query;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = ref.watch(stringsProvider);
    final resultAsync = ref.watch(_searchProvider(query));
    final favorites = ref.watch(favoritesProvider).valueOrNull ?? <int>{};

    return Scaffold(
      appBar: AppBar(
        title: Text(strings.search),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(20),
          child: Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Text(
              '"$query"',
              style: const TextStyle(
                color: AppColors.gray400,
                fontWeight: FontWeight.w700,
                fontSize: 12,
              ),
            ),
          ),
        ),
      ),
      body: WebColumn(
        child: resultAsync.when(
          loading: () => const Center(
            child: CircularProgressIndicator(color: AppColors.emerald500),
          ),
          error: (e, _) => Center(child: Text('$e')),
          data: (result) {
            if (result.cars.isEmpty) {
              return Center(
                child: Padding(
                  padding: const EdgeInsets.all(32),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(
                        Icons.search_off_rounded,
                        size: 40,
                        color: AppColors.gray400,
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        'لا توجد نتائج',
                        style: TextStyle(
                          fontWeight: FontWeight.w900,
                          fontSize: 18,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }
            return ListView(
              padding: const EdgeInsets.fromLTRB(12, 16, 12, 32),
              children: [
                if (result.noExactMatch)
                  Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 12,
                    ),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFFBEB),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFFDE68A)),
                    ),
                    child: const Text(
                      'لم نجد نتائج مطابقة تمامًا لبحثك، إليك أقرب السيارات المتاحة:',
                      style: TextStyle(
                        color: Color(0xFFB45309),
                        fontWeight: FontWeight.w700,
                        fontSize: 12,
                      ),
                    ),
                  ),
                Text(
                  '${result.cars.length} ${strings.carsFound}',
                  style: const TextStyle(fontWeight: FontWeight.w900),
                ),
                const SizedBox(height: 12),
                for (final car in result.cars)
                  CarCardWidget(
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
              ],
            );
          },
        ),
      ),
    );
  }
}
