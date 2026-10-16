import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/l10n/app_strings.dart';
import '../../../core/l10n/market_strings.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/phone_utils.dart';
import '../../../shared/providers/auth_provider.dart';
import '../../../shared/providers/core_providers.dart';
import '../../../shared/providers/language_provider.dart';
import '../../../shared/widgets/car_image_carousel.dart';
import '../../../shared/widgets/web_layout.dart';
import '../../dealers/presentation/manage/dealer_widgets.dart' show ErrorView, LoadingView, errorMessage, showMessage;
import '../data/market_repository.dart';

final partDetailsProvider = FutureProvider.autoDispose.family<MarketPart, int>(
  (ref, id) => ref.watch(marketRepositoryProvider).getPart(id),
);

/// src/screens/PartDetailsScreen.tsx: photos, specs, the cars it fits, the
/// dealer, and WhatsApp / call / map actions. Signed-in buyers can also
/// send an order request (POST /api/parts/:id/order), which the dealer
/// handles from their orders list.
class PartDetailsScreen extends ConsumerWidget {
  const PartDetailsScreen({super.key, required this.partId});

  final int partId;

  static final _price = NumberFormat.decimalPattern();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = ref.watch(stringsProvider);
    final partAsync = ref.watch(partDetailsProvider(partId));

    return Scaffold(
      appBar: AppBar(title: Text(strings.partsMarket)),
      body: WebColumn(
        child: partAsync.when(
          loading: () => const LoadingView(),
          error: (e, _) => ErrorView(
            message: errorMessage(e, strings),
            onRetry: () => ref.invalidate(partDetailsProvider(partId)),
            strings: strings,
          ),
          data: (part) {
            final whatsapp = toWhatsappLink(part.dealerWhatsapp);
            final phone = (part.dealerPhone ?? '').trim();
            final map = (part.dealerMapLink ?? '').trim();
            return ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(24),
                  child: AspectRatio(aspectRatio: 4 / 3, child: CarImageCarousel(imageUrls: part.imageUrls, onTap: () {})),
                ),
                const SizedBox(height: 16),
                Text(part.name, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 20)),
                const SizedBox(height: 4),
                Text(
                  part.price == null ? strings.priceOnRequest : '${_price.format(part.price)} ${strings.currency}',
                  style: const TextStyle(color: AppColors.emerald600, fontWeight: FontWeight.w900, fontSize: 18),
                ),
                if (!part.isAvailable)
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text(strings.unavailable, style: const TextStyle(color: AppColors.rose600, fontWeight: FontWeight.w800)),
                  ),
                const SizedBox(height: 16),
                _Spec(label: strings.partNumber, value: part.partNumber),
                _Spec(label: strings.manufacturer, value: part.manufacturer),
                _Spec(label: strings.condition, value: _condition(part.condition, strings)),
                if (part.deliverySupported) _Spec(label: strings.delivery, value: strings.deliveryAvailable),
                if (part.compatibility.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Text(strings.compatibleWith, style: const TextStyle(fontWeight: FontWeight.w900)),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [for (final c in part.compatibility) Chip(label: Text(c.label))],
                  ),
                ],
                if (part.dealerName != null) ...[
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(color: AppColors.darkCard, borderRadius: BorderRadius.circular(20)),
                    child: Row(
                      children: [
                        const Icon(Icons.storefront_rounded, color: AppColors.white),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(part.dealerName!, style: const TextStyle(color: AppColors.white, fontWeight: FontWeight.w800)),
                              if ((part.dealerAddress ?? part.dealerLocation) != null)
                                Text(part.dealerAddress ?? part.dealerLocation!, style: const TextStyle(color: AppColors.gray400, fontSize: 12)),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
                const SizedBox(height: 16),
                Wrap(
                  spacing: 12,
                  runSpacing: 12,
                  children: [
                    if (whatsapp != null)
                      FilledButton.icon(
                        key: const Key('part-whatsapp'),
                        style: FilledButton.styleFrom(backgroundColor: AppColors.emerald500),
                        onPressed: () => launchUrl(
                          Uri.parse('$whatsapp?text=${Uri.encodeComponent(_whatsappText(part, strings))}'),
                          mode: LaunchMode.externalApplication,
                        ),
                        icon: const Icon(Icons.chat_bubble_rounded),
                        label: Text(strings.whatsapp),
                      ),
                    if (phone.isNotEmpty)
                      FilledButton.icon(
                        key: const Key('part-call'),
                        style: FilledButton.styleFrom(backgroundColor: AppColors.black),
                        onPressed: () => launchUrl(Uri.parse('tel:$phone')),
                        icon: const Icon(Icons.call_rounded),
                        label: Text(strings.call),
                      ),
                    if (map.isNotEmpty)
                      OutlinedButton.icon(
                        key: const Key('part-map'),
                        onPressed: () => launchUrl(Uri.parse(map), mode: LaunchMode.externalApplication),
                        icon: const Icon(Icons.map_outlined),
                        label: Text(strings.openMap),
                      ),
                  ],
                ),
                if (part.isAvailable) ...[
                  const SizedBox(height: 12),
                  OutlinedButton.icon(
                    key: const Key('part-order'),
                    onPressed: () async {
                      if (ref.read(authProvider).valueOrNull == null) {
                        context.push('/login');
                        return;
                      }
                      final sent = await showModalBottomSheet<bool>(
                        context: context,
                        isScrollControlled: true,
                        showDragHandle: true,
                        builder: (_) => PartOrderSheet(part: part),
                      );
                      if (sent == true && context.mounted) showMessage(context, strings.orderSent);
                    },
                    icon: const Icon(Icons.shopping_bag_outlined),
                    label: Text(strings.requestOrder),
                  ),
                ],
              ],
            );
          },
        ),
      ),
    );
  }

  static String _condition(String value, AppStrings strings) => switch (value) {
        'new' => strings.conditionNew,
        'used' => strings.conditionUsed,
        _ => value,
      };

  static String _whatsappText(MarketPart part, AppStrings strings) => strings.isArabic
      ? 'السلام عليكم، أنا مهتم بقطعة غيار ${part.name} الموجودة على سوق السيارات.'
      : 'Hello, I am interested in the spare part "${part.name}" listed on Souq Cars.';
}

