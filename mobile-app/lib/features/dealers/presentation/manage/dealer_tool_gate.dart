import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/l10n/app_strings.dart';
import '../../../../core/l10n/dealer_strings.dart';
import '../../../../shared/models/user.dart';
import '../../../../shared/providers/auth_provider.dart';
import '../../../../shared/providers/language_provider.dart';
import '../../data/dealer_account.dart';
import '../../data/dealer_tools_repository.dart';
import 'dealer_widgets.dart';

/// Opens [builder] only for a dealer whose type includes [tool]; anyone
/// else (a buyer, or another dealer type following a link) gets a notice.
/// This keeps the screens honest — the API enforces the same rule itself.
class DealerToolGate extends ConsumerWidget {
  const DealerToolGate({super.key, required this.tool, required this.builder});

  final DealerTool tool;
  final WidgetBuilder builder;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = ref.watch(stringsProvider);
    final user = ref.watch(authProvider).valueOrNull;
    Widget notice(String text) => DealerPage(
          title: strings.dashboard,
          child: Center(child: EmptyView(icon: Icons.lock_outline_rounded, title: text)),
        );

    if (user == null || !user.isDealer) return notice(strings.dealersOnly);

    return ref.watch(dealerAccountProvider).when(
          loading: () => DealerPage(title: strings.dashboard, child: const LoadingView()),
          error: (e, _) => DealerPage(
            title: strings.dashboard,
            child: ErrorView(
              message: errorMessage(e, strings),
              onRetry: () => ref.invalidate(dealerAccountProvider),
              strings: strings,
            ),
          ),
          data: (dealer) => toolsFor(dealer.kind).contains(tool)
              ? builder(context)
              : notice(strings.isArabic ? 'هذه الخاصية غير متاحة لنوع حسابك' : 'This feature is not available for your dealer type'),
        );
  }
}
