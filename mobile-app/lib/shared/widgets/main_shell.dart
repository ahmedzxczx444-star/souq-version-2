import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_colors.dart';
import '../providers/language_provider.dart';

/// Mirrors src/components/BottomNav.tsx: 4 tabs (home/reels/favorites/
/// profile), active tab in black with a small dot indicator, inactive in
/// gray. Built on StatefulShellRoute.indexedStack so each tab keeps its own
/// navigation/scroll state, same as the site's `AnimatePresence`-wrapped
/// screen switch keeping component state per tab.
class MainShell extends ConsumerWidget {
  const MainShell({super.key, required this.navigationShell});

  final StatefulNavigationShell navigationShell;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = ref.watch(stringsProvider);
    final tabs = [
      (icon: Icons.home_rounded, label: strings.home),
      (icon: Icons.play_circle_outline_rounded, label: strings.reels),
      (icon: Icons.favorite_border_rounded, label: strings.favorites),
      (icon: Icons.person_outline_rounded, label: strings.profile),
    ];

    return Scaffold(
      body: navigationShell,
      bottomNavigationBar: DecoratedBox(
        decoration: const BoxDecoration(
          color: AppColors.white,
          border: Border(top: BorderSide(color: AppColors.gray100)),
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: List.generate(tabs.length, (index) {
                final isActive = navigationShell.currentIndex == index;
                final tab = tabs[index];
                return GestureDetector(
                  onTap: () => navigationShell.goBranch(
                    index,
                    initialLocation: index == navigationShell.currentIndex,
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        tab.icon,
                        size: 24,
                        color: isActive ? AppColors.black : AppColors.gray400,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        tab.label,
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                          color: isActive ? AppColors.black : AppColors.gray400,
                        ),
                      ),
                    ],
                  ),
                );
              }),
            ),
          ),
        ),
      ),
    );
  }
}
