import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/l10n/app_strings.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/network/image_urls.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/models/car.dart';
import '../../../shared/models/dealer_profile.dart';
import '../../../shared/models/user.dart';
import '../../../shared/providers/auth_provider.dart';
import '../../../shared/providers/core_providers.dart';
import '../../../shared/providers/language_provider.dart';
import '../../../shared/widgets/web_layout.dart';

typedef _DealerPage = ({DealerProfile profile, List<DealerReel> reels});

final _dealerPageProvider = FutureProvider.autoDispose.family<_DealerPage, int>((ref, id) async {
  final repo = ref.watch(dealerRepositoryProvider);
  final profile = repo.getProfile(id);
  final reels = repo.getReels(id);
  return (profile: await profile, reels: await reels);
});

/// Mirrors src/screens/DealerScreen.tsx: header (logo, name, rating, branch
/// and follower counts), follow button and star rating for signed-in
/// non-dealers, address, branches, contact / map buttons, then the
/// inventory grid mixing the dealer's cars and reels, newest first.
///
/// Kept to the same phone-width column as the other buyer screens (the site
/// lets this one span a desktop window, which makes the tiles oversized).
class DealerProfileScreen extends ConsumerStatefulWidget {
  const DealerProfileScreen({super.key, required this.dealerId});

  final int dealerId;

  @override
  ConsumerState<DealerProfileScreen> createState() => _DealerProfileScreenState();
}

class _DealerProfileScreenState extends ConsumerState<DealerProfileScreen> {
  static final _number = NumberFormat.decimalPattern('en_US');

  bool _following = false;
  bool _followLoading = false;
  int _rating = 0;
  bool _ratingBusy = false;
  bool _showAllBranches = false;

  @override
  void initState() {
    super.initState();
    if (ref.read(authProvider).valueOrNull != null) _loadFollowStatus();
  }

  Future<void> _loadFollowStatus() async {
    try {
      final followed = await ref.read(dealerRepositoryProvider).getFollowStatus(widget.dealerId);
      if (mounted) setState(() => _following = followed);
    } on ApiException {
      // The site only logs this; the button simply stays in its default state.
    }
  }

