import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/l10n/app_strings.dart';
import '../../../shared/providers/core_providers.dart';
import '../../../shared/providers/language_provider.dart';
import '../../../shared/widgets/dealer_card.dart';
import '../../../shared/widgets/web_layout.dart';

final _allDealersProvider = FutureProvider.autoDispose((ref) => ref.watch(dealerRepositoryProvider).getAll());

/// Mirrors src/screens/AllDealersScreen.tsx: GET /api/dealers in the
/// backend's order, as a single column of the same 240px dealer cards.
class AllDealersScreen extends ConsumerWidget {
  const AllDealersScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = ref.watch(stringsProvider);
    final dealersAsync = ref.watch(_allDealersProvider);
    final dealers = dealersAsync.valueOrNull ?? const [];

    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          child: WebColumn(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 24, 16, 96),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  WebListHeader(
                    title: strings.topDealers,
                    subtitle: '${dealers.length} ${strings.officialDealer}',
                    onBack: () => context.pop(),
                  ),
                  if (dealersAsync.isLoading && !dealersAsync.hasValue)
                    for (var i = 0; i < 4; i++)
                      const Padding(padding: EdgeInsets.only(bottom: 16), child: WebSkeleton(height: 192, radius: 24))
                  else
                    for (final dealer in dealers)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 16),
                        // The card keeps its fixed `w-60` inside the one-column grid.
                        child: Align(
                          alignment: AlignmentDirectional.centerStart,
                          child: DealerCardWidget(
                            dealer: dealer,
                            strings: strings,
                            onTap: () => context.push('/dealer/${dealer.id}'),
                          ),
                        ),
                      ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
