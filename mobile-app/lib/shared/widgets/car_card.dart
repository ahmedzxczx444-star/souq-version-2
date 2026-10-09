import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart' show NumberFormat;
import 'package:url_launcher/url_launcher.dart';

import '../../core/l10n/app_strings.dart';
import '../../core/network/api_endpoints.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/relative_time.dart';
import '../models/car.dart';
import 'car_image_carousel.dart';

enum CarCardVariant { feed, grid }

/// The feed post and compact grid tile, in the visual language of
/// src/components/CarCard.tsx (same colours, type scale, badges and copy).
///
/// The feed post goes further than the site for mobile use: all of the
/// listing's photos swipe in place ([CarImageCarousel]), tap targets are
/// finger-sized, a specs line is shown, and the header shows the listing's
/// real age instead of the site's fixed "منذ ساعتين" placeholder. A missing
/// dealer name or location is left out rather than filled with stand-ins.
///
/// Not reproduced: the subscription-gated bits (promote button, "ترويج"
/// and verified-dealer chips) — the site hides them too while
/// `subscriptionsEnabled` is false.
class CarCardWidget extends StatelessWidget {
  const CarCardWidget({
    super.key,
    required this.car,
    required this.onTap,
    required this.isFavorite,
    required this.onFavoriteToggle,
    required this.strings,
    this.variant = CarCardVariant.feed,
  });

  final Car car;
  final VoidCallback onTap;
  final bool isFavorite;
  final VoidCallback onFavoriteToggle;
  final AppStrings strings;
  final CarCardVariant variant;

  // The site uses `toLocaleString()` (en-US grouping) and a fixed "ج.م".
  static final _number = NumberFormat.decimalPattern('en_US');

  Color get _statusColor {
    switch (car.status) {
      case 'sold':
        return AppColors.rose500;
      case 'reserved':
        return AppColors.amber500;
      default:
        return AppColors.emerald500;
    }
  }

  String get _location => car.effectiveLocation;

  String get _dealerName => car.dealerName ?? '';

  /// Location and listing age, whichever of the two are actually known.
  String get _subtitle {
    final age = relativeTime(car.createdAt, arabic: strings.isArabic);
    return [if (_location.isNotEmpty) _location, if (age != null) age].join(' • ');
  }

  /// Mileage, transmission and fuel exactly as the listing has them.
  String get _specs {
    final unit = strings.isArabic ? 'كم' : 'km';
    return [
      '${_number.format(car.mileage)} $unit',
      if (car.transmission.isNotEmpty) car.transmission,
      if (car.fuelType.isNotEmpty) car.fuelType,
    ].join(' • ');
  }

  /// CarCard.tsx `handleShare`'s non-Web-Share path: open WhatsApp with the
  /// same prefilled message.
  Future<void> _share() async {
    final carUrl = '${ApiConfig.baseUrl}/car/${car.id}';
    final text = 'السلام عليكم، أنا مهتم بسيارة ${car.make} ${car.model} ${car.year} موديل الموجودة على سوق السيارات.\n'
        'السعر: ${_number.format(car.price)} ج.م\n'
        'الرابط: $carUrl\n'
        'الصورة: ${car.coverImage}';
    await launchUrl(
      Uri.parse('https://wa.me/?text=${Uri.encodeComponent(text)}'),
      mode: LaunchMode.externalApplication,
    );
  }

  Widget _photo() {
    return CachedNetworkImage(
      imageUrl: car.coverImage,
      httpHeaders: carImageHeaders,
      fit: BoxFit.cover,
      placeholder: (_, __) => Container(color: AppColors.gray100),
      errorWidget: (_, __, ___) => Container(
        color: AppColors.gray100,
        child: const Icon(Icons.directions_car, color: AppColors.gray400),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return variant == CarCardVariant.grid ? _buildGrid(context) : _buildFeed(context);
  }

  // ---------------------------------------------------------------- feed
  Widget _buildFeed(BuildContext context) {
    final logo = car.dealerLogoImage;
    final description = car.description.length > 100 ? car.description.substring(0, 100) : car.description;

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.only(bottom: 16),
      decoration: const BoxDecoration(
        color: AppColors.white,
        border: Border(bottom: BorderSide(color: AppColors.gray100)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Post header
          Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                Container(
                  width: 32,
                  height: 32,
                  padding: const EdgeInsets.all(1.5),
                  decoration: const BoxDecoration(color: AppColors.gray100, shape: BoxShape.circle),
                  child: Container(
                    padding: const EdgeInsets.all(1),
                    decoration: const BoxDecoration(color: AppColors.white, shape: BoxShape.circle),
                    child: ClipOval(
                      child: Container(
                        color: AppColors.gray200,
                        alignment: Alignment.center,
                        child: logo != null
                            ? CachedNetworkImage(
                                imageUrl: logo,
                                fit: BoxFit.cover,
                                width: double.infinity,
                                height: double.infinity,
                                errorWidget: (_, __, ___) => _initial(),
                              )
                            : _initial(),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _dealerName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 12, height: 1, fontWeight: FontWeight.w900, color: AppColors.gray900),
                      ),
                      const SizedBox(height: 2),
                      if (_subtitle.isNotEmpty)
                        Text(
                          _subtitle,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: AppColors.gray400),
                        ),
                    ],
                  ),
                ),
                _Tap(
                  onTap: _share,
                  minSize: 40,
                  semanticLabel: 'Share',
                  child: const Icon(Icons.share_outlined, size: 18, color: AppColors.gray400),
                ),
              ],
            ),
          ),

