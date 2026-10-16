import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/l10n/app_strings.dart';
import '../../../core/l10n/market_strings.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/relative_time.dart';
import '../../../shared/providers/core_providers.dart';
import '../../../shared/providers/language_provider.dart';
import '../../../shared/widgets/web_layout.dart';
import '../../dealers/presentation/manage/dealer_widgets.dart' show EmptyView, ErrorView, LoadingView, errorMessage;
import '../../parts/data/market_repository.dart';

/// In-app notifications (src/screens/NotificationsScreen.tsx):
/// GET /api/notifications, newest first; opening one marks it read with
/// PUT /api/notifications/:id/read. Push notifications are not part of the
/// backend, so nothing arrives while the app is closed.
class NotificationsNotifier extends AutoDisposeAsyncNotifier<List<AppNotification>> {
  @override
  Future<List<AppNotification>> build() => ref.watch(marketRepositoryProvider).notifications();

  Future<void> markRead(int id) async {
    final current = state.valueOrNull;
    if (current == null || !current.any((n) => n.id == id && !n.isRead)) return;
    state = AsyncData([for (final n in current) n.id == id ? n.read() : n]);
    try {
      await ref.read(marketRepositoryProvider).markRead(id);
    } catch (_) {
      state = AsyncData(current);
    }
  }

  Future<void> markAllRead() async {
    final unread = (state.valueOrNull ?? const []).where((n) => !n.isRead).map((n) => n.id).toList();
    for (final id in unread) {
      await markRead(id);
    }
  }
}

final notificationsProvider = AsyncNotifierProvider.autoDispose<NotificationsNotifier, List<AppNotification>>(NotificationsNotifier.new);

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  static IconData _icon(String type) => switch (type) {
        'favorite' => Icons.favorite_rounded,
        'follow' => Icons.person_add_alt_1_rounded,
        'approval' => Icons.verified_rounded,
        _ => Icons.notifications_rounded,
      };

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = ref.watch(stringsProvider);
    final async = ref.watch(notificationsProvider);
    final hasUnread = async.valueOrNull?.any((n) => !n.isRead) ?? false;

    return Scaffold(
      appBar: AppBar(
        title: Text(strings.notificationsTitle),
        actions: [
          if (hasUnread)
            TextButton(
              key: const Key('notifications-read-all'),
              onPressed: () => ref.read(notificationsProvider.notifier).markAllRead(),
              child: Text(strings.markAllRead),
            ),
        ],
      ),
      body: WebColumn(
        child: async.when(
          loading: () => const LoadingView(),
          error: (e, _) => ErrorView(message: errorMessage(e, strings), onRetry: () => ref.invalidate(notificationsProvider), strings: strings),
          data: (list) {
            if (list.isEmpty) {
              return Center(child: EmptyView(icon: Icons.notifications_none_rounded, title: strings.noNotifications, body: strings.noNotificationsBody));
            }
            return RefreshIndicator(
              onRefresh: () => ref.refresh(notificationsProvider.future),
              child: ListView.separated(
                padding: const EdgeInsets.all(16),
                itemCount: list.length,
                separatorBuilder: (_, _) => const SizedBox(height: 8),
                itemBuilder: (context, i) {
                  final n = list[i];
                  final age = relativeTime(n.createdAt, arabic: strings.isArabic) ?? '';
                  return Material(
                    color: n.isRead ? AppColors.gray50 : AppColors.emerald100,
                    borderRadius: BorderRadius.circular(18),
                    child: ListTile(
                      key: Key('notification-${n.id}'),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
                      leading: Icon(_icon(n.type), color: n.isRead ? AppColors.gray400 : AppColors.emerald600),
                      title: Text(n.message, style: TextStyle(fontWeight: n.isRead ? FontWeight.w600 : FontWeight.w900, fontSize: 14)),
                      subtitle: age.isEmpty ? null : Text(age, style: const TextStyle(fontSize: 12)),
                      onTap: () => ref.read(notificationsProvider.notifier).markRead(n.id),
                    ),
                  );
                },
              ),
            );
          },
        ),
      ),
    );
  }
}
