import 'dart:async';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/l10n/app_strings.dart';
import '../../../core/l10n/market_strings.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/providers/core_providers.dart';
import '../../../shared/providers/language_provider.dart';
import '../../../shared/widgets/web_layout.dart';
import '../../moderation/data/moderation_repository.dart';
import '../../dealers/presentation/manage/dealer_widgets.dart' show EmptyView, ErrorView, LoadingView, errorMessage;
import '../data/market_repository.dart';

final partsSearchProvider = FutureProvider.autoDispose.family<PartSearchResult, String>(
  (ref, query) => ref.watch(marketRepositoryProvider).searchParts(query),
);

/// Buyer-side spare-parts marketplace: available parts from every parts
/// dealer (GET /api/parts/search/query), searchable by name, part number,
/// manufacturer or the car a part fits.
class PartsMarketplaceScreen extends ConsumerStatefulWidget {
  const PartsMarketplaceScreen({super.key});

  @override
  ConsumerState<PartsMarketplaceScreen> createState() => _PartsMarketplaceScreenState();
}

class _PartsMarketplaceScreenState extends ConsumerState<PartsMarketplaceScreen> {
  final _search = TextEditingController();
  Timer? _debounce;
  String _query = '';

  @override
  void dispose() {
    _debounce?.cancel();
    _search.dispose();
    super.dispose();
  }

  void _onChanged(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 400), () {
      if (mounted && value.trim() != _query) setState(() => _query = value.trim());
    });
  }

  @override
  Widget build(BuildContext context) {
    final strings = ref.watch(stringsProvider);
    final result = ref.watch(partsSearchProvider(_query));
    final blocked = ref.watch(blockedDealerIdsProvider);

    return Scaffold(
      appBar: AppBar(title: Text(strings.partsMarket)),
      body: WebColumn(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
              child: TextField(
                key: const Key('parts-search'),
                controller: _search,
                onChanged: _onChanged,
                onSubmitted: (v) => setState(() => _query = v.trim()),
                textInputAction: TextInputAction.search,
                decoration: InputDecoration(hintText: strings.partsSearchHint, prefixIcon: const Icon(Icons.search_rounded)),
              ),
            ),
            Expanded(
              child: result.when(
                loading: () => const LoadingView(),
                error: (e, _) => ErrorView(
                  message: errorMessage(e, strings),
                  onRetry: () => ref.invalidate(partsSearchProvider(_query)),
                  strings: strings,
                ),
                data: (r) {
                  final parts = [for (final p in r.parts) if (!blocked.contains(p.dealerId)) p];
                  if (parts.isEmpty) {
                    return Center(
                      child: EmptyView(icon: Icons.settings_suggest_rounded, title: _query.isEmpty ? strings.noParts : strings.noPartsMatch),
                    );
                  }
                  return RefreshIndicator(
                    onRefresh: () => ref.refresh(partsSearchProvider(_query).future),
                    child: ListView.separated(
                      padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
                      itemCount: parts.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 12),
                      itemBuilder: (context, i) => PartTile(part: parts[i], strings: strings),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class PartTile extends StatelessWidget {
  const PartTile({super.key, required this.part, required this.strings});

  final MarketPart part;
  final AppStrings strings;

  static final _price = NumberFormat.decimalPattern();

  @override
  Widget build(BuildContext context) {
    final image = part.imageUrls.isEmpty ? null : part.imageUrls.first;
    return InkWell(
      key: Key('part-${part.id}'),
      borderRadius: BorderRadius.circular(20),
      onTap: () => context.push('/part/${part.id}'),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: AppColors.gray50, borderRadius: BorderRadius.circular(20)),
        child: Row(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(14),
              child: SizedBox(
                width: 76,
                height: 76,
                child: image == null
                    ? Container(color: AppColors.gray100, child: const Icon(Icons.settings_suggest_rounded, color: AppColors.gray400))
                    : CachedNetworkImage(imageUrl: image, fit: BoxFit.cover, errorWidget: (_, _, _) => Container(color: AppColors.gray100)),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(part.name, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14)),
                  if (part.partNumber.isNotEmpty || part.manufacturer.isNotEmpty)
                    Text(
                      [part.manufacturer, part.partNumber].where((s) => s.isNotEmpty).join(' · '),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(color: AppColors.gray500, fontSize: 12, fontWeight: FontWeight.w600),
                    ),
                  if (part.compatibility.isNotEmpty)
                    Text(
                      '${strings.compatibleWith}: ${part.compatibility.map((c) => c.label).join('، ')}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(color: AppColors.gray500, fontSize: 12),
                    ),
                  const SizedBox(height: 4),
                  Text(
                    part.price == null ? strings.priceOnRequest : '${_price.format(part.price)} ${strings.currency}',
                    style: const TextStyle(color: AppColors.emerald600, fontWeight: FontWeight.w900, fontSize: 13),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