          // Post photos: swipe in place; a tap opens the listing.
          CarImageCarousel(
            imageUrls: car.imageUrls,
            onTap: onTap,
            overlays: [
              PositionedDirectional(
                top: 12,
                start: 12,
                child: IgnorePointer(
                  child: _Pill(color: _statusColor, child: Text(strings.statusLabel(car.status))),
                ),
              ),
              if (car.featured)
                PositionedDirectional(
                  top: 48,
                  start: 12,
                  child: IgnorePointer(
                    child: _Pill(
                      color: AppColors.amber400,
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [const Text('🔥'), const SizedBox(width: 4), Text(strings.featured)],
                      ),
                    ),
                  ),
                ),
            ],
          ),

          // Post actions + content
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 2, 12, 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    // 44px touch targets, shifted so the icons still line up
                    // with the text below them.
                    Transform.translate(
                      offset: Offset(Directionality.of(context) == TextDirection.rtl ? 10 : -10, 0),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          _Tap(
                            onTap: onFavoriteToggle,
                            minSize: 44,
                            semanticLabel: isFavorite ? 'Remove from favorites' : 'Add to favorites',
                            child: Icon(
                              isFavorite ? Icons.favorite : Icons.favorite_border,
                              size: 24,
                              color: isFavorite ? AppColors.red500 : AppColors.gray900,
                            ),
                          ),
                          _Tap(
                            onTap: _share,
                            minSize: 44,
                            semanticLabel: 'Share',
                            child: const Icon(Icons.share_outlined, size: 24, color: AppColors.gray900),
                          ),
                        ],
                      ),
                    ),
                    const Spacer(),
                    Text(
                      '${_number.format(car.price)} ج.م',
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: AppColors.emeraldAccent),
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                Row(
                  children: [
                    if (_dealerName.isNotEmpty) ...[
                      Flexible(
                        child: Text(
                          _dealerName,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: AppColors.gray900),
                        ),
                      ),
                      const SizedBox(width: 8),
                    ],
                    Flexible(
                      child: Text(
                        '${car.make} ${car.model} ${car.year}',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.gray900),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    const Icon(Icons.speed, size: 12, color: AppColors.emeraldAccent),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        _specs,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.gray500),
                      ),
                    ),
                  ],
                ),
                if (description.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    car.description.length > 100 ? '$description...' : description,
                    style: const TextStyle(fontSize: 11, height: 1.625, color: AppColors.gray600),
                  ),
                ],
                _Tap(
                  onTap: onTap,
                  minSize: 36,
                  alignment: AlignmentDirectional.centerStart,
                  semanticLabel: 'View details',
                  child: Text(
                    strings.isArabic ? 'عرض المزيد من التفاصيل...' : 'View more details...',
                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.gray400),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _initial() => Text(
        car.make.isNotEmpty ? car.make[0] : '?',
        style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: AppColors.gray500),
      );

  // ---------------------------------------------------------------- grid
  Widget _buildGrid(BuildContext context) {
    final statusLabel = strings.statusLabel(car.status).toUpperCase();
    final (chipBg, chipFg) = switch (car.status) {
      'sold' => (AppColors.rose100, AppColors.rose600),
      'reserved' => (AppColors.amber100, AppColors.amber600),
      _ => (AppColors.emerald100, AppColors.emerald600),
    };

    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.gray100),
          boxShadow: const [BoxShadow(color: Color(0x0D000000), blurRadius: 2, offset: Offset(0, 1))],
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            AspectRatio(
              aspectRatio: 4 / 3,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  _photo(),
                  PositionedDirectional(
                    top: 6,
                    start: 6,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _Badge(
                          color: AppColors.emeraldAccent,
                          fontSize: 8,
                          horizontal: 8,
                          shadowBlur: 6,
                          child: Text(_number.format(car.price)),
                        ),
                        const SizedBox(height: 4),
                        _Badge(color: _statusColor, child: Text(statusLabel)),
                        if (car.featured) ...[
                          const SizedBox(height: 4),
                          _Badge(
                            color: AppColors.amber400,
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [const Text('🔥'), const SizedBox(width: 2), Text(strings.featured)],
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                  PositionedDirectional(
                    top: 6,
                    end: 6,
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        _Tap(
                          onTap: _share,
                          child: const Padding(
                            padding: EdgeInsets.all(6),
                            child: Icon(Icons.share_outlined, size: 14, color: AppColors.white, shadows: _iconShadow),
                          ),
                        ),
                        const SizedBox(width: 4),
                        _Tap(
                          onTap: onFavoriteToggle,
                          child: Padding(
                            padding: const EdgeInsets.all(6),
                            child: Icon(
                              isFavorite ? Icons.favorite : Icons.favorite_border,
                              size: 14,
                              color: isFavorite ? AppColors.red500 : AppColors.white,
                              shadows: _iconShadow,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${car.make} ${car.model}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 10, height: 1.25, fontWeight: FontWeight.w900, color: AppColors.gray900),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '${car.year} موديل',
                    style: const TextStyle(fontSize: 8, fontWeight: FontWeight.w700, color: AppColors.gray400),
                  ),
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.only(top: 6),
                    decoration: const BoxDecoration(border: Border(top: BorderSide(color: AppColors.gray50))),
                    child: DefaultTextStyle.merge(
                      style: const TextStyle(fontSize: 7, fontWeight: FontWeight.w700, color: AppColors.gray400),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.location_on_outlined, size: 8, color: AppColors.emeraldAccent),
                              const SizedBox(width: 4),
                              Expanded(child: Text(_location, maxLines: 1, overflow: TextOverflow.ellipsis)),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              const Icon(Icons.speed, size: 8, color: AppColors.emeraldAccent),
                              const SizedBox(width: 4),
                              Opacity(opacity: 0.7, child: Text('${_number.format(car.mileage)} كم')),
                              const Padding(
                                padding: EdgeInsets.symmetric(horizontal: 4),
                                child: Opacity(opacity: 0.2, child: Text('|')),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(color: chipBg, borderRadius: BorderRadius.circular(6)),
                                child: Text(
                                  statusLabel,
                                  style: TextStyle(fontSize: 6, fontWeight: FontWeight.w900, color: chipFg),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

const _iconShadow = [Shadow(color: Color(0x4D000000), blurRadius: 3, offset: Offset(0, 1))];

/// Rounded-full label on the feed photo (`text-[10px] font-black px-3 py-1`).
class _Pill extends StatelessWidget {
  const _Pill({required this.color, required this.child});

  final Color color;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(999),
        boxShadow: const [BoxShadow(color: Color(0x1A000000), blurRadius: 15, offset: Offset(0, 10), spreadRadius: -3)],
      ),
      child: DefaultTextStyle.merge(
        style: const TextStyle(color: AppColors.white, fontSize: 10, fontWeight: FontWeight.w900),
        child: child,
      ),
    );
  }
}

/// Small rounded-md badge on the grid photo (`text-[7px] px-1.5 py-0.5`).
class _Badge extends StatelessWidget {
  const _Badge({
    required this.color,
    required this.child,
    this.fontSize = 7,
    this.horizontal = 6,
    this.shadowBlur = 2,
  });

  final Color color;
  final Widget child;
  final double fontSize;
  final double horizontal;
  final double shadowBlur;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: horizontal, vertical: 2),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(6),
        boxShadow: [BoxShadow(color: const Color(0x1A000000), blurRadius: shadowBlur, offset: const Offset(0, 1))],
      ),
      child: DefaultTextStyle.merge(
        style: TextStyle(color: AppColors.white, fontSize: fontSize, fontWeight: FontWeight.w900),
        child: child,
      ),
    );
  }
}

/// A tappable area, optionally padded out to a comfortable [minSize].
class _Tap extends StatelessWidget {
  const _Tap({
    required this.onTap,
    required this.child,
    this.minSize = 0,
    this.semanticLabel,
    this.alignment = Alignment.center,
  });

  final VoidCallback onTap;
  final Widget child;
  final double minSize;
  final String? semanticLabel;
  final AlignmentGeometry alignment;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: semanticLabel,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onTap,
        child: ConstrainedBox(
          constraints: BoxConstraints(minWidth: minSize, minHeight: minSize),
          child: Align(alignment: alignment, widthFactor: 1, heightFactor: 1, child: child),
        ),
      ),
    );
  }
}
