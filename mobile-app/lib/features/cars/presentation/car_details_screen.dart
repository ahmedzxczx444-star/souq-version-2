import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/utils/phone_utils.dart';
import '../../../shared/providers/auth_provider.dart';
import '../../../shared/providers/core_providers.dart';
import '../../../shared/providers/favorites_provider.dart';
import '../../../shared/providers/language_provider.dart';
import '../../../shared/models/car.dart';
import '../../../shared/widgets/web_layout.dart';

final _carDetailsProvider = FutureProvider.autoDispose.family((ref, int id) {
  return ref.watch(carRepositoryProvider).getById(id);
});

/// Mirrors src/screens/DetailsScreen.tsx: image carousel, spec grid
/// (year/mileage/fuel/transmission), description, dealer strip, and a
/// fixed bottom action bar with WhatsApp + call — same
/// `toWhatsappLink`/`tel:` logic as phoneUtils.ts.
class CarDetailsScreen extends ConsumerStatefulWidget {
  const CarDetailsScreen({super.key, required this.carId});

  final int carId;

  @override
  ConsumerState<CarDetailsScreen> createState() => _CarDetailsScreenState();
}

class _CarDetailsScreenState extends ConsumerState<CarDetailsScreen> {
  int _activeImage = 0;
  static final _priceFormat = NumberFormat.decimalPattern();