  void _notify(String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _toggleFollow() async {
    setState(() => _followLoading = true);
    try {
      final followed = await ref.read(dealerRepositoryProvider).toggleFollow(widget.dealerId);
      if (!mounted) return;
      setState(() => _following = followed);
      ref.invalidate(_dealerPageProvider(widget.dealerId));
    } on ApiException {
      if (mounted) _notify('فشل تحديث المتابعة');
    } finally {
      if (mounted) setState(() => _followLoading = false);
    }
  }

  Future<void> _rate(int value) async {
    setState(() => _ratingBusy = true);
    try {
      await ref.read(dealerRepositoryProvider).rate(widget.dealerId, value);
      if (!mounted) return;
      setState(() => _rating = value);
      ref.invalidate(_dealerPageProvider(widget.dealerId));
    } on ApiException {
      if (mounted) _notify('فشل إرسال التقييم');
    } finally {
      if (mounted) setState(() => _ratingBusy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final strings = ref.watch(stringsProvider);
    final user = ref.watch(authProvider).valueOrNull;
    final page = ref.watch(_dealerPageProvider(widget.dealerId));
    final data = page.valueOrNull;

    return Scaffold(
      body: SafeArea(
        child: data == null
            ? _Unloaded(loading: page.isLoading, onBack: () => context.pop())
            : _buildPage(context, strings, user, data),
      ),
    );
  }

  Widget _buildPage(BuildContext context, AppStrings strings, User? user, _DealerPage data) {
    final dealer = data.profile.dealer;
    final branches = data.profile.branches;
    final grid = buildDealerGrid(data.profile.cars, data.reels);
    final logo = displayImageUrl(dealer.logo);
    final canInteract = user != null && !user.isDealer;
    final shownBranches = _showAllBranches ? branches : branches.take(3).toList();
    final mapLink = dealer.mapLocationLink;

    return SingleChildScrollView(
      child: WebColumn(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
          Container(
            padding: const EdgeInsets.fromLTRB(24, 24, 24, 32),
            decoration: const BoxDecoration(
              color: AppColors.white,
              borderRadius: BorderRadius.vertical(bottom: Radius.circular(40)),
              border: Border(bottom: BorderSide(color: AppColors.gray100)),
              boxShadow: [BoxShadow(color: Color(0x0D000000), blurRadius: 2, offset: Offset(0, 1))],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Align(
                  alignment: AlignmentDirectional.centerStart,
                  child: WebBackButton(onTap: () => context.pop(), padding: 12, radius: 16),
                ),
                const SizedBox(height: 24),
                Row(
                  children: [
                    Container(
                      width: 96,
                      height: 96,
                      decoration: BoxDecoration(
                        color: AppColors.gray100,
                        borderRadius: BorderRadius.circular(24),
                        boxShadow: kShadowXl,
                      ),
                      clipBehavior: Clip.antiAlias,
                      child: logo == null
                          ? null
                          : CachedNetworkImage(
                              imageUrl: logo,
                              fit: BoxFit.cover,
                              errorWidget: (_, __, ___) => const SizedBox.shrink(),
                            ),
                    ),
                    const SizedBox(width: 24),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            dealer.name,
                            style: const TextStyle(
                              fontSize: 24,
                              height: 1.33,
                              fontWeight: FontWeight.w900,
                              letterSpacing: -0.6,
                              color: AppColors.gray900,
                            ),
                          ),
                          const SizedBox(height: 4),
                          DefaultTextStyle.merge(
                            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.gray400),
                            child: Wrap(
                              spacing: 12,
                              crossAxisAlignment: WrapCrossAlignment.center,
                              children: [
                                Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Icon(Icons.star_rounded, size: 16, color: AppColors.amber500),
                                    const SizedBox(width: 4),
                                    Text(
                                      dealer.rating != 0 ? dealer.rating.toStringAsFixed(1) : '0.0',
                                      style: const TextStyle(color: AppColors.amber500),
                                    ),
                                  ],
                                ),
                                const Text('•'),
                                Text(strings.verifiedDealer),
                                if (branches.isNotEmpty) ...[const Text('•'), Text('${branches.length} فروع')],
                                const Text('•'),
                                Text(
                                  '${dealer.followersCount ?? 0} متابع',
                                  style: const TextStyle(color: AppColors.emerald500),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                if (canInteract) ...[
                  GestureDetector(
                    onTap: _followLoading ? null : _toggleFollow,
                    child: Container(
                      height: 48,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: _following ? AppColors.gray100 : AppColors.emerald500,
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: _following
                            ? null
                            : [
                                BoxShadow(
                                  color: AppColors.emerald500.withValues(alpha: 0.2),
                                  blurRadius: 15,
                                  offset: const Offset(0, 10),
                                  spreadRadius: -3,
                                ),
                              ],
                      ),
                      child: _followLoading
                          ? SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: _following ? AppColors.gray500 : AppColors.white,
                              ),
                            )
                          : Text(
                              _following ? 'إلغاء المتابعة' : 'متابعة المعرض',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w700,
                                color: _following ? AppColors.gray500 : AppColors.white,
                              ),
                            ),
                    ),
                  ),
                  const SizedBox(height: 24),
                ],
                Text(
                  dealer.description ?? '',
                  style: const TextStyle(fontSize: 14, height: 1.625, fontWeight: FontWeight.w500, color: AppColors.gray500),
                ),
                const SizedBox(height: 24),
                if (canInteract) ...[
                  _InfoBox(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'قيم هذا المعرض',
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.gray400),
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            for (var star = 1; star <= 5; star++)
                              Padding(
                                padding: const EdgeInsetsDirectional.only(end: 8),
                                child: GestureDetector(
                                  onTap: _ratingBusy ? null : () => _rate(star),
                                  child: Icon(
                                    _rating >= star ? Icons.star_rounded : Icons.star_outline_rounded,
                                    size: 26,
                                    color: _rating >= star ? AppColors.amber500 : AppColors.gray200,
                                  ),
                                ),
                              ),
                            if (_ratingBusy)
                              const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.gray400),
                              ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                ],
                if ((dealer.address ?? '').isNotEmpty) ...[
                  _InfoBox(
                    child: Row(
                      children: [
                        const Icon(Icons.location_on_outlined, size: 16, color: AppColors.gray400),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            dealer.address!,
                            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.gray500),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                ],
                if (branches.isNotEmpty) ...[
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 4),
                    child: Text(
                      'فروعنا',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.gray400),
                    ),
                  ),
                  const SizedBox(height: 12),
                  for (final branch in shownBranches)
                    Padding(padding: const EdgeInsets.only(bottom: 8), child: _BranchTile(branch: branch)),
                  if (branches.length > 3 && !_showAllBranches)
                    GestureDetector(
                      onTap: () => setState(() => _showAllBranches = true),
                      child: Container(
                        margin: const EdgeInsets.only(top: 4),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: AppColors.gray50,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: AppColors.gray200),
                        ),
                        child: Text(
                          'عرض جميع الفروع (${branches.length})',
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.gray400),
                        ),
                      ),
                    ),
                  const SizedBox(height: 16),
                ],
                _WideButton(
                  color: AppColors.black,
                  foreground: AppColors.white,
                  icon: Icons.phone_outlined,
                  label: strings.contact,
                  onTap: () => launchUrl(Uri.parse('tel:${dealer.phone}')),
                ),
                if (mapLink != null && mapLink.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  _WideButton(
                    color: AppColors.gray100,
                    foreground: AppColors.gray900,
                    icon: Icons.location_on_outlined,
                    label: '🗺 عرض الموقع على الخريطة',
                    onTap: () => launchUrl(Uri.parse(mapLink), mode: LaunchMode.externalApplication),
                  ),
                ],
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 32, 24, 24),
            child: Text(
              '${strings.inventory} (${grid.length})',
              style: const TextStyle(fontSize: 20, height: 1.4, fontWeight: FontWeight.w900, color: AppColors.gray900),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 0, 12, 96),
            child: GridView.count(
              crossAxisCount: 3,
              mainAxisSpacing: 8,
              crossAxisSpacing: 8,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              children: [
                for (final item in grid)
                  if (item.car != null)
                    _CarTile(car: item.car!, number: _number, onTap: () => context.push('/car/${item.car!.id}'))
                  else
                    _ReelTile(reel: item.reel!, onTap: () => context.go('/reels')),
              ],
            ),
          ),
          ],
        ),
      ),
    );
  }
}

