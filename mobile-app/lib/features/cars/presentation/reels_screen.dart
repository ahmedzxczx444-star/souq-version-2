import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:video_player/video_player.dart';

import '../../../core/l10n/app_strings.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/network/image_urls.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/relative_time.dart';
import '../../../shared/models/dealer_profile.dart';
import '../../../shared/providers/auth_provider.dart';
import '../../../shared/providers/core_providers.dart';
import '../../../shared/providers/language_provider.dart';
import '../../../shared/widgets/web_layout.dart';

final reelsProvider = FutureProvider.autoDispose((ref) => ref.watch(dealerRepositoryProvider).getAllReels());

/// `video_player` ships implementations for Android, iOS, macOS and web only.
/// Everywhere else (Windows, Linux) there is no decoder, so the post offers
/// to open the video externally instead of pretending to play it.
bool get inAppVideoSupported =>
    kIsWeb ||
    const {TargetPlatform.android, TargetPlatform.iOS, TargetPlatform.macOS}.contains(defaultTargetPlatform);

/// The Reels tab: the dealers' video posts from GET /api/reels, newest first
/// (the backend's order), each as a video card with the dealer, caption,
/// like and share actions and a link to the car when the reel has one.
///
/// The site shows these as full-screen snap pages; here they are feed cards
/// in the same column as the photo feed, clearly marked as video.
class ReelsScreen extends ConsumerWidget {
  const ReelsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = ref.watch(stringsProvider);
    final reelsAsync = ref.watch(reelsProvider);

    return Scaffold(
      appBar: AppBar(title: Text(strings.reels)),
      body: RefreshIndicator(
        color: AppColors.emeraldAccent,
        onRefresh: () => ref.refresh(reelsProvider.future),
        child: reelsAsync.when(
          loading: () => const Center(child: CircularProgressIndicator(color: AppColors.emeraldAccent)),
          error: (_, __) => _Message(
            icon: Icons.wifi_off_rounded,
            text: strings.isArabic ? 'تعذر تحميل الفيديوهات' : 'Could not load videos',
            action: strings.isArabic ? 'إعادة المحاولة' : 'Retry',
            onAction: () => ref.invalidate(reelsProvider),
          ),
          data: (reels) {
            if (reels.isEmpty) {
              return _Message(
                icon: Icons.movie_outlined,
                text: strings.isArabic ? 'لا توجد فيديوهات بعد' : 'No videos yet',
              );
            }
            return ListView.builder(
              padding: const EdgeInsets.only(top: 8, bottom: 32),
              itemCount: reels.length,
              itemBuilder: (context, i) => WebColumn(child: ReelPost(reel: reels[i], strings: strings)),
            );
          },
        ),
      ),
    );
  }
}

class ReelPost extends ConsumerStatefulWidget {
  const ReelPost({super.key, required this.reel, required this.strings});

  final DealerReel reel;
  final AppStrings strings;

  @override
  ConsumerState<ReelPost> createState() => _ReelPostState();
}

class _ReelPostState extends ConsumerState<ReelPost> {
  late bool _liked = widget.reel.isLiked;
  late int _likes = widget.reel.likes;

  Future<void> _toggleLike() async {
    if (ref.read(authProvider).valueOrNull == null) {
      context.push('/login');
      return;
    }
    // Optimistic, like the site's handleLike; reverted if the call fails.
    final before = (_liked, _likes);
    setState(() {
      _likes = _liked ? (_likes > 0 ? _likes - 1 : 0) : _likes + 1;
      _liked = !_liked;
    });
    try {
      await ref.read(dealerRepositoryProvider).toggleReelLike(widget.reel.id);
    } on ApiException {
      if (mounted) {
        setState(() {
          _liked = before.$1;
          _likes = before.$2;
        });
      }
    }
  }

  Future<void> _share() async {
    final url = widget.reel.videoUrl;
    if (url == null || url.isEmpty) return;
    final text = [if ((widget.reel.caption ?? '').isNotEmpty) widget.reel.caption!, url].join('\n');
    await launchUrl(
      Uri.parse('https://wa.me/?text=${Uri.encodeComponent(text)}'),
      mode: LaunchMode.externalApplication,
    );
  }

