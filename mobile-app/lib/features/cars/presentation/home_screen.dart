import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/l10n/app_strings.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/models/car.dart';
import '../../../shared/models/dealer.dart';
import '../../../shared/models/dealer_profile.dart';
import '../../../shared/providers/auth_provider.dart';
import '../../../shared/providers/core_providers.dart';
import '../../../shared/providers/favorites_provider.dart';
import '../../../shared/providers/language_provider.dart';
import '../../../shared/widgets/car_card.dart';
import '../../../shared/widgets/dealer_card.dart';
import '../../../shared/widgets/web_layout.dart';

/// Home data, loaded together like HomeScreen.tsx's `Promise.all`.
typedef HomeData = ({List<Car> cars, List<Dealer> topDealers});

final homeDataProvider = FutureProvider.autoDispose<HomeData>((ref) async {
  final cars = ref.watch(carRepositoryProvider).getAll();
  final dealers = ref.watch(dealerRepositoryProvider).getTop();
  return (cars: await cars, topDealers: await dealers);
});

/// Mirrors src/screens/HomeScreen.tsx section for section: hero (photo,
/// title, language toggle, search pill, Smart AI button), the Top Dealers
/// card overlapping the hero, the Featured Cars card, the feed, the footer.
///
/// The site's filter sheet is not ported: nothing on the page opens it
/// (`setShowFilter(true)` is never called), so it is unreachable there too.
class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  static const double _heroHeight = 500;
  // The Top Dealers section is pulled up over the hero with `-mt-24`.
  static const double _heroOverlap = 96;

  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    // The site filters the feed live by make/model as you type.
    _searchController.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _search() {
    final q = _searchController.text.trim();
    if (q.isNotEmpty) context.push('/search?q=${Uri.encodeComponent(q)}');
  }

  void _toggleFavorite(Car car) {
    // src/App.tsx's toggleFavorite: signed-out users are sent to sign in.
    if (ref.read(authProvider).valueOrNull == null) {
      context.push('/login');
      return;
    }
    ref.read(favoritesProvider.notifier).toggle(car.id);
  }

  @override
  Widget build(BuildContext context) {
    final strings = ref.watch(stringsProvider);
    final data = ref.watch(homeDataProvider);
    final favorites = ref.watch(favoritesProvider).valueOrNull ?? <int>{};

    final cars = data.valueOrNull?.cars ?? const <Car>[];
    final topDealers = data.valueOrNull?.topDealers ?? const <Dealer>[];
    final loading = data.isLoading && !data.hasValue;

    final query = _searchController.text.toLowerCase();
    final feed = cars
        .where((c) => c.make.toLowerCase().contains(query) || c.model.toLowerCase().contains(query))
        .toList();
    final featured = cars.where(isFeaturedCar).take(10).toList();

    return Scaffold(
      body: RefreshIndicator(
        color: AppColors.emeraldAccent,
        onRefresh: () => ref.refresh(homeDataProvider.future),
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: WebColumn(
            child: Stack(
              children: [
                const Positioned(top: 0, left: 0, right: 0, height: _heroHeight, child: _HeroBackground()),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    SizedBox(
                      height: _heroHeight - _heroOverlap,
                      child: _HeroContent(
                        strings: strings,
                        controller: _searchController,
                        onSearch: _search,
                        onToggleLanguage: () => ref.read(languageProvider.notifier).toggle(),
                        onSmartAi: () => context.push('/ai-search'),
                      ),
                    ),
                    _SectionCard(
                      title: Text(strings.topDealers, style: _sectionTitle),
                      viewAll: strings.viewAll,
                      onViewAll: () => context.push('/dealers'),
                      children: loading
                          ? const [WebSkeleton(width: 256, height: 192), WebSkeleton(width: 256, height: 192)]
                          : [
                              for (final dealer in topDealers)
                                DealerCardWidget(
                                  dealer: dealer,
                                  strings: strings,
                                  onTap: () => context.push('/dealer/${dealer.id}'),
                                ),
                            ],
                    ),
                    const SizedBox(height: 24),
                    // Mobile: an empty "Featured" card is just a blank box, so
                    // the section only appears when a car qualifies.
                    if (loading || featured.isNotEmpty) ...[
                    _SectionCard(
                      title: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Text('🔥', style: TextStyle(fontSize: 20)),
                          const SizedBox(width: 8),
                          Text(strings.featuredCars, style: _sectionTitle),
                        ],
                      ),
                      viewAll: strings.viewAll,
                      onViewAll: () => context.push('/featured-cars'),
                      children: loading
                          ? const [WebSkeleton(width: 192, height: 256), WebSkeleton(width: 192, height: 256)]
                          : [
                              for (final car in featured)
                                SizedBox(
                                  width: 192,
                                  child: CarCardWidget(
                                    car: car,
                                    strings: strings,
                                    variant: CarCardVariant.grid,
                                    isFavorite: favorites.contains(car.id),
                                    onTap: () => context.push('/car/${car.id}'),
                                    onFavoriteToggle: () => _toggleFavorite(car),
                                  ),
                                ),
                            ],
                    ),
                    const SizedBox(height: 24),
                    ],
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 8),
                            child: Row(
                              children: [
                                Container(
                                  width: 4,
                                  height: 24,
                                  decoration: BoxDecoration(
                                    color: AppColors.emeraldAccent,
                                    borderRadius: BorderRadius.circular(999),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Expanded(child: Text(strings.findDreamRide, style: _sectionTitle)),
                              ],
                            ),
                          ),
                          const SizedBox(height: 24),
                          if (loading)
                            for (var i = 0; i < 3; i++)
                              const Padding(
                                padding: EdgeInsets.only(bottom: 24),
                                child: WebSkeleton(height: 400, radius: 24),
                              )
                          else if (data.hasError && !data.hasValue)
                            _LoadError(onRetry: () => ref.invalidate(homeDataProvider))
                          else
                            for (final car in feed)
                              Padding(
                                // `space-y-6` between cards, on top of the card's own `mb-4`.
                                padding: const EdgeInsets.only(bottom: 8),
                                child: CarCardWidget(
                                  car: car,
                                  strings: strings,
                                  isFavorite: favorites.contains(car.id),
                                  onTap: () => context.push('/car/${car.id}'),
                                  onFavoriteToggle: () => _toggleFavorite(car),
                                ),
                              ),
                        ],
                      ),
                    ),
                    _Footer(strings: strings),
                    // `pb-24`: room for the fixed bottom navigation on the site.
                    const SizedBox(height: 24),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

const _sectionTitle = TextStyle(fontSize: 20, height: 1.4, fontWeight: FontWeight.w900, color: AppColors.gray900);

class _HeroBackground extends StatelessWidget {
  const _HeroBackground();

  @override
  Widget build(BuildContext context) {
    return ClipRect(
      child: Stack(
        fit: StackFit.expand,
        children: [
          Transform.scale(scale: 1.05, child: Image.asset('assets/images/hero.jpg', fit: BoxFit.cover)),
          // `bg-gradient-to-b from-black/90 via-emerald-950/40 to-white`
          DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Colors.black.withValues(alpha: 0.9),
                  AppColors.emerald950.withValues(alpha: 0.4),
                  AppColors.white,
                ],
              ),
            ),
          ),
          ColoredBox(color: Colors.black.withValues(alpha: 0.2)),
        ],
      ),
    );
  }
}