  @override
  Widget build(BuildContext context) {
    final strings = ref.watch(stringsProvider);
    final carAsync = ref.watch(_carDetailsProvider(widget.carId));
    final favorites = ref.watch(favoritesProvider).valueOrNull ?? <int>{};
    final isFavorite = favorites.contains(widget.carId);

    return Scaffold(
      body: WebColumn(
        child: carAsync.when(
        loading: () => const Center(child: CircularProgressIndicator(color: AppColors.emeraldAccent)),
        error: (e, _) => Center(child: Text('$e')),
        data: (car) {
          final whatsappLink = toWhatsappLink(car.dealerWhatsapp);
          return Stack(
            children: [
              ListView(
                padding: EdgeInsets.zero,
                children: [
                  Stack(
                    children: [
                      AspectRatio(
                        aspectRatio: 4 / 3,
                        child: car.images.isEmpty
                            ? Container(color: AppColors.gray100, child: const Icon(Icons.directions_car, size: 48, color: AppColors.gray400))
                            : CachedNetworkImage(imageUrl: car.imageUrls[_activeImage], httpHeaders: carImageHeaders, fit: BoxFit.cover),
                      ),
                      Positioned(
                        top: 40,
                        left: 16,
                        right: 16,
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            _GlassIconButton(icon: Icons.arrow_back_rounded, onTap: () => context.pop()),
                            Row(children: [
                              _GlassIconButton(
                                icon: isFavorite ? Icons.favorite : Icons.favorite_border,
                                color: isFavorite ? AppColors.red500 : AppColors.white,
                                onTap: () {
                                  if (ref.read(authProvider).valueOrNull == null) {
                                    context.push('/login');
                                    return;
                                  }
                                  ref.read(favoritesProvider.notifier).toggle(car.id);
                                },
                              ),
                            ]),
                          ],
                        ),
                      ),
                      if (car.images.length > 1)
                        Positioned(
                          bottom: 16,
                          left: 0,
                          right: 0,
                          child: SizedBox(
                            height: 48,
                            child: ListView.separated(
                              scrollDirection: Axis.horizontal,
                              padding: const EdgeInsets.symmetric(horizontal: 16),
                              itemCount: car.images.length,
                              separatorBuilder: (_, __) => const SizedBox(width: 8),
                              itemBuilder: (context, i) => GestureDetector(
                                onTap: () => setState(() => _activeImage = i),
                                child: Container(
                                  width: 48,
                                  height: 48,
                                  decoration: BoxDecoration(
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(
                                      color: _activeImage == i ? AppColors.white : Colors.transparent,
                                      width: 2,
                                    ),
                                  ),
                                  clipBehavior: Clip.antiAlias,
                                  child: CachedNetworkImage(imageUrl: car.imageUrls[i], httpHeaders: carImageHeaders, fit: BoxFit.cover),
                                ),
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                  Container(
                    transform: Matrix4.translationValues(0, -24, 0),
                    decoration: const BoxDecoration(
                      color: AppColors.white,
                      borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
                    ),
                    padding: const EdgeInsets.fromLTRB(24, 32, 24, 120),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(car.title, style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w900)),
                                  const SizedBox(height: 6),
                                  Row(children: [
                                    const Icon(Icons.location_on_outlined, size: 14, color: AppColors.gray500),
                                    const SizedBox(width: 4),
                                    Text(car.effectiveLocation, style: const TextStyle(color: AppColors.gray500, fontSize: 13)),
                                  ]),
                                ],
                              ),
                            ),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Text('${_priceFormat.format(car.price)} ج.م',
                                    style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900)),
                                Text(strings.fixedPrice, style: const TextStyle(fontSize: 10, color: AppColors.gray400, fontWeight: FontWeight.w700)),
                              ],
                            ),
                          ],
                        ),
                        const SizedBox(height: 24),
                        Row(
                          children: [
                            _Spec(icon: Icons.calendar_today_outlined, label: strings.year, value: '${car.year}'),
                            _Spec(icon: Icons.speed_rounded, label: strings.mileage, value: '${_priceFormat.format(car.mileage)}'),
                            _Spec(icon: Icons.local_gas_station_outlined, label: strings.fuel, value: car.fuelType),
                            _Spec(icon: Icons.settings_outlined, label: strings.trans, value: car.transmission),
                          ],
                        ),
                        const SizedBox(height: 24),
                        Text(strings.description, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                        const SizedBox(height: 8),
                        Text(car.description, style: const TextStyle(color: AppColors.gray500, height: 1.5)),
                        const SizedBox(height: 24),
                        GestureDetector(
                          onTap: () => context.push('/dealer/${car.dealerId}'),
                          child: Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(color: AppColors.darkCard, borderRadius: BorderRadius.circular(24)),
                            child: Row(
                              children: [
                                CircleAvatar(
                                  radius: 22,
                                  backgroundColor: Colors.white10,
                                  backgroundImage:
                                      car.dealerLogoImage != null ? CachedNetworkImageProvider(car.dealerLogoImage!) : null,
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(car.dealerName ?? '', style: const TextStyle(color: AppColors.white, fontWeight: FontWeight.w800)),
                                      Text(strings.officialDealer, style: const TextStyle(color: AppColors.gray400, fontSize: 11)),
                                    ],
                                  ),
                                ),
                                const Icon(Icons.chevron_right_rounded, color: AppColors.white),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              Positioned(
                left: 0,
                right: 0,
                bottom: 0,
                child: Container(
                  padding: const EdgeInsets.fromLTRB(24, 16, 24, 24),
                  decoration: const BoxDecoration(
                    color: AppColors.white,
                    border: Border(top: BorderSide(color: AppColors.gray100)),
                  ),
                  child: Row(
                    children: [
                      if (whatsappLink != null)
                        Expanded(
                          child: _ActionButton(
                            icon: Icons.chat_bubble_rounded,
                            label: 'واتساب',
                            color: AppColors.emerald500,
                            onTap: () => launchUrl(Uri.parse(whatsappLink), mode: LaunchMode.externalApplication),
                          ),
                        ),
                      if (whatsappLink != null) const SizedBox(width: 12),
                      Expanded(
                        child: _ActionButton(
                          icon: Icons.call_rounded,
                          label: strings.contact,
                          color: AppColors.black,
                          onTap: () => launchUrl(Uri.parse('tel:${car.dealerPhone ?? ''}')),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          );
        },
      ),
      ),
    );
  }
}

class _Spec extends StatelessWidget {
  const _Spec({required this.icon, required this.label, required this.value});

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 4),
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(color: AppColors.gray50, borderRadius: BorderRadius.circular(16)),
        child: Column(
          children: [
            Icon(icon, size: 18, color: AppColors.gray400),
            const SizedBox(height: 6),
            Text(label, style: const TextStyle(fontSize: 9, color: AppColors.gray400, fontWeight: FontWeight.w700)),
            const SizedBox(height: 2),
            Text(value, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800)),
          ],
        ),
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  const _ActionButton({required this.icon, required this.label, required this.color, required this.onTap});

  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: color,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 16),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, color: AppColors.white, size: 18),
              const SizedBox(width: 8),
              Text(label, style: const TextStyle(color: AppColors.white, fontWeight: FontWeight.w800)),
            ],
          ),
        ),
      ),
    );
  }
}

class _GlassIconButton extends StatelessWidget {
  const _GlassIconButton({required this.icon, required this.onTap, this.color = AppColors.white});

  final IconData icon;
  final VoidCallback onTap;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(color: Colors.black26, borderRadius: BorderRadius.circular(16)),
        child: Icon(icon, color: color, size: 20),
      ),
    );
  }
}