  @override
  Widget build(BuildContext context) {
    final reel = widget.reel;
    final strings = widget.strings;
    final logo = displayImageUrl(reel.dealerLogo);
    final age = relativeTime(reel.createdAt, arabic: strings.isArabic);
    final carTitle = [reel.make, reel.model].whereType<String>().where((s) => s.isNotEmpty).join(' ');
    final carId = reel.carId;

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.only(bottom: 12),
      decoration: const BoxDecoration(
        color: AppColors.white,
        border: Border(bottom: BorderSide(color: AppColors.gray100)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                GestureDetector(
                  onTap: reel.dealerId == null ? null : () => context.push('/dealer/${reel.dealerId}'),
                  child: ClipOval(
                    child: Container(
                      width: 32,
                      height: 32,
                      color: AppColors.gray200,
                      child: logo == null
                          ? null
                          : CachedNetworkImage(
                              imageUrl: logo,
                              fit: BoxFit.cover,
                              errorWidget: (_, __, ___) => const SizedBox.shrink(),
                            ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if ((reel.dealerName ?? '').isNotEmpty)
                        Text(
                          reel.dealerName!,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: AppColors.gray900),
                        ),
                      if (age != null)
                        Text(
                          age,
                          style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: AppColors.gray400),
                        ),
                    ],
                  ),
                ),
                // Marks the post as video, as opposed to a photo gallery.
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(color: AppColors.gray100, borderRadius: BorderRadius.circular(999)),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.videocam_outlined, size: 12, color: AppColors.gray600),
                      const SizedBox(width: 4),
                      Text(
                        strings.isArabic ? 'فيديو' : 'Video',
                        style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w900, color: AppColors.gray600),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          AspectRatio(
            aspectRatio: 4 / 5,
            child: ReelVideo(
              reelId: reel.id,
              videoUrl: reel.videoUrl,
              strings: strings,
              onFirstPlay: () => ref.read(dealerRepositoryProvider).recordReelView(reel.id).ignore(),
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 2),
            child: Row(
              children: [
                _IconAction(
                  icon: _liked ? Icons.favorite : Icons.favorite_border,
                  color: _liked ? AppColors.red500 : AppColors.gray900,
                  label: _liked ? 'Unlike' : 'Like',
                  onTap: _toggleLike,
                ),
                Text('$_likes', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: AppColors.gray900)),
                const SizedBox(width: 4),
                _IconAction(icon: Icons.share_outlined, color: AppColors.gray900, label: 'Share', onTap: _share),
                const Spacer(),
                const Icon(Icons.visibility_outlined, size: 14, color: AppColors.gray400),
                const SizedBox(width: 4),
                Text(
                  '${reel.views}',
                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.gray400),
                ),
                const SizedBox(width: 12),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if ((reel.caption ?? '').isNotEmpty)
                  Text(
                    reel.caption!,
                    style: const TextStyle(fontSize: 12, height: 1.5, fontWeight: FontWeight.w700, color: AppColors.gray900),
                  ),
                if (carId != null)
                  GestureDetector(
                    behavior: HitTestBehavior.opaque,
                    onTap: () => context.push('/car/$carId'),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.directions_car_outlined, size: 14, color: AppColors.emeraldAccent),
                          const SizedBox(width: 6),
                          Flexible(
                            child: Text(
                              carTitle.isNotEmpty
                                  ? carTitle
                                  : (strings.isArabic ? 'عرض السيارة' : 'View car'),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: AppColors.emeraldAccent),
                            ),
                          ),
                          const Icon(Icons.chevron_right, size: 16, color: AppColors.emeraldAccent),
                        ],
                      ),
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

