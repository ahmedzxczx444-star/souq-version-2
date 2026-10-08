import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../core/l10n/app_strings.dart';
import '../../core/theme/app_colors.dart';
import '../models/car.dart';

enum CarCardVariant { feed, grid }

/// Mirrors src/components/CarCard.tsx: emerald price pill, status badge,
/// dealer avatar/name row, heart + share actions. Only the `feed` (main
/// listing) and `grid` (2-column) variants are implemented — the web
/// component's `compact` variant isn't used by any Phase-1 screen yet.
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

  static final _priceFormat = NumberFormat.decimalPattern();

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

  @override
  Widget build(BuildContext context) {
    return variant == CarCardVariant.grid ? _buildGrid(context) : _buildFeed(context);
  }

  Widget _buildFeed(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 16),
        decoration: const BoxDecoration(
          border: Border(bottom: BorderSide(color: AppColors.gray100)),
        ),
        padding: const EdgeInsets.only(bottom: 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 16,
                    backgroundColor: AppColors.gray100,
                    backgroundImage: car.dealerLogoImage != null
                        ? CachedNetworkImageProvider(car.dealerLogoImage!)
                        : null,
                    child: car.dealerLogo == null || car.dealerLogo!.isEmpty
                        ? Text(car.make.isNotEmpty ? car.make[0] : '?',
                            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900))
                        : null,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          car.dealerName ?? '',
                          style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 12),
                          overflow: TextOverflow.ellipsis,
                        ),
                        Text(
                          car.effectiveLocation,
                          style: const TextStyle(fontSize: 10, color: AppColors.gray400, fontWeight: FontWeight.w700),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            AspectRatio(
              aspectRatio: 1,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  CachedNetworkImage(
                    imageUrl: car.coverImage,
                    httpHeaders: carImageHeaders,
                    fit: BoxFit.cover,
                    placeholder: (_, __) => Container(color: AppColors.gray100),
                    errorWidget: (_, __, ___) => Container(
                      color: AppColors.gray100,
                      child: const Icon(Icons.directions_car, color: AppColors.gray400),
                    ),
                  ),
                  Positioned(
                    top: 12,
                    left: 12,
                    child: _StatusBadge(color: _statusColor, label: strings.statusLabel(car.status)),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          '${car.make} ${car.model} ${car.year}',
                          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      Text(
                        '${_priceFormat.format(car.price)} ${strings == AppStrings.ar ? 'ج.م' : 'EGP'}',
                        style: const TextStyle(
                          fontWeight: FontWeight.w900,
                          fontSize: 13,
                          color: AppColors.emeraldAccent,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      _ActionIcon(
                        icon: isFavorite ? Icons.favorite : Icons.favorite_border,
                        color: isFavorite ? AppColors.red500 : AppColors.gray900,
                        onTap: onFavoriteToggle,
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildGrid(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.gray100),
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            AspectRatio(
              aspectRatio: 4 / 3,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  CachedNetworkImage(
                    imageUrl: car.coverImage,
                    httpHeaders: carImageHeaders,
                    fit: BoxFit.cover,
                    placeholder: (_, __) => Container(color: AppColors.gray100),
                    errorWidget: (_, __, ___) => Container(
                      color: AppColors.gray100,
                      child: const Icon(Icons.directions_car, color: AppColors.gray400),
                    ),
                  ),
                  Positioned(
                    top: 6,
                    left: 6,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: AppColors.emeraldAccent,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        _priceFormat.format(car.price),
                        style: const TextStyle(color: AppColors.white, fontSize: 9, fontWeight: FontWeight.w900),
                      ),
                    ),
                  ),
                  Positioned(
                    top: 6,
                    right: 6,
                    child: GestureDetector(
                      onTap: onFavoriteToggle,
                      child: Icon(
                        isFavorite ? Icons.favorite : Icons.favorite_border,
                        color: isFavorite ? AppColors.red500 : AppColors.white,
                        size: 18,
                      ),
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
                    style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 11),
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '${car.year}',
                    style: const TextStyle(fontSize: 9, color: AppColors.gray400, fontWeight: FontWeight.w700),
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

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.color, required this.label});

  final Color color;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(20)),
      child: Text(
        label,
        style: const TextStyle(color: AppColors.white, fontSize: 9, fontWeight: FontWeight.w900),
      ),
    );
  }
}

class _ActionIcon extends StatelessWidget {
  const _ActionIcon({required this.icon, required this.color, required this.onTap});

  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.only(right: 12),
        child: Icon(icon, color: color, size: 22),
      ),
    );
  }
}