class _HeroContent extends StatelessWidget {
  const _HeroContent({
    required this.strings,
    required this.controller,
    required this.onSearch,
    required this.onToggleLanguage,
    required this.onSmartAi,
  });

  final AppStrings strings;
  final TextEditingController controller;
  final VoidCallback onSearch;
  final VoidCallback onToggleLanguage;
  final VoidCallback onSmartAi;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 64, 24, 0),
      child: Column(
        children: [
          Row(
            children: [
              const SizedBox(width: 40),
              Expanded(
                child: FittedBox(
                  fit: BoxFit.scaleDown,
                  child: Text(
                    strings.appName,
                    style: const TextStyle(
                      color: AppColors.white,
                      fontSize: 48,
                      height: 1,
                      fontWeight: FontWeight.w900,
                      letterSpacing: -1.2,
                      shadows: [Shadow(color: Color(0xCC000000), blurRadius: 8, offset: Offset(0, 8))],
                    ),
                  ),
                ),
              ),
              GestureDetector(
                onTap: onToggleLanguage,
                child: Container(
                  width: 40,
                  height: 40,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.05),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
                  ),
                  child: Text(
                    // `t.switchLanguage === "English" ? "EN" : "AR"`
                    strings.switchLanguage == 'English' ? 'EN' : 'AR',
                    style: const TextStyle(color: AppColors.white, fontSize: 12, fontWeight: FontWeight.w700),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 48),
          Row(
            children: [
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.95),
                    borderRadius: BorderRadius.circular(999),
                    border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
                    boxShadow: const [BoxShadow(color: Color(0x4D000000), blurRadius: 50, offset: Offset(0, 20))],
                  ),
                  child: Row(
                    children: [
                      Material(
                        color: AppColors.emeraldDeep,
                        borderRadius: BorderRadius.circular(999),
                        elevation: 4,
                        child: InkWell(
                          borderRadius: BorderRadius.circular(999),
                          hoverColor: AppColors.emeraldHover,
                          onTap: onSearch,
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                            child: Text(
                              strings.search,
                              style: const TextStyle(color: AppColors.white, fontWeight: FontWeight.w700, fontSize: 14, height: 1.43),
                            ),
                          ),
                        ),
                      ),
                      Expanded(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          child: Row(
                            children: [
                              Expanded(
                                child: TextField(
                                  controller: controller,
                                  onSubmitted: (_) => onSearch(),
                                  textInputAction: TextInputAction.search,
                                  // `text-right` regardless of language.
                                  textAlign: TextAlign.right,
                                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: AppColors.gray900),
                                  decoration: InputDecoration(
                                    hintText: strings.searchPlaceholder,
                                    hintStyle: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: AppColors.gray400),
                                    border: InputBorder.none,
                                    enabledBorder: InputBorder.none,
                                    focusedBorder: InputBorder.none,
                                    filled: false,
                                    isDense: true,
                                    contentPadding: const EdgeInsets.symmetric(vertical: 16),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              const Icon(Icons.search, size: 20, color: AppColors.gray400),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 12),
              GestureDetector(
                onTap: onSmartAi,
                child: Container(
                  height: 56,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  decoration: BoxDecoration(
                    color: AppColors.emerald500,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.emerald500.withValues(alpha: 0.2),
                        blurRadius: 15,
                        offset: const Offset(0, 10),
                        spreadRadius: -3,
                      ),
                    ],
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.auto_awesome_outlined, size: 20, color: AppColors.white),
                      SizedBox(width: 8),
                      Text(
                        'سوق السيارات الذكي',
                        style: TextStyle(color: AppColors.white, fontWeight: FontWeight.w700, fontSize: 14),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// The white `rounded-[32px] p-6 shadow-xl` card with a title, a "view all"
/// link and a horizontally scrolling row (Top Dealers, Featured Cars).
class _SectionCard extends StatelessWidget {
  const _SectionCard({required this.title, required this.viewAll, required this.onViewAll, required this.children});

  final Widget title;
  final String viewAll;
  final VoidCallback onViewAll;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: AppColors.white,
          borderRadius: BorderRadius.circular(32),
          boxShadow: kShadowXl,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Expanded(child: Align(alignment: AlignmentDirectional.centerStart, child: title)),
                GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: onViewAll,
                  child: Text(
                    viewAll.toUpperCase(),
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.6,
                      color: AppColors.emeraldAccent,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  for (var i = 0; i < children.length; i++) ...[
                    if (i > 0) const SizedBox(width: 16),
                    children[i],
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Footer extends StatelessWidget {
  const _Footer({required this.strings});

  final AppStrings strings;

  @override
  Widget build(BuildContext context) {
    const link = TextStyle(color: AppColors.gray400, fontSize: 14, fontWeight: FontWeight.w700);
    return Container(
      margin: const EdgeInsets.only(top: 48),
      padding: const EdgeInsets.fromLTRB(24, 48, 24, 48),
      decoration: const BoxDecoration(border: Border(top: BorderSide(color: AppColors.gray100))),
      child: Column(
        children: [
          Text(
            strings.appName,
            style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900, letterSpacing: -0.6, color: AppColors.gray900),
          ),
          const SizedBox(height: 24),
          const Wrap(
            alignment: WrapAlignment.center,
            spacing: 32,
            runSpacing: 16,
            children: [
              Text('الشروط والأحكام', style: link),
              Text('سياسة الخصوصية', style: link),
              Text('تواصل معنا', style: link),
            ],
          ),
          const SizedBox(height: 40),
          Text(
            '© ${DateTime.now().year} ${strings.appName}. جميع الحقوق محفوظة.',
            textAlign: TextAlign.center,
            style: const TextStyle(color: AppColors.gray500, fontSize: 12, fontWeight: FontWeight.w500),
          ),
        ],
      ),
    );
  }
}

class _LoadError extends StatelessWidget {
  const _LoadError({required this.onRetry});

  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 48),
      child: Column(
        children: [
          const Icon(Icons.wifi_off_rounded, size: 32, color: AppColors.gray400),
          const SizedBox(height: 12),
          TextButton(onPressed: onRetry, child: const Icon(Icons.refresh_rounded, color: AppColors.emeraldAccent)),
        ],
      ),
    );
  }
}
