import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart' show NumberFormat;

import '../../../core/l10n/app_strings.dart';
import '../../../core/l10n/dealer_strings.dart';
import '../../../core/network/image_urls.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/models/car.dart';
import '../../../shared/models/user.dart';
import '../../../shared/providers/auth_provider.dart';
import '../../../shared/providers/language_provider.dart';
import '../data/dealer_account.dart';
import '../data/dealer_tools_repository.dart';
import '../data/resource_specs.dart';
import 'manage/dealer_widgets.dart';

/// The signed-in dealer's home: who they are, whether they can publish,
/// their numbers, the tools their dealer type has, and their inventory.
/// Everything shown is read from the API for this account.
class DealerDashboardScreen extends ConsumerWidget {
  const DealerDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = ref.watch(stringsProvider);
    final user = ref.watch(authProvider).valueOrNull;

    if (user == null || !user.isDealer) {
      return DealerPage(
        title: strings.dashboard,
        child: Center(child: EmptyView(icon: Icons.lock_outline_rounded, title: strings.dealersOnly)),
      );
    }

    final account = ref.watch(dealerAccountProvider);
    return DealerPage(
      title: strings.dashboard,
      child: account.when(
        loading: () => const LoadingView(),
        error: (e, _) => ErrorView(
          message: errorMessage(e, strings),
          onRetry: () => ref.invalidate(dealerAccountProvider),
          strings: strings,
        ),
        data: (dealer) => RefreshIndicator(
          color: AppColors.black,
          onRefresh: () async {
            ref.invalidate(dealerAccountProvider);
            ref.invalidate(dealerStatsProvider);
            ref.invalidate(partsStatsProvider);
            ref.invalidate(chainOverviewProvider);
            ref.invalidate(dealerCarsProvider);
            ref.invalidate(dealerPartsProvider);
          },
          child: ListView(
            padding: const EdgeInsets.fromLTRB(24, 0, 24, 48),
            children: [
              _Header(dealer: dealer, strings: strings),
              if (!dealer.isActive) _StatusBanner(dealer: dealer, strings: strings),
              const SizedBox(height: 16),
              if (dealer.kind.sellsCars) _CarStats(strings: strings) else _PartsStatsRow(strings: strings),
              if (dealer.kind == DealerKind.chain) _ChainOverviewCard(strings: strings),
              const SizedBox(height: 24),
              _Tools(dealer: dealer, strings: strings),
              const SizedBox(height: 32),
              if (dealer.kind.sellsCars) _Listings(strings: strings) else _PartsList(strings: strings),
            ],
          ),
        ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.dealer, required this.strings});

  final DealerAccount dealer;
  final AppStrings strings;

  @override
  Widget build(BuildContext context) {
    final logo = displayImageUrl(dealer.logo);
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(color: AppColors.black, borderRadius: BorderRadius.circular(28)),
      child: Row(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(18),
            child: SizedBox(
              width: 56,
              height: 56,
              child: logo == null
                  ? const ColoredBox(color: AppColors.gray600)
                  : CachedNetworkImage(
                      imageUrl: logo,
                      fit: BoxFit.cover,
                      errorWidget: (_, _, _) => const ColoredBox(color: AppColors.gray600),
                    ),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  dealer.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: AppColors.white, fontWeight: FontWeight.w900, fontSize: 18),
                ),
                const SizedBox(height: 4),
                Text(
                  strings.kindLabel(dealer.kind.name),
                  key: const Key('dealer-kind'),
                  style: const TextStyle(color: AppColors.gray400, fontWeight: FontWeight.w700, fontSize: 12),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _StatusBanner extends StatelessWidget {
  const _StatusBanner({required this.dealer, required this.strings});

  final DealerAccount dealer;
  final AppStrings strings;

  @override
  Widget build(BuildContext context) {
    final suspended = dealer.status == 'suspended';
    return Container(
      key: const Key('dealer-status-banner'),
      margin: const EdgeInsets.only(top: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: suspended ? AppColors.rose100 : AppColors.amber100,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            suspended ? Icons.block_rounded : Icons.hourglass_top_rounded,
            color: suspended ? AppColors.rose600 : AppColors.amber600,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  suspended ? strings.suspendedTitle : strings.pendingApprovalTitle,
                  style: const TextStyle(fontWeight: FontWeight.w900, color: AppColors.gray900),
                ),
                const SizedBox(height: 4),
                Text(
                  suspended ? strings.suspendedBody : strings.pendingApprovalBody,
                  style: const TextStyle(color: AppColors.gray600, fontSize: 13, height: 1.4),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _StatTiles extends StatelessWidget {
  const _StatTiles(this.stats);

  /// label -> value; a null value renders as a dash (still loading or failed).
  final Map<String, int?> stats;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        for (final entry in stats.entries)
          Expanded(
            child: Container(
              margin: const EdgeInsets.symmetric(horizontal: 4),
              padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
              decoration: BoxDecoration(color: AppColors.gray50, borderRadius: BorderRadius.circular(20)),
              child: Column(
                children: [
                  Text(
                    entry.value?.toString() ?? '—',
                    style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: AppColors.gray900),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    entry.key,
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.gray500),
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }
}

class _CarStats extends ConsumerWidget {
  const _CarStats({required this.strings});

  final AppStrings strings;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final stats = ref.watch(dealerStatsProvider).valueOrNull;
    return _StatTiles({
      strings.totalCars: stats?.totalCars,
      strings.followers: stats?.totalFollowers,
      strings.likes: stats?.totalLikes,
    });
  }
}

class _PartsStatsRow extends ConsumerWidget {
  const _PartsStatsRow({required this.strings});

  final AppStrings strings;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final stats = ref.watch(partsStatsProvider).valueOrNull;
    return _StatTiles({
      strings.totalParts: stats?.totalParts,
      strings.availableParts: stats?.availableParts,
      strings.views: stats?.totalViews,
    });
  }
}

class _ChainOverviewCard extends ConsumerWidget {
  const _ChainOverviewCard({required this.strings});

  final AppStrings strings;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final overview = ref.watch(chainOverviewProvider);
    return Padding(
      key: const Key('chain-overview'),
      padding: const EdgeInsets.only(top: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(strings.chainOverview, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
          const SizedBox(height: 12),
          overview.when(
            loading: () => const Padding(padding: EdgeInsets.all(16), child: LoadingView()),
            error: (e, _) => Text(errorMessage(e, strings), style: const TextStyle(color: AppColors.red500)),
            data: (data) => Column(
              children: [
                _StatTiles({
                  strings.branchesCount: data.totalBranches,
                  strings.employeesCount: data.employeeCount,
                  strings.unassignedCars: data.unassignedCars,
                }),
                for (final branch in data.branches)
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: const Icon(Icons.store_mall_directory_outlined, color: AppColors.gray600),
                    title: Text(branch.name, style: const TextStyle(fontWeight: FontWeight.w700)),
                    subtitle: branch.region.isEmpty ? null : Text(branch.region),
                    trailing: Text(
                      '${branch.totalCars} ${strings.totalCars} · ${branch.totalViews} ${strings.views}',
                      style: const TextStyle(color: AppColors.gray500, fontSize: 12, fontWeight: FontWeight.w700),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

({IconData icon, String label, String route}) dealerToolEntry(DealerTool tool, AppStrings strings) {
  final spec = resourceSpecs[tool];
  if (spec != null) {
    return (icon: spec.icon, label: spec.title(strings.isArabic), route: '/dealer-manage/${tool.name}');
  }
  switch (tool) {
    case DealerTool.addCar:
      return (icon: Icons.add_circle_outline_rounded, label: strings.addCar, route: '/add-car');
    case DealerTool.reels:
      return (icon: Icons.movie_outlined, label: strings.myReels, route: '/dealer-reels');
    case DealerTool.addPart:
      return (icon: Icons.add_circle_outline_rounded, label: strings.addPart, route: '/add-part');
    default:
      return (icon: Icons.storefront_outlined, label: strings.showroomProfile, route: '/edit-profile');
  }
}

class _Tools extends ConsumerWidget {
  const _Tools({required this.dealer, required this.strings});

  final DealerAccount dealer;
  final AppStrings strings;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return LayoutBuilder(builder: (context, box) {
      // Three equal tiles per row across the column.
      final tileWidth = (box.maxWidth - 24) / 3;
      return Wrap(
      spacing: 12,
      runSpacing: 12,
      children: [
        for (final tool in toolsFor(dealer.kind))
          Builder(builder: (context) {
            final entry = dealerToolEntry(tool, strings);
            // Publishing needs an approved account (the API answers 403 otherwise).
            final needsApproval = tool == DealerTool.addCar || tool == DealerTool.addPart || tool == DealerTool.reels;
            final enabled = dealer.isActive || !needsApproval;
            return Opacity(
              opacity: enabled ? 1 : 0.4,
              child: Material(
                color: AppColors.gray50,
                borderRadius: BorderRadius.circular(20),
                child: InkWell(
                  key: Key('tool-${tool.name}'),
                  borderRadius: BorderRadius.circular(20),
                  onTap: enabled
                      ? () async {
                          await context.push(entry.route);
                          // Whatever was changed there shows in the numbers here.
                          ref.invalidate(dealerStatsProvider);
                          ref.invalidate(partsStatsProvider);
                          ref.invalidate(chainOverviewProvider);
                          ref.invalidate(dealerCarsProvider);
                          ref.invalidate(dealerPartsProvider);
                        }
                      : null,
                  child: SizedBox(
                    width: tileWidth,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
                      child: Column(
                        children: [
                          Icon(entry.icon, color: AppColors.gray900),
                          const SizedBox(height: 8),
                          Text(
                            entry.label,
                            textAlign: TextAlign.center,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.gray900),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            );
          }),
      ],
      );
    });
  }
}

String _money(num value) => NumberFormat.decimalPattern('en').format(value);

Widget _thumb(String url) {
  const placeholder = ColoredBox(color: AppColors.gray100, child: Icon(Icons.image_outlined, color: AppColors.gray400));
  return ClipRRect(
    borderRadius: BorderRadius.circular(14),
    child: SizedBox(
      width: 72,
      height: 72,
      child: url.isEmpty
          ? placeholder
          : CachedNetworkImage(
              imageUrl: url,
              fit: BoxFit.cover,
              placeholder: (_, _) => placeholder,
              errorWidget: (_, _, _) => placeholder,
            ),
    ),
  );
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.text);

  final String text;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: Text(text, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18, color: AppColors.gray900)),
      );
}

class _Listings extends ConsumerWidget {
  const _Listings({required this.strings});

  final AppStrings strings;

  Future<void> _act(BuildContext context, WidgetRef ref, Future<void> Function() action, String success) async {
    try {
      await action();
      ref.invalidate(dealerCarsProvider);
      ref.invalidate(dealerStatsProvider);
      if (context.mounted) showMessage(context, success);
    } catch (e) {
      if (context.mounted) showMessage(context, errorMessage(e, strings));
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cars = ref.watch(dealerCarsProvider);
    final repo = ref.read(dealerToolsRepositoryProvider);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _SectionTitle(strings.myListings),
        cars.when(
          loading: () => const Padding(padding: EdgeInsets.all(32), child: LoadingView()),
          error: (e, _) => ErrorView(
            message: errorMessage(e, strings),
            onRetry: () => ref.invalidate(dealerCarsProvider),
            strings: strings,
          ),
          data: (list) {
            if (list.isEmpty) {
              return EmptyView(
                icon: Icons.directions_car_outlined,
                title: strings.noListingsYet,
                body: strings.noListingsBody,
              );
            }
            return Column(
              children: [
                for (final car in list)
                  Container(
                    key: Key('listing-${car.id}'),
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: AppColors.gray100),
                    ),
                    child: Row(
                      children: [
                        _thumb(car.coverImage),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '${car.make} ${car.model} ${car.year}',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '${_money(car.price)} ${strings.isArabic ? 'ج.م' : 'EGP'}',
                                style: const TextStyle(color: AppColors.gray600, fontWeight: FontWeight.w700, fontSize: 13),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '${strings.carStatusLabel(car.status)} · ${strings.views}: ${car.views}',
                                style: TextStyle(
                                  color: car.status == 'hidden' ? AppColors.red500 : AppColors.gray500,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ],
                          ),
                        ),
                        PopupMenuButton<String>(
                          key: Key('listing-menu-${car.id}'),
                          onSelected: (choice) async {
                            if (choice == 'edit') {
                              await context.push('/edit-car/${car.id}', extra: car);
                              ref.invalidate(dealerCarsProvider);
                            } else if (choice == 'view') {
                              context.push('/car/${car.id}');
                            } else if (choice == 'delete') {
                              final ok = await confirmDelete(
                                context,
                                strings,
                                title: strings.deleteListingTitle,
                                body: strings.deleteListingBody,
                              );
                              if (ok && context.mounted) {
                                await _act(context, ref, () => repo.deleteCar(car.id), strings.deleted);
                              }
                            } else {
                              await _act(
                                context,
                                ref,
                                () => repo.updateCar(car.id, listingBody(car, status: choice)),
                                strings.saved,
                              );
                            }
                          },
                          itemBuilder: (_) => [
                            PopupMenuItem(value: 'edit', child: Text(strings.edit)),
                            if (car.status != 'hidden')
                              PopupMenuItem(value: 'view', child: Text(strings.isArabic ? 'عرض الإعلان' : 'View listing')),
                            // An admin-hidden listing stays hidden whatever the dealer picks.
                            if (car.status != 'hidden')
                              for (final status in const ['available', 'reserved', 'sold'])
                                if (status != car.status)
                                  PopupMenuItem(value: status, child: Text(strings.carStatusLabel(status))),
                            PopupMenuItem(
                              value: 'delete',
                              child: Text(strings.delete, style: const TextStyle(color: AppColors.red500)),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
              ],
            );
          },
        ),
      ],
    );
  }
}

class _PartsList extends ConsumerWidget {
  const _PartsList({required this.strings});

  final AppStrings strings;

  Future<void> _act(BuildContext context, WidgetRef ref, Future<void> Function() action, String success) async {
    try {
      await action();
      ref.invalidate(dealerPartsProvider);
      ref.invalidate(partsStatsProvider);
      if (context.mounted) showMessage(context, success);
    } catch (e) {
      if (context.mounted) showMessage(context, errorMessage(e, strings));
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final parts = ref.watch(dealerPartsProvider);
    final repo = ref.read(dealerToolsRepositoryProvider);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _SectionTitle(strings.myParts),
        parts.when(
          loading: () => const Padding(padding: EdgeInsets.all(32), child: LoadingView()),
          error: (e, _) => ErrorView(
            message: errorMessage(e, strings),
            onRetry: () => ref.invalidate(dealerPartsProvider),
            strings: strings,
          ),
          data: (list) {
            if (list.isEmpty) {
              return EmptyView(icon: Icons.settings_suggest_outlined, title: strings.noPartsYet, body: strings.noPartsBody);
            }
            return Column(
              children: [
                for (final part in list)
                  Container(
                    key: Key('part-${part.id}'),
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: AppColors.gray100),
                    ),
                    child: Row(
                      children: [
                        _thumb(part.coverImage),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                part.name,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                [
                                  if (part.price != null) '${_money(part.price!)} ${strings.isArabic ? 'ج.م' : 'EGP'}',
                                  if (part.partNumber.isNotEmpty) part.partNumber,
                                ].join(' · '),
                                style: const TextStyle(color: AppColors.gray600, fontWeight: FontWeight.w700, fontSize: 13),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '${part.isAvailable ? strings.available : strings.unavailable} · ${strings.views}: ${part.views}',
                                style: const TextStyle(color: AppColors.gray500, fontSize: 12, fontWeight: FontWeight.w700),
                              ),
                            ],
                          ),
                        ),
                        PopupMenuButton<String>(
                          key: Key('part-menu-${part.id}'),
                          onSelected: (choice) async {
                            if (choice == 'edit') {
                              await context.push('/edit-part/${part.id}', extra: part);
                              ref.invalidate(dealerPartsProvider);
                            } else if (choice == 'delete') {
                              final ok = await confirmDelete(context, strings, title: strings.deletePartTitle);
                              if (ok && context.mounted) {
                                await _act(context, ref, () => repo.deletePart(part.id), strings.deleted);
                              }
                            } else {
                              await _act(context, ref, () => repo.setPartStatus(part.id, choice), strings.saved);
                            }
                          },
                          itemBuilder: (_) => [
                            PopupMenuItem(value: 'edit', child: Text(strings.edit)),
                            PopupMenuItem(
                              value: part.isAvailable ? 'unavailable' : 'available',
                              child: Text(part.isAvailable ? strings.unavailable : strings.availableForSale),
                            ),
                            PopupMenuItem(
                              value: 'delete',
                              child: Text(strings.delete, style: const TextStyle(color: AppColors.red500)),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
              ],
            );
          },
        ),
      ],
    );
  }
}
