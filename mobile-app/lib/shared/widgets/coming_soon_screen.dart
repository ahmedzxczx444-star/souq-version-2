import 'package:flutter/material.dart';

import '../../core/l10n/app_strings.dart';
import '../../core/theme/app_colors.dart';

/// Shared body for every Phase-2 placeholder screen (dealer profile/
/// categories, parts marketplace, AI chat, compare, notifications,
/// settings, add car/part, edit profile, dealer dashboard, subscriptions).
/// Each route wraps this with its own Scaffold/AppBar title and a
/// `sourceScreen`/`endpoints` doc-comment — see lib/features/*/presentation
/// for the per-feature TODOs.
class ComingSoonScreen extends StatelessWidget {
  const ComingSoonScreen({
    super.key,
    required this.title,
    required this.strings,
    this.icon = Icons.construction_rounded,
  });

  final String title;
  final AppStrings strings;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  color: AppColors.gray50,
                  borderRadius: BorderRadius.circular(32),
                ),
                child: Icon(icon, size: 36, color: AppColors.gray400),
              ),
              const SizedBox(height: 24),
              Text(
                strings.comingSoon,
                style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 20),
              ),
              const SizedBox(height: 8),
              Text(
                strings.comingSoonBody,
                textAlign: TextAlign.center,
                style: const TextStyle(color: AppColors.gray400, fontWeight: FontWeight.w600),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
