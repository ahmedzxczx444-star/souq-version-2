import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/providers/language_provider.dart';
import '../../../shared/widgets/coming_soon_screen.dart';

/// TODO(settings): mirrors src/screens/SettingsScreen.tsx (language
/// toggle — already live via languageProvider, just needs a UI here) and
/// src/screens/PrivacySecurityScreen.tsx (change password: POST
/// /api/auth/change-password, logout-all: POST /api/auth/logout-all).
class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = ref.watch(stringsProvider);
    return ComingSoonScreen(title: 'Settings', strings: strings, icon: Icons.settings_outlined);
  }
}
