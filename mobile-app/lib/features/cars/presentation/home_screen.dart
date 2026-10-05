import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';
import '../../../shared/models/car.dart';
import '../../../shared/providers/auth_provider.dart';
import '../../../shared/providers/core_providers.dart';
import '../../../shared/providers/favorites_provider.dart';
import '../../../shared/providers/language_provider.dart';
import '../../../shared/widgets/car_card.dart';

final _homeCarsProvider = FutureProvider.autoDispose((ref) => ref.watch(carRepositoryProvider).getAll());

/// Mirrors src/screens/HomeScreen.tsx: dark hero header with the app name +
/// pill search bar, followed by the car feed. The site's inline
/// price/city/year filter panel and the top-dealers strip are left as a
/// follow-up (this screen focuses on the feed + search entry point that
/// the rest of Phase 1 hangs off of).
class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  final _searchController = TextEditingController();

  void _search() {
    final q = _searchController.text.trim();
    if (q.isNotEmpty) context.push('/search?q=${Uri.encodeComponent(q)}');
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final strings = ref.watch(stringsProvider);
    final carsAsync = ref.watch(_homeCarsProvider);
    final favorites = ref.watch(favoritesProvider).valueOrNull ?? <int>{};

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: () => ref.refresh(_homeCarsProvider.future),
        child: CustomScrollView(
          slivers: [
            SliverToBoxAdapter(child: _Hero(strings: strings, controller: _searchController, onSearch: _search)),
            carsAsync.when(
              loading: () => const SliverFillRemaining(
                child: Center(child: CircularProgressIndicator(color: AppColors.emeraldAccent)),
              ),
              error: (e, _) => SliverFillRemaining(
                child: Center(child: Text('$e', style: const TextStyle(color: AppColors.gray400))),
              ),
              data: (cars) => SliverPadding(
                padding: const EdgeInsets.fromLTRB(12, 16, 12, 32),
                sliver: SliverList.builder(
                  itemCount: cars.length,
                  itemBuilder: (context, i) {
                    final car = cars[i];
                    return CarCardWidget(
                      car: car,
                      strings: strings,
                      isFavorite: favorites.contains(car.id),
                      onTap: () => context.push('/car/${car.id}'),
                      onFavoriteToggle: () => _toggleFavorite(car),
                    );
                  },
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _toggleFavorite(Car car) {
    // Mirrors src/App.tsx's toggleFavorite: redirect to login instead of
    // calling the (auth-required) POST /api/favorites/:carId when signed out.
    if (ref.read(authProvider).valueOrNull == null) {
      context.push('/login');
      return;
    }
    ref.read(favoritesProvider.notifier).toggle(car.id);
  }
}

class _Hero extends StatelessWidget {
  const _Hero({required this.strings, required this.controller, required this.onSearch});

  final dynamic strings;
  final TextEditingController controller;
  final VoidCallback onSearch;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 56, 20, 32),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [AppColors.black, AppColors.emeraldAccent],
        ),
      ),
      child: Column(
        children: [
          Text(
            strings.appName as String,
            style: const TextStyle(
              color: AppColors.white,
              fontSize: 30,
              fontWeight: FontWeight.w900,
              letterSpacing: -0.5,
            ),
          ),
          const SizedBox(height: 24),
          Container(
            decoration: BoxDecoration(
              color: AppColors.white,
              borderRadius: BorderRadius.circular(999),
              boxShadow: const [BoxShadow(color: Colors.black26, blurRadius: 20, offset: Offset(0, 10))],
            ),
            padding: const EdgeInsets.all(6),
            child: Row(
              children: [
                Material(
                  color: AppColors.emeraldDeep,
                  borderRadius: BorderRadius.circular(999),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(999),
                    onTap: onSearch,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                      child: Text(
                        strings.search as String,
                        style: const TextStyle(color: AppColors.white, fontWeight: FontWeight.w800, fontSize: 13),
                      ),
                    ),
                  ),
                ),
                Expanded(
                  child: TextField(
                    controller: controller,
                    onSubmitted: (_) => onSearch(),
                    textInputAction: TextInputAction.search,
                    decoration: InputDecoration(
                      hintText: strings.searchPlaceholder as String,
                      border: InputBorder.none,
                      filled: false,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
