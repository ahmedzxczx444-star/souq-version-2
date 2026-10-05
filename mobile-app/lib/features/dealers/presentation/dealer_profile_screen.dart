import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/providers/language_provider.dart';
import '../../../shared/widgets/coming_soon_screen.dart';

/// TODO(dealer-profile): mirrors src/screens/DealerScreen.tsx — dealer
/// header (logo/rating/branches), inventory grid (GET /api/dealers/:id),
/// follow toggle (POST /api/dealers/:id/follow), and reels strip.
class DealerProfileScreen extends ConsumerWidget {
  const DealerProfileScreen({super.key, required this.dealerId});

  final int dealerId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = ref.watch(stringsProvider);
    return ComingSoonScreen(title: 'Dealer #$dealerId', strings: strings, icon: Icons.storefront_rounded);
  }
}
