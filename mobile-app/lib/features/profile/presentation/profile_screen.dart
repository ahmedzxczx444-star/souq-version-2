import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';
import '../../../shared/models/user.dart';
import '../../../shared/providers/auth_provider.dart';
import '../../../shared/providers/language_provider.dart';

/// Mirrors src/screens/ProfileScreen.tsx's account menu. Only the
/// account-info header, logout, and links that route to Phase-1 screens
/// are wired for real; everything else (My Listings, dealer-category
/// dashboards, settings, notifications, subscription) routes to a
/// ComingSoonScreen placeholder until its own feature pass — see
/// core/router/app_router.dart for the full route list.
class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = ref.watch(stringsProvider);
    final user = ref.watch(authProvider).valueOrNull;

    if (user == null) {
      // Router guard should prevent this, but keep behavior sane if reached directly.
      WidgetsBinding.instance.addPostFrameCallback((_) => context.go('/login'));
      return const SizedBox.shrink();
    }

    return Scaffold(
      appBar: AppBar(title: Text(strings.profile)),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(color: AppColors.gray50, borderRadius: BorderRadius.circular(24)),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 28,
                  backgroundColor: AppColors.black,
                  child: Text(
                    user.name.isNotEmpty ? user.name[0].toUpperCase() : '?',
                    style: const TextStyle(color: AppColors.white, fontWeight: FontWeight.w900, fontSize: 20),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(user.name, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
                      Text(user.email, style: const TextStyle(color: AppColors.gray500, fontSize: 12)),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          if (user.isDealer)
            _MenuTile(icon: Icons.dashboard_rounded, label: strings.appName, onTap: () => context.push('/dealer-dashboard')),
          _MenuTile(icon: Icons.edit_rounded, label: 'Edit Profile', onTap: () => context.push('/edit-profile')),
          _MenuTile(icon: Icons.notifications_none_rounded, label: 'Notifications', onTap: () => context.push('/notifications')),
          _MenuTile(icon: Icons.settings_outlined, label: 'Settings', onTap: () => context.push('/settings')),
          const SizedBox(height: 12),
          _MenuTile(
            icon: Icons.logout_rounded,
            label: strings.logout,
            color: AppColors.red500,
            onTap: () async {
              await ref.read(authProvider.notifier).logout();
              if (context.mounted) context.go('/login');
            },
          ),
        ],
      ),
    );
  }
}

class _MenuTile extends StatelessWidget {
  const _MenuTile({required this.icon, required this.label, required this.onTap, this.color = AppColors.gray900});

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: Icon(icon, color: color),
      title: Text(label, style: TextStyle(color: color, fontWeight: FontWeight.w700)),
      trailing: const Icon(Icons.chevron_right_rounded, color: AppColors.gray400),
      onTap: onTap,
    );
  }
}