class _Spec extends StatelessWidget {
  const _Spec({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    if (value.trim().isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          SizedBox(width: 130, child: Text(label, style: const TextStyle(color: AppColors.gray500, fontWeight: FontWeight.w700))),
          Expanded(child: Text(value, style: const TextStyle(fontWeight: FontWeight.w800))),
        ],
      ),
    );
  }
}

/// Order request form: pick-up or delivery (with an address), and notes.
class PartOrderSheet extends ConsumerStatefulWidget {
  const PartOrderSheet({super.key, required this.part});

  final MarketPart part;

  @override
  ConsumerState<PartOrderSheet> createState() => _PartOrderSheetState();
}

class _PartOrderSheetState extends ConsumerState<PartOrderSheet> {
  late String _method = 'pickup';
  final _address = TextEditingController();
  final _notes = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _address.dispose();
    _notes.dispose();
    super.dispose();
  }

  Future<void> _submit(AppStrings strings) async {
    if (_method == 'delivery' && _address.text.trim().isEmpty) {
      setState(() => _error = strings.addressRequired);
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(marketRepositoryProvider).placeOrder(
            widget.part.id,
            deliveryMethod: _method,
            deliveryAddress: _method == 'delivery' ? _address.text : null,
            notes: _notes.text,
          );
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      if (mounted) setState(() => _error = errorMessage(e, strings));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final strings = ref.watch(stringsProvider);
    return Padding(
      padding: EdgeInsets.fromLTRB(24, 0, 24, 24 + MediaQuery.viewInsetsOf(context).bottom),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(strings.requestOrder, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18)),
          const SizedBox(height: 4),
          Text(widget.part.name, style: const TextStyle(color: AppColors.gray500)),
          const SizedBox(height: 16),
          SegmentedButton<String>(
            segments: [
              ButtonSegment(value: 'pickup', label: Text(strings.pickup), icon: const Icon(Icons.storefront_rounded)),
              if (widget.part.deliverySupported)
                ButtonSegment(value: 'delivery', label: Text(strings.delivery), icon: const Icon(Icons.local_shipping_outlined)),
            ],
            selected: {_method},
            onSelectionChanged: _busy ? null : (v) => setState(() => _method = v.first),
          ),
          if (_method == 'delivery') ...[
            const SizedBox(height: 12),
            TextField(key: const Key('order-address'), controller: _address, decoration: InputDecoration(hintText: strings.deliveryAddress)),
          ],
          const SizedBox(height: 12),
          TextField(key: const Key('order-notes'), controller: _notes, maxLines: 2, decoration: InputDecoration(hintText: strings.notesOptional)),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(top: 12),
              child: Text(_error!, style: const TextStyle(color: AppColors.red500, fontWeight: FontWeight.w700)),
            ),
          const SizedBox(height: 16),
          FilledButton(
            key: const Key('order-submit'),
            style: FilledButton.styleFrom(backgroundColor: AppColors.black, padding: const EdgeInsets.symmetric(vertical: 14)),
            onPressed: _busy ? null : () => _submit(strings),
            child: Text(_busy ? strings.processing : strings.requestOrder),
          ),
        ],
      ),
    );
  }
}
