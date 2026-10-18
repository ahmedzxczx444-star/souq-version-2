import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/l10n/moderation_strings.dart';
import '../../../core/network/error_text.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/providers/language_provider.dart';
import '../../dealers/presentation/manage/dealer_widgets.dart' show DealerPage, EmptyView, ErrorView, LoadingView, showMessage;
import '../data/moderation_repository.dart';

/// Settings → Blocked accounts: everyone this account blocked, with unblock.
class BlockedAccountsScreen extends ConsumerStatefulWidget {
  const BlockedAccountsScreen({super.key});

  @override
  ConsumerState<BlockedAccountsScreen> createState() => _BlockedAccountsScreenState();
}

class _BlockedAccountsScreenState extends ConsumerState<BlockedAccountsScreen> {
  final _working = <int>{};

  Future<void> _unblock(BlockedAccount account) async {
    final s = ref.read(stringsProvider);
    setState(() => _working.add(account.userId));
    try {
      await ref.read(blockedAccountsProvider.notifier).unblock(account.userId);
      if (mounted) showMessage(context, s.dealerUnblocked);
    } catch (e) {
      if (mounted) showMessage(context, errorMessage(e, s));
    } finally {
      if (mounted) setState(() => _working.remove(account.userId));
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final blocks = ref.watch(blockedAccountsProvider);
    return DealerPage(
      title: s.blockedAccounts,
      child: blocks.when(
        loading: () => const LoadingView(),
        error: (e, _) => ErrorView(message: errorMessage(e, s), onRetry: () => ref.invalidate(blockedAccountsProvider), strings: s),
        data: (list) => list.isEmpty
            ? EmptyView(icon: Icons.block_rounded, title: s.noBlockedAccounts, body: s.noBlockedAccountsBody)
            : ListView.separated(
                padding: const EdgeInsets.all(16),
                itemCount: list.length,
                separatorBuilder: (_, _) => const Divider(height: 1),
                itemBuilder: (context, i) {
                  final account = list[i];
                  final busy = _working.contains(account.userId);
                  return ListTile(
                    key: Key('blocked-${account.userId}'),
                    leading: const CircleAvatar(backgroundColor: AppColors.gray100, child: Icon(Icons.storefront_rounded, color: AppColors.gray500)),
                    title: Text(account.name ?? s.deletedAccount, style: const TextStyle(fontWeight: FontWeight.w700)),
                    trailing: TextButton(
                      key: Key('unblock-${account.userId}'),
                      onPressed: busy ? null : () => _unblock(account),
                      child: busy
                          ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                          : Text(s.unblockDealer),
                    ),
                  );
                },
              ),
      ),
    );
  }
}