/// The video area of a reel. Nothing is downloaded until the user presses
/// play. Controls: tap to play/pause, mute toggle, progress bar with
/// scrubbing; loading and error states with retry.
class ReelVideo extends StatefulWidget {
  const ReelVideo({
    super.key,
    required this.reelId,
    required this.videoUrl,
    required this.strings,
    this.onFirstPlay,
    this.supported,
  });

  final int reelId;
  final String? videoUrl;
  final AppStrings strings;
  final VoidCallback? onFirstPlay;

  /// Overrides the platform check (tests).
  final bool? supported;

  @override
  State<ReelVideo> createState() => _ReelVideoState();
}

enum _VideoPhase { idle, loading, ready, failed }

class _ReelVideoState extends State<ReelVideo> {
  VideoPlayerController? _controller;
  _VideoPhase _phase = _VideoPhase.idle;
  bool _muted = false;
  bool _counted = false;

  bool get _supported => widget.supported ?? inAppVideoSupported;

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  Future<void> _start() async {
    final url = widget.videoUrl;
    if (url == null || url.isEmpty) return;
    setState(() => _phase = _VideoPhase.loading);
    final controller = VideoPlayerController.networkUrl(Uri.parse(url));
    _controller?.dispose();
    _controller = controller;
    try {
      await controller.initialize();
      await controller.setLooping(true);
      if (!mounted) return;
      controller.addListener(_onTick);
      setState(() => _phase = _VideoPhase.ready);
      await controller.play();
      if (!_counted) {
        _counted = true;
        widget.onFirstPlay?.call();
      }
    } catch (_) {
      if (mounted) setState(() => _phase = _VideoPhase.failed);
    }
  }

  void _onTick() {
    final c = _controller;
    if (c == null || !mounted) return;
    if (c.value.hasError) {
      setState(() => _phase = _VideoPhase.failed);
    } else {
      setState(() {});
    }
  }

  void _togglePlay() {
    final c = _controller;
    if (c == null) return;
    c.value.isPlaying ? c.pause() : c.play();
  }

  void _toggleMute() {
    final c = _controller;
    if (c == null) return;
    setState(() => _muted = !_muted);
    c.setVolume(_muted ? 0 : 1);
  }

  Future<void> _openExternally() async {
    final url = widget.videoUrl;
    if (url == null || url.isEmpty) return;
    await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
  }

  @override
  Widget build(BuildContext context) {
    final ar = widget.strings.isArabic;
    final url = widget.videoUrl;
    final Widget body;

    if (url == null || url.isEmpty) {
      body = _Overlay(icon: Icons.videocam_off_outlined, text: ar ? 'الفيديو غير متوفر' : 'Video unavailable');
    } else if (!_supported) {
      body = _Overlay(
        icon: Icons.play_circle_outline_rounded,
        text: ar ? 'تشغيل الفيديو داخل التطبيق غير متاح على هذا الجهاز' : 'In-app video playback is not available on this device',
        action: ar ? 'فتح الفيديو' : 'Open video',
        onAction: _openExternally,
      );
    } else {
      body = switch (_phase) {
        _VideoPhase.idle => _Overlay(
            icon: Icons.play_circle_fill_rounded,
            iconSize: 64,
            semanticLabel: 'Play video',
            onIconTap: _start,
          ),
        _VideoPhase.loading => const Center(
            child: SizedBox(
              width: 32,
              height: 32,
              child: CircularProgressIndicator(strokeWidth: 3, color: AppColors.white),
            ),
          ),
        _VideoPhase.failed => _Overlay(
            icon: Icons.error_outline_rounded,
            text: ar ? 'تعذر تشغيل الفيديو' : 'Could not play this video',
            action: ar ? 'إعادة المحاولة' : 'Retry',
            onAction: _start,
          ),
        _VideoPhase.ready => _player(_controller!),
      };
    }

    return ColoredBox(color: AppColors.darkCard, child: body);
  }

