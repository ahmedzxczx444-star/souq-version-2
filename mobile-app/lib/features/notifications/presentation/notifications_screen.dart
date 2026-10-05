import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/providers/language_provider.dart';
import '../../../shared/widgets/coming_soon_screen.dart';

/// TODO(notifications): mirrors src/screens/NotificationsScreen.tsx —
/// GET /api/notifications, PUT /api/notifications/:id/read (both auth).
/// Push delivery (FCM) is a separate, later step — this is just the
/// in-app list backed by the existing DB-stored notifications.
class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = ref.watch(stringsProvider);
    return ComingSoonScreen(title: 'Notifications', strings: strings, icon: Icons.notifications_none_rounded);
  }
}