/// The site renders nothing until the dealer has loaded (`return null`); the
/// back button is kept here so a failed load is not a dead end.
class _Unloaded extends StatelessWidget {
  const _Unloaded({required this.loading, required this.onBack});

  final bool loading;
  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Align(
            alignment: AlignmentDirectional.centerStart,
            child: WebBackButton(onTap: onBack, padding: 12, radius: 16),
          ),
          Expanded(
            child: Center(
              child: loading
                  ? const CircularProgressIndicator(color: AppColors.emeraldAccent)
                  : const Icon(Icons.storefront_outlined, size: 40, color: AppColors.gray300),
            ),
          ),
        ],
      ),
    );
  }
}

/// `bg-gray-50 p-4 rounded-2xl border border-gray-100`
class _InfoBox extends StatelessWidget {
  const _InfoBox({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.gray50,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.gray100),
      ),
      child: child,
    );
  }
}

class _BranchTile extends StatelessWidget {
  const _BranchTile({required this.branch});

  final DealerBranch branch;

  @override
  Widget build(BuildContext context) {
    final phone = branch.phone;
    final map = branch.mapLink;
    return _InfoBox(
      child: Row(
        children: [
          const _MiniIcon(icon: Icons.location_on_outlined, size: 16, box: 32),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  branch.name ?? '',
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.gray900),
                ),
                Text(
                  branch.address ?? '',
                  style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.gray400),
                ),
              ],
            ),
          ),
          if (phone != null && phone.isNotEmpty)
            GestureDetector(
              onTap: () => launchUrl(Uri.parse('tel:$phone')),
              child: const _MiniIcon(icon: Icons.phone_outlined, size: 14, box: 30),
            ),
          if (map != null && map.isNotEmpty) ...[
            const SizedBox(width: 8),
            GestureDetector(
              onTap: () => launchUrl(Uri.parse(map), mode: LaunchMode.externalApplication),
              child: const _MiniIcon(icon: Icons.location_on_outlined, size: 14, box: 30),
            ),
          ],
        ],
      ),
    );
  }
}

