import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../core/l10n/app_strings.dart';
import '../../core/network/image_urls.dart';
import '../../core/theme/app_colors.dart';
import '../models/dealer.dart';

/// Mirrors src/components/DealerCard.tsx's `image-top` variant — the only
/// one the site's Home ("Top Dealers" strip) and All Dealers screens use:
/// a fixed 240px card with the logo as a 112px cover image.
class DealerCardWidget extends StatelessWidget {
  const DealerCardWidget({super.key, required this.dealer, required this.onTap, required this.strings});

  final Dealer dealer;
  final VoidCallback onTap;
  final AppStrings strings;

  static const double width = 240;

  @override
  Widget build(BuildContext context) {
    final logo = displayImageUrl(dealer.logo);

    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: width,
        decoration: BoxDecoration(
          color: AppColors.white,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: AppColors.gray100),
          boxShadow: const [BoxShadow(color: Color(0x0D000000), blurRadius: 2, offset: Offset(0, 1))],
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              height: 112,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  if (logo != null)
                    CachedNetworkImage(
                      imageUrl: logo,
                      fit: BoxFit.cover,
                      placeholder: (_, __) => Container(color: AppColors.gray100),
                      errorWidget: (_, __, ___) => Container(color: AppColors.gray100),
                    )
                  else
                    Container(color: AppColors.gray100),
                  PositionedDirectional(
                    top: 8,
                    start: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppColors.emeraldAccent,
                        borderRadius: BorderRadius.circular(8),
                        boxShadow: const [BoxShadow(color: Color(0x1A000000), blurRadius: 6, offset: Offset(0, 4))],
                      ),
                      child: const Icon(Icons.verified_user_outlined, size: 10, color: AppColors.white),
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          dealer.name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: AppColors.gray900),
                        ),
                      ),
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppColors.emeraldAccent.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Text(
                          'مصر حصري',
                          style: TextStyle(fontSize: 7, fontWeight: FontWeight.w700, color: AppColors.emeraldAccent),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  DefaultTextStyle.merge(
                    style: const TextStyle(fontSize: 8, fontWeight: FontWeight.w700, color: AppColors.gray400),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Row(
                                children: [
                                  const Icon(Icons.directions_car_outlined, size: 9, color: AppColors.gray300),
                                  const SizedBox(width: 4),
                                  Flexible(
                                    child: Text('${dealer.carCount ?? 0} ${strings.carsCount}', maxLines: 1),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 4),
                            Expanded(
                              child: Text(
                                '${dealer.reviewsCount} ${strings.reviews}',
                                maxLines: 1,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Container(
                          padding: const EdgeInsets.only(top: 6),
                          decoration: const BoxDecoration(border: Border(top: BorderSide(color: AppColors.gray50))),
                          child: Row(
                            children: [
                              const Icon(Icons.location_on_outlined, size: 9, color: AppColors.emeraldAccent),
                              const SizedBox(width: 4),
                              Expanded(
                                child: Text(dealer.location ?? '', maxLines: 1, overflow: TextOverflow.ellipsis),
                              ),
                            ],
                          ),
                        ),
                      ],
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
