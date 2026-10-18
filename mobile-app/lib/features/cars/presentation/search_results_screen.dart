import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/l10n/app_strings.dart';
import '../../../core/l10n/market_strings.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/models/car.dart';
import '../../../shared/providers/auth_provider.dart';
import '../../../shared/providers/core_providers.dart';
import '../../../shared/providers/favorites_provider.dart';
import '../../../shared/providers/language_provider.dart';
import '../../../shared/widgets/car_card.dart';
import '../../../shared/widgets/web_layout.dart';
import '../../moderation/data/moderation_repository.dart';
import '../../dealers/presentation/manage/dealer_widgets.dart';
import '../data/car_filters.dart';
import '../data/car_repository.dart';

final searchResultsProvider = FutureProvider.autoDispose.family<SearchResult, String>(
  (ref, query) => ref.watch(carRepositoryProvider).search(query),
);

/// Mirrors src/screens/SearchResultsScreen.tsx (GET /api/search?q=...),
/// including the "no exact match, here's the closest" banner the backend
/// signals via `noExactMatch`. The server only takes free text, so the
/// filter sheet (make, price, year, fuel, gearbox, city, sorting) works on
/// the returned results.
class SearchResultsScreen extends ConsumerStatefulWidget {
  const SearchResultsScreen({super.key, required this.query});

  final String query;

  @override
  ConsumerState<SearchResultsScreen> createState() => _SearchResultsScreenState();
}

class _SearchResultsScreenState extends ConsumerState<SearchResultsScreen> {
  CarFilters _filters = const CarFilters();

  Future<void> _openFilters(List<Car> cars, AppStrings strings) async {
    final next = await showModalBottomSheet<CarFilters>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (_) => CarFilterSheet(cars: cars, initial: _filters, strings: strings),
    );
    if (next != null && mounted) setState(() => _filters = next);
  }

  @override
  Widget build(BuildContext context) {
    final strings = ref.watch(stringsProvider);
    final resultAsync = ref.watch(searchResultsProvider(widget.query));
    final blocked = ref.watch(blockedDealerIdsProvider);
    final favorites = ref.watch(favoritesProvider).valueOrNull ?? <int>{};

    return Scaffold(
      appBar: AppBar(
        title: Text(strings.search),
        actions: [
          if (resultAsync.valueOrNull?.cars.isNotEmpty ?? false)
            IconButton(
              key: const Key('open-filters'),
              tooltip: strings.filters,
              onPressed: () => _openFilters(resultAsync.value!.cars, strings),
              icon: Badge(
                isLabelVisible: _filters.activeCount > 0,
                label: Text('${_filters.activeCount}'),
                child: const Icon(Icons.tune_rounded),
              ),
            ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(20),
          child: Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Text(
              '"${widget.query}"',
              style: const TextStyle(color: AppColors.gray400, fontWeight: FontWeight.w700, fontSize: 12),
            ),
          ),
        ),
      ),
      body: WebColumn(
        child: resultAsync.when(
          loading: () => const Center(child: CircularProgressIndicator(color: AppColors.emerald500)),
          error: (e, _) => ErrorView(
            message: errorMessage(e, strings),
            onRetry: () => ref.invalidate(searchResultsProvider(widget.query)),
            strings: strings,
          ),
          data: (result) {
            final shown = _filters.apply([for (final c in result.cars) if (!blocked.contains(c.dealerId)) c]);
            if (shown.isEmpty) {
              return Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    EmptyView(icon: Icons.search_off_rounded, title: strings.noResults, body: strings.noResultsBody),
                    if (_filters.activeCount > 0)
                      TextButton(
                        key: const Key('clear-filters'),
                        onPressed: () => setState(() => _filters = const CarFilters()),
                        child: Text(strings.clearFilters),
                      ),
                  ],
                ),
              );
            }
            return ListView(
              padding: const EdgeInsets.fromLTRB(12, 16, 12, 32),
              children: [
                if (result.noExactMatch)
                  Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFFBEB),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFFDE68A)),
                    ),
                    child: Text(
                      strings.closestMatches,
                      style: const TextStyle(color: Color(0xFFB45309), fontWeight: FontWeight.w700, fontSize: 12),
                    ),
                  ),
                Row(
                  children: [
                    Expanded(
                      child: Text('${shown.length} ${strings.carsFound}', style: const TextStyle(fontWeight: FontWeight.w900)),
                    ),
                    if (_filters.activeCount > 0)
                      TextButton(
                        onPressed: () => setState(() => _filters = const CarFilters()),
                        child: Text('${strings.filtersActive(_filters.activeCount)} · ${strings.clearFilters}'),
                      ),
                  ],
                ),
                const SizedBox(height: 12),
                for (final car in shown)
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

