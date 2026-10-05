import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/providers/language_provider.dart';
import '../../../shared/widgets/coming_soon_screen.dart';

/// TODO(edit-profile): mirrors the dealer-profile tab of
/// src/screens/ProfileScreen.tsx / DealerDashboard.tsx —
/// GET+PUT /api/dealer/profile for dealers; plain users have no editable
/// profile fields beyond password (see settings_screen.dart).
class EditProfileScreen extends ConsumerWidget {
  const EditProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = ref.watch(stringsProvider);
    return ComingSoonScreen(title: 'Edit Profile', strings: strings, icon: Icons.person_outline_rounded);
  }
}