class _MiniIcon extends StatelessWidget {
  const _MiniIcon({required this.icon, required this.size, required this.box});

  final IconData icon;
  final double size;
  final double box;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: box,
      height: box,
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: const [BoxShadow(color: Color(0x0D000000), blurRadius: 2, offset: Offset(0, 1))],
      ),
      child: Icon(icon, size: size, color: AppColors.gray400),
    );
  }
}

class _WideButton extends StatelessWidget {
  const _WideButton({
    required this.color,
    required this.foreground,
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final Color color;
  final Color foreground;
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(16)),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 18, color: foreground),
            const SizedBox(width: 8),
            Text(label, style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: foreground)),
          ],
        ),
      ),
    );
  }
}

class _CarTile extends StatelessWidget {
  const _CarTile({required this.car, required this.number, required this.onTap});

  final Car car;
  final NumberFormat number;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: Stack(
          fit: StackFit.expand,
          children: [
            CachedNetworkImage(
              imageUrl: car.coverImage,
              httpHeaders: carImageHeaders,
              fit: BoxFit.cover,
              placeholder: (_, __) => Container(color: AppColors.gray100),
              errorWidget: (_, __, ___) => Container(color: AppColors.gray100),
            ),
            // `bg-gradient-to-t from-black/40 via-transparent to-transparent`
            DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.bottomCenter,
                  end: Alignment.topCenter,
                  colors: [Colors.black.withValues(alpha: 0.4), Colors.transparent, Colors.transparent],
                ),
              ),
            ),
            Positioned(
              left: 8,
              right: 8,
              bottom: 8,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${car.make} ${car.model}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 10, height: 1.25, fontWeight: FontWeight.w900, color: AppColors.white),
                  ),
                  Opacity(
                    opacity: 0.8,
                    child: Text(
                      '${car.year} • ${number.format(car.price)} ج.م',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 8, fontWeight: FontWeight.w700, color: AppColors.white),
                    ),
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

/// The site shows the reel's first video frame here; without a video
/// decoder on Windows the tile keeps the same overlay on a dark backdrop.
class _ReelTile extends StatelessWidget {
  const _ReelTile({required this.reel, required this.onTap});

  final DealerReel reel;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: Stack(
          fit: StackFit.expand,
          children: [
            const ColoredBox(color: AppColors.darkCard),
            ColoredBox(color: Colors.black.withValues(alpha: 0.2)),
            const Positioned(
              top: 8,
              right: 8,
              child: Icon(Icons.play_arrow_rounded, size: 18, color: AppColors.white),
            ),
            Positioned(
              left: 8,
              right: 8,
              bottom: 8,
              child: Text(
                reel.caption ?? '',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 10, height: 1.25, fontWeight: FontWeight.w900, color: AppColors.white),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