  Widget _player(VideoPlayerController c) {
    final v = c.value;
    return Stack(
      fit: StackFit.expand,
      children: [
        GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: _togglePlay,
          child: FittedBox(
            fit: BoxFit.contain,
            child: SizedBox(width: v.size.width, height: v.size.height, child: VideoPlayer(c)),
          ),
        ),
        if (v.isBuffering)
          const Center(
            child: SizedBox(
              width: 28,
              height: 28,
              child: CircularProgressIndicator(strokeWidth: 3, color: AppColors.white),
            ),
          )
        else if (!v.isPlaying)
          IgnorePointer(
            child: Center(
              child: Icon(Icons.play_arrow_rounded, size: 72, color: Colors.white.withValues(alpha: 0.9)),
            ),
          ),
        PositionedDirectional(
          top: 8,
          end: 8,
          child: _RoundControl(
            icon: _muted ? Icons.volume_off_rounded : Icons.volume_up_rounded,
            label: _muted ? 'Unmute' : 'Mute',
            onTap: _toggleMute,
          ),
        ),
        Positioned(
          left: 0,
          right: 0,
          bottom: 0,
          child: Directionality(
            // Time runs left to right in both languages.
            textDirection: TextDirection.ltr,
            child: VideoProgressIndicator(
              c,
              allowScrubbing: true,
              padding: const EdgeInsets.only(top: 12),
              colors: VideoProgressColors(
                playedColor: AppColors.emerald500,
                bufferedColor: Colors.white.withValues(alpha: 0.4),
                backgroundColor: Colors.white.withValues(alpha: 0.2),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _Overlay extends StatelessWidget {
  const _Overlay({
    required this.icon,
    this.iconSize = 44,
    this.text,
    this.action,
    this.onAction,
    this.onIconTap,
    this.semanticLabel,
  });

  final IconData icon;
  final double iconSize;
  final String? text;
  final String? action;
  final VoidCallback? onAction;
  final VoidCallback? onIconTap;
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) {
    final iconWidget = Icon(icon, size: iconSize, color: Colors.white.withValues(alpha: 0.9));
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (onIconTap != null)
              Semantics(
                button: true,
                label: semanticLabel,
                child: GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: onIconTap,
                  child: Padding(padding: const EdgeInsets.all(12), child: iconWidget),
                ),
              )
            else
              iconWidget,
            if (text != null) ...[
              const SizedBox(height: 12),
              Text(
                text!,
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.white.withValues(alpha: 0.8)),
              ),
            ],
            if (action != null) ...[
              const SizedBox(height: 16),
              GestureDetector(
                onTap: onAction,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                  decoration: BoxDecoration(color: AppColors.emerald500, borderRadius: BorderRadius.circular(16)),
                  child: Text(
                    action!,
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: AppColors.white),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _RoundControl extends StatelessWidget {
  const _RoundControl({required this.icon, required this.label, required this.onTap});

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: label,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onTap,
        child: SizedBox(
          width: 44,
          height: 44,
          child: Center(
            child: Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(color: Colors.black.withValues(alpha: 0.5), shape: BoxShape.circle),
              child: Icon(icon, size: 18, color: AppColors.white),
            ),
          ),
        ),
      ),
    );
  }
}

class _IconAction extends StatelessWidget {
  const _IconAction({required this.icon, required this.color, required this.label, required this.onTap});

  final IconData icon;
  final Color color;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: label,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onTap,
        child: SizedBox(width: 44, height: 44, child: Icon(icon, size: 24, color: color)),
      ),
    );
  }
}

class _Message extends StatelessWidget {
  const _Message({required this.icon, required this.text, this.action, this.onAction});

  final IconData icon;
  final String text;
  final String? action;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    // A ListView so pull-to-refresh still works on the empty/error states.
    return ListView(
      children: [
        const SizedBox(height: 120),
        Icon(icon, size: 44, color: AppColors.gray400),
        const SizedBox(height: 16),
        Center(child: Text(text, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15))),
        if (action != null)
          Center(
            child: TextButton(
              onPressed: onAction,
              child: Text(action!, style: const TextStyle(color: AppColors.emeraldAccent, fontWeight: FontWeight.w800)),
            ),
          ),
      ],
    );
  }
}
