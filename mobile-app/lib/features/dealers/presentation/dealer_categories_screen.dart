import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/providers/language_provider.dart';
import '../../../shared/widgets/coming_soon_screen.dart';

/// TODO(dealer-categories): mirrors src/screens/MultiBranchDashboard.tsx,
/// ChainDashboard.tsx, ImporterDashboard.tsx, OfficialAgentDashboard.tsx —
/// which sub-dashboard to show is resolved from the dealer's
/// `dealer_category` (see routes/dealerCategory.ts, routes/importer.ts,
/// routes/officialAgent.ts), gated by FeatureFlags.dealerCategoriesEnabled.
class DealerCategoriesScreen extends ConsumerWidget {
  const DealerCategoriesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = ref.watch(stringsProvider);
    return ComingSoonScreen(title: 'Dealer Categories', strings: strings, icon: Icons.apartment_rounded);
  }
}
