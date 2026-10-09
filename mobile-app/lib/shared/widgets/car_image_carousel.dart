import 'dart:ui';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../models/car.dart';

/// Builds one photo of the carousel. Injectable so widget tests can run
/// without the network or the image cache plugin.
typedef CarouselImageBuilder = Widget Function(BuildContext context, String url, int index);

/// The photo area of a feed post: every image of the listing, swipeable in
/// place, with an "n/total" counter and page dots.
///
/// - A horizontal drag only changes the photo; it never fires [onTap].
///   Opening the listing takes a deliberate tap.
/// - Photos are shown whole (`contain`) over a blurred copy of themselves, so
///   portrait and landscape shots both fit the square without cropping the car.
/// - Works with any number of photos: none (placeholder), one (no counter or
///   dots), or many (dots collapse to a sliding window of five).
class CarImageCarousel extends StatefulWidget {
  const CarImageCarousel({
    super.key,
    required this.imageUrls,
    required this.onTap,
    this.overlays = const [],
    this.imageBuilder,
  });

  final List<String> imageUrls;
  final VoidCallback onTap;

  /// Extra widgets stacked over the photos (status / featured badges).
  final List<Widget> overlays;
  final CarouselImageBuilder? imageBuilder;

  @override
  State<CarImageCarousel> createState() => _CarImageCarouselState();
}

class _CarImageCarouselState extends State<CarImageCarousel> {
  final _controller = PageController();
  int _index = 0;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _onPageChanged(int index) {
    setState(() => _index = index);
    _precache(index + 1);
  }

  /// Warm the next photo so the swipe lands on a ready image.
  void _precache(int index) {
    if (widget.imageBuilder != null || index >= widget.imageUrls.length) return;
    precacheImage(
      CachedNetworkImageProvider(widget.imageUrls[index], headers: carImageHeaders),
      context,
      onError: (_, __) {},
    );
  }

  void _step(int delta) {
    _controller.animateToPage(
      _index + delta,
      duration: const Duration(milliseconds: 260),
      curve: Curves.easeOutCubic,
    );
  }

  Widget _image(BuildContext context, int i) {
    final url = widget.imageUrls[i];
    final custom = widget.imageBuilder;
    if (custom != null) return custom(context, url, i);
    return _FittedPhoto(url: url);
  }

  @override
  Widget build(BuildContext context) {
    final count = widget.imageUrls.length;
    // Arrows are for pointer-driven platforms; on phones the swipe and the
    // dots are enough and arrows would only clutter the photo.
    final showArrows = const {
      TargetPlatform.windows,
      TargetPlatform.macOS,
      TargetPlatform.linux,
    }.contains(defaultTargetPlatform);

    return AspectRatio(
      aspectRatio: 1,
      child: Stack(
        fit: StackFit.expand,
        children: [
          if (count == 0)
            GestureDetector(onTap: widget.onTap, child: const _PhotoPlaceholder(failed: true))
          else
            GestureDetector(
              onTap: widget.onTap,
              child: ScrollConfiguration(
                // Desktop: let a mouse or trackpad drag swipe the photos too.
                behavior: const _DragAnywhereBehavior(),
                child: PageView.builder(
                  controller: _controller,
                  itemCount: count,
                  onPageChanged: _onPageChanged,
                  itemBuilder: _image,
                ),
              ),
            ),
          ...widget.overlays,
          if (count > 1) ...[
            PositionedDirectional(
              top: 12,
              end: 12,
              child: IgnorePointer(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.5),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    '${_index + 1}/$count',
                    textDirection: TextDirection.ltr,
                    style: const TextStyle(color: AppColors.white, fontSize: 10, fontWeight: FontWeight.w900),
                  ),
                ),
              ),
            ),
            Positioned(
              left: 0,
              right: 0,
              bottom: 10,
              child: IgnorePointer(child: Center(child: _Dots(count: count, index: _index))),
            ),
            // Pointer-friendly previous / next, following the reading direction
            // (the chevron icons mirror themselves in RTL).
            if (showArrows && _index > 0)
              PositionedDirectional(
                start: 8,
                top: 0,
                bottom: 0,
                child: Center(
                  child: _ArrowButton(
                    icon: Icons.chevron_left,
                    semanticLabel: 'Previous photo',
                    onTap: () => _step(-1),
                  ),
                ),
              ),
            if (showArrows && _index < count - 1)
              PositionedDirectional(
                end: 8,
                top: 0,
                bottom: 0,
                child: Center(
                  child: _ArrowButton(
                    icon: Icons.chevron_right,
                    semanticLabel: 'Next photo',
                    onTap: () => _step(1),
                  ),
                ),
              ),
          ],
        ],
      ),
    );
  }
}

