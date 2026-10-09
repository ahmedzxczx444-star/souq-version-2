import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';
import '../../../shared/providers/auth_provider.dart';
import '../../../shared/providers/core_providers.dart';
import '../../../shared/providers/language_provider.dart';

/// Resolves the persisted session (TokenStorage) and the first-run flag
/// (AppPrefs) before deciding where to land, equivalent to src/App.tsx's
/// startup `useEffect` that reads `localStorage` for "user"/"token" before
/// rendering a screen.
class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _resolve());
  }

  Future<void> _resolve() async {
    await ref.read(authProvider.future);
    if (!mounted) return;

    final hasSeenOnboarding = ref.read(appPrefsProvider).hasSeenOnboarding;
    if (!hasSeenOnboarding) {
      context.go('/onboarding');
      return;
    }

    // Listings are public (as on the website): signed-out users land on
    // Home too, and are asked to sign in only for favorites and the profile.
    context.go('/home');
  }

  @override
  Widget build(BuildContext context) {
    final strings = ref.watch(stringsProvider);
    return Scaffold(
      backgroundColor: AppColors.black,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              strings.appName,
              style: const TextStyle(
                color: AppColors.white,
                fontSize: 32,
                fontWeight: FontWeight.w900,
                letterSpacing: -0.5,
              ),
            ),
            const SizedBox(height: 24),
            const CircularProgressIndicator(color: AppColors.emerald500, strokeWidth: 2.5),
          ],
        ),
      ),
    );
  }
}
