import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/providers/language_provider.dart';
import '../../../shared/widgets/coming_soon_screen.dart';

/// TODO(parts-marketplace): mirrors src/screens/PartsDashboard.tsx +
/// PartDetailsScreen.tsx — GET /api/parts/search/query (public browse),
/// GET /api/parts/:id, image/barcode/part-number AI lookups (routes/parts.ts),
/// gated by FeatureFlags.partsMarketplaceEnabled.
class PartsMarketplaceScreen extends ConsumerWidget {
  const PartsMarketplaceScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = ref.watch(stringsProvider);
    return ComingSoonScreen(title: 'Auto Parts', strings: strings, icon: Icons.settings_suggest_rounded);
  }
}