/// The whole photo, uncropped, over a blurred enlargement of itself.
class _FittedPhoto extends StatelessWidget {
  const _FittedPhoto({required this.url});

  final String url;

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: [
        const ColoredBox(color: AppColors.gray100),
        ClipRect(
          child: ImageFiltered(
            imageFilter: ImageFilter.blur(sigmaX: 24, sigmaY: 24, tileMode: TileMode.clamp),
            child: CachedNetworkImage(
              imageUrl: url,
              httpHeaders: carImageHeaders,
              fit: BoxFit.cover,
              fadeInDuration: Duration.zero,
              errorWidget: (_, __, ___) => const SizedBox.shrink(),
            ),
          ),
        ),
        ColoredBox(color: Colors.black.withValues(alpha: 0.08)),
        CachedNetworkImage(
          imageUrl: url,
          httpHeaders: carImageHeaders,
          fit: BoxFit.contain,
          fadeInDuration: const Duration(milliseconds: 180),
          placeholder: (_, __) => const _PhotoPlaceholder(failed: false),
          errorWidget: (_, __, ___) => const _PhotoPlaceholder(failed: true),
        ),
      ],
    );
  }
}

class _PhotoPlaceholder extends StatelessWidget {
  const _PhotoPlaceholder({required this.failed});

  final bool failed;

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: AppColors.gray100,
      child: Center(
        child: failed
            ? const Icon(Icons.directions_car, size: 40, color: AppColors.gray400)
            : const SizedBox(
                width: 22,
                height: 22,
                child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.gray400),
              ),
      ),
    );
  }
}

/// Up to five dots; with more photos the window slides and the outer dots
/// shrink to hint that there is more in that direction.
class _Dots extends StatelessWidget {
  const _Dots({required this.count, required this.index});

  final int count;
  final int index;

  static const _window = 5;

  @override
  Widget build(BuildContext context) {
    final visible = count < _window ? count : _window;
    final first = (index - _window ~/ 2).clamp(0, count - visible);

    return Row(
      mainAxisSize: MainAxisSize.min,
      // Dots follow the photo order, which follows the reading direction.
      children: [
        for (var i = first; i < first + visible; i++)
          AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            margin: const EdgeInsets.symmetric(horizontal: 2.5),
            width: _size(i, first, visible),
            height: _size(i, first, visible),
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: i == index ? AppColors.white : Colors.white.withValues(alpha: 0.55),
              boxShadow: const [BoxShadow(color: Color(0x40000000), blurRadius: 2)],
            ),
          ),
      ],
    );
  }

  double _size(int i, int first, int visible) {
    if (i == index) return 7;
    final atEdge = (i == first && first > 0) || (i == first + visible - 1 && first + visible < count);
    return atEdge ? 4 : 6;
  }
}

class _ArrowButton extends StatelessWidget {
  const _ArrowButton({required this.icon, required this.semanticLabel, required this.onTap});

  final IconData icon;
  final String semanticLabel;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: semanticLabel,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onTap,
        // 44px hit area around a 28px visible disc.
        child: SizedBox(
          width: 44,
          height: 44,
          child: Center(
            child: Container(
              width: 28,
              height: 28,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.85),
                shape: BoxShape.circle,
                boxShadow: const [BoxShadow(color: Color(0x33000000), blurRadius: 6, offset: Offset(0, 2))],
              ),
              child: Icon(icon, size: 20, color: AppColors.gray900),
            ),
          ),
        ),
      ),
    );
  }
}

class _DragAnywhereBehavior extends MaterialScrollBehavior {
  const _DragAnywhereBehavior();

  @override
  Set<PointerDeviceKind> get dragDevices => const {
        PointerDeviceKind.touch,
        PointerDeviceKind.mouse,
        PointerDeviceKind.trackpad,
        PointerDeviceKind.stylus,
        PointerDeviceKind.invertedStylus,
      };
}
