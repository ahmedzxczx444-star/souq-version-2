import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';

/// Tailwind `max-w-md mx-auto`: the website lays its buyer screens out as a
/// 448px phone-width column centred in the window, whatever the window size.
const double kWebColumnWidth = 448;

class WebColumn extends StatelessWidget {
  const WebColumn({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.topCenter,
      child: ConstrainedBox(constraints: const BoxConstraints(maxWidth: kWebColumnWidth), child: child),
    );
  }
}

/// Tailwind `shadow-xl`.
const kShadowXl = [
  BoxShadow(color: Color(0x1A000000), blurRadius: 25, offset: Offset(0, 20), spreadRadius: -5),
  BoxShadow(color: Color(0x1A000000), blurRadius: 10, offset: Offset(0, 8), spreadRadius: -6),
];

/// The grey rounded back button the site's sub-screens open with
/// (`<ChevronLeft className="rtl:rotate-180" />` on `bg-gray-100`).
class WebBackButton extends StatelessWidget {
  const WebBackButton({super.key, required this.onTap, this.padding = 8, this.radius = 12});

  final VoidCallback onTap;
  final double padding;
  final double radius;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: EdgeInsets.all(padding),
        decoration: BoxDecoration(color: AppColors.gray100, borderRadius: BorderRadius.circular(radius)),
        // Mirrors itself in RTL, like the site's `rtl:rotate-180`.
        child: const Icon(Icons.chevron_left, size: 24, color: AppColors.gray900),
      ),
    );
  }
}

/// Title + count header shared by the Featured Cars and All Dealers screens.
class WebListHeader extends StatelessWidget {
  const WebListHeader({super.key, required this.title, required this.subtitle, required this.onBack});

  final String title;
  final String subtitle;
  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 32),
      child: Row(
        children: [
          WebBackButton(onTap: onBack),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 24,
                    height: 1.33,
                    fontWeight: FontWeight.w900,
                    letterSpacing: -1.2,
                    color: AppColors.gray900,
                  ),
                ),
                Text(
                  subtitle.toUpperCase(),
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.6,
                    color: AppColors.gray500,
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

/// `bg-gray-100 rounded-*` loading placeholder block.
class WebSkeleton extends StatelessWidget {
  const WebSkeleton({super.key, this.width, required this.height, this.radius = 16});

  final double? width;
  final double height;
  final double radius;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(color: AppColors.gray100, borderRadius: BorderRadius.circular(radius)),
    );
  }
}
