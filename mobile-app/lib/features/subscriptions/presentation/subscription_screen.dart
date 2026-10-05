import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/providers/language_provider.dart';
import '../../../shared/widgets/coming_soon_screen.dart';

/// TODO(subscriptions): mirrors src/screens/SubscriptionPlans.tsx —
/// GET /api/user/subscription, POST /api/subscription/promote. Currently
/// gated off site-wide by FeatureFlags.subscriptionsEnabled = false, so
/// this stays a placeholder until that flag flips on the backend too.
class SubscriptionScreen extends ConsumerWidget {
  const SubscriptionScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = ref.watch(stringsProvider);
    return ComingSoonScreen(title: 'Subscription', strings: strings, icon: Icons.workspace_premium_rounded);
  }
}