/// Bottom sheet that edits a [CarFilters]; pops the new value on Apply.
class CarFilterSheet extends StatefulWidget {
  const CarFilterSheet({super.key, required this.cars, required this.initial, required this.strings});

  final List<Car> cars;
  final CarFilters initial;
  final AppStrings strings;

  @override
  State<CarFilterSheet> createState() => _CarFilterSheetState();
}

class _CarFilterSheetState extends State<CarFilterSheet> {
  late String _make = widget.initial.make ?? '';
  late String _fuel = widget.initial.fuelType ?? '';
  late String _gearbox = widget.initial.transmission ?? '';
  late CarSort _sort = widget.initial.sort;
  late final _minPrice = TextEditingController(text: widget.initial.minPrice?.toString() ?? '');
  late final _maxPrice = TextEditingController(text: widget.initial.maxPrice?.toString() ?? '');
  late final _minYear = TextEditingController(text: widget.initial.minYear?.toString() ?? '');
  late final _maxYear = TextEditingController(text: widget.initial.maxYear?.toString() ?? '');
  late final _city = TextEditingController(text: widget.initial.city ?? '');

  @override
  void dispose() {
    for (final c in [_minPrice, _maxPrice, _minYear, _maxYear, _city]) {
      c.dispose();
    }
    super.dispose();
  }

  String? _orNull(String v) => v.trim().isEmpty ? null : v.trim();

  Map<String, String> _options(String Function(Car) field) => {
        '': widget.strings.anyOption,
        for (final v in CarFilters.optionsOf(widget.cars, field)) v: v,
      };

  Widget _range(String label, TextEditingController min, TextEditingController max, String keyPrefix) {
    final s = widget.strings;
    return Row(
      children: [
        Expanded(
          child: LabeledField(
            key: Key('$keyPrefix-min'),
            label: '$label · ${s.minLabel}',
            controller: min,
            keyboardType: TextInputType.number,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: LabeledField(
            key: Key('$keyPrefix-max'),
            label: '$label · ${s.maxLabel}',
            controller: max,
            keyboardType: TextInputType.number,
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final s = widget.strings;
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(s.filters, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18)),
            const SizedBox(height: 4),
            Text(s.filtersHint, style: const TextStyle(color: AppColors.gray500, fontSize: 12)),
            LabeledDropdown(label: s.brand, value: _make, items: _options((c) => c.make), onChanged: (v) => setState(() => _make = v)),
            _range(s.priceRange, _minPrice, _maxPrice, 'price'),
            _range(s.yearRange, _minYear, _maxYear, 'year'),
            LabeledDropdown(label: s.fuel, value: _fuel, items: _options((c) => c.fuelType), onChanged: (v) => setState(() => _fuel = v)),
            LabeledDropdown(
              label: s.gearbox,
              value: _gearbox,
              items: _options((c) => c.transmission),
              onChanged: (v) => setState(() => _gearbox = v),
            ),
            LabeledField(key: const Key('city'), label: s.city, controller: _city),
            LabeledDropdown(
              label: s.sortBy,
              value: _sort.name,
              items: {
                CarSort.relevance.name: s.sortRelevance,
                CarSort.priceLow.name: s.sortPriceLow,
                CarSort.priceHigh.name: s.sortPriceHigh,
                CarSort.newestYear.name: s.sortNewestYear,
                CarSort.lowestMileage.name: s.sortMileage,
              },
              onChanged: (v) => setState(() => _sort = CarSort.values.byName(v)),
            ),
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    key: const Key('filters-clear'),
                    onPressed: () => Navigator.pop(context, const CarFilters()),
                    child: Text(s.clearFilters),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: FilledButton(
                    key: const Key('filters-apply'),
                    style: FilledButton.styleFrom(backgroundColor: AppColors.black),
                    onPressed: () => Navigator.pop(
                      context,
                      CarFilters(
                        make: _orNull(_make),
                        minPrice: num.tryParse(_minPrice.text.trim()),
                        maxPrice: num.tryParse(_maxPrice.text.trim()),
                        minYear: int.tryParse(_minYear.text.trim()),
                        maxYear: int.tryParse(_maxYear.text.trim()),
                        fuelType: _orNull(_fuel),
                        transmission: _orNull(_gearbox),
                        city: _orNull(_city.text),
                        sort: _sort,
                      ),
                    ),
                    child: Text(s.applyFilters),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
