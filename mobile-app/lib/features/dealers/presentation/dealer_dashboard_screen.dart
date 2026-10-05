import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/providers/language_provider.dart';
import '../../../shared/widgets/coming_soon_screen.dart';

/// TODO(dealer-dashboard): mirrors src/screens/DealerDashboard.tsx —
/// GET /api/dealer/cars, GET /api/dealer/stats, edit/delete/promote per
/// car, plus the profile-editing tab (PUT /api/dealer/profile).
class DealerDashboardScreen extends ConsumerWidget {
  const DealerDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = ref.watch(stringsProvider);
    return ComingSoonScreen(title: strings.dealerRole, strings: strings, icon: Icons.dashboard_rounded);
  }
}
