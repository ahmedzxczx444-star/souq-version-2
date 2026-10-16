import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/l10n/market_strings.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/providers/core_providers.dart';
import '../../../shared/providers/language_provider.dart';
import '../../../shared/widgets/web_layout.dart';
import '../../dealers/presentation/manage/dealer_widgets.dart' show EmptyView, ErrorView, LoadingView, errorMessage;
import '../data/market_repository.dart';

final myPartOrdersProvider = FutureProvider.autoDispose<List<PartOrder>>(
  (ref) => ref.watch(marketRepositoryProvider).myOrders(),
);

/// The signed-in buyer's part order requests (GET /api/parts/my-orders)
/// and the status each dealer has set.
class MyPartOrdersScreen extends ConsumerWidget {
  const MyPartOrdersScreen({super.key});

  static final _price = NumberFormat.decimalPattern();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = ref.watch(stringsProvider);
    final orders = ref.watch(myPartOrdersProvider);

    return Scaffold(
      appBar: AppBar(title: Text(strings.myPartOrders)),
      body: WebColumn(
        child: orders.when(
          loading: () => const LoadingView(),
          error: (e, _) => ErrorView(message: errorMessage(e, strings), onRetry: () => ref.invalidate(myPartOrdersProvider), strings: strings),
          data: (list) {
            if (list.isEmpty) return Center(child: EmptyView(icon: Icons.receipt_long_outlined, title: strings.noOrders));
            return RefreshIndicator(
              onRefresh: () => ref.refresh(myPartOrdersProvider.future),
              child: ListView.separated(
                padding: const EdgeInsets.all(16),
                itemCount: list.length,
                separatorBuilder: (_, _) => const SizedBox(height: 12),
                itemBuilder: (context, i) {
                  final o = list[i];
                  return Container(
                    key: Key('order-${o.id}'),
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(color: AppColors.gray50, borderRadius: BorderRadius.circular(20)),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(child: Text(strings.orderNumber(o.id), style: const TextStyle(fontWeight: FontWeight.w900))),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(color: AppColors.emerald100, borderRadius: BorderRadius.circular(999)),
                              child: Text(strings.orderStatus(o.status),
                                  style: const TextStyle(color: AppColors.emerald600, fontWeight: FontWeight.w800, fontSize: 12)),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        for (final item in o.items)
                          Text(
                            '${item.name}${item.price == null ? '' : ' · ${_price.format(item.price)} ${strings.currency}'}',
                            style: const TextStyle(fontWeight: FontWeight.w700),
                          ),
                        const SizedBox(height: 4),
                        Text(
                          [
                            if (o.dealerName != null) o.dealerName!,
                            o.deliveryMethod == 'delivery' ? strings.delivery : strings.pickup,
                          ].join(' · '),
                          style: const TextStyle(color: AppColors.gray500, fontSize: 12),
                        ),
                        if ((o.dealerPhone ?? '').isNotEmpty)
                          Align(
                            alignment: AlignmentDirectional.centerStart,
                            child: TextButton.icon(
                              onPressed: () => launchUrl(Uri.parse('tel:${o.dealerPhone}')),
                              icon: const Icon(Icons.call_rounded, size: 18),
                              label: Text(strings.call),
                            ),
                          ),
                      ],
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
