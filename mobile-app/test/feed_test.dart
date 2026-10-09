// Feed interaction tests: the in-post photo carousel (swipe, counter, dots,
// tap vs swipe, 0 / 1 / many photos, RTL), the reel video area's states,
// listing-age formatting and reel parsing.
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_app/core/l10n/app_strings.dart';
import 'package:mobile_app/core/utils/relative_time.dart';
import 'package:mobile_app/features/cars/presentation/reels_screen.dart';
import 'package:mobile_app/shared/models/dealer_profile.dart';
import 'package:mobile_app/shared/widgets/car_image_carousel.dart';

List<String> urls(int n) => [for (var i = 0; i < n; i++) 'https://images.example.com/$i.jpg'];

Future<int> pumpCarousel(
  WidgetTester tester,
  List<String> images, {
  TextDirection direction = TextDirection.ltr,
}) async {
  var taps = 0;
  await tester.pumpWidget(
    MaterialApp(
      home: Directionality(
        textDirection: direction,
        child: Scaffold(
          body: SizedBox(
            width: 400,
            child: CarImageCarousel(
              imageUrls: images,
              onTap: () => taps++,
              // No network or cache plugin in tests: draw a labelled box.
              imageBuilder: (_, url, i) => ColoredBox(
                key: ValueKey('photo-$i'),
                color: Colors.blueGrey,
                child: Center(child: Text('photo $i')),
              ),
            ),
          ),
        ),
      ),
    ),
  );
  // Returned through a closure variable read after interactions.
  _taps = () => taps;
  return taps;
}

int Function() _taps = () => 0;

void main() {
  group('CarImageCarousel', () {
    testWidgets('many photos: counter, dots, and swiping moves through them', (tester) async {
      await pumpCarousel(tester, urls(8));
      expect(find.text('1/8'), findsOneWidget);
      expect(find.text('photo 0'), findsOneWidget);

      await tester.drag(find.byType(PageView), const Offset(-300, 0));
      await tester.pumpAndSettle();
      expect(find.text('2/8'), findsOneWidget);
      expect(find.text('photo 1'), findsOneWidget);

      await tester.drag(find.byType(PageView), const Offset(-300, 0));
      await tester.pumpAndSettle();
      expect(find.text('3/8'), findsOneWidget);

      await tester.drag(find.byType(PageView), const Offset(300, 0));
      await tester.pumpAndSettle();
      expect(find.text('2/8'), findsOneWidget);

      expect(_taps(), 0, reason: 'swiping photos must not open the listing');
    });

    testWidgets('all photos are reachable — no cap on the count', (tester) async {
      await pumpCarousel(tester, urls(14));
      for (var i = 0; i < 13; i++) {
        await tester.drag(find.byType(PageView), const Offset(-300, 0));
        await tester.pumpAndSettle();
      }
      expect(find.text('14/14'), findsOneWidget);
      expect(find.text('photo 13'), findsOneWidget);
      // Dots stay a compact window of five however many photos there are.
      expect(find.byType(AnimatedContainer), findsNWidgets(5));
    });

    testWidgets('a tap opens the listing; a swipe does not', (tester) async {
      await pumpCarousel(tester, urls(3));
      await tester.tap(find.byType(PageView));
      await tester.pump();
      expect(_taps(), 1);

      await tester.drag(find.byType(PageView), const Offset(-300, 0));
      await tester.pumpAndSettle();
      expect(_taps(), 1);
    });

    testWidgets('single photo: no counter, no dots, still tappable', (tester) async {
      await pumpCarousel(tester, urls(1));
      expect(find.text('1/1'), findsNothing);
      expect(find.byType(AnimatedContainer), findsNothing);
      expect(find.text('photo 0'), findsOneWidget);
      await tester.tap(find.byType(PageView));
      expect(_taps(), 1);
    });

    testWidgets('no photos: placeholder instead of an empty pager', (tester) async {
      await pumpCarousel(tester, const []);
      expect(find.byType(PageView), findsNothing);
      expect(find.byIcon(Icons.directions_car), findsOneWidget);
      await tester.tap(find.byIcon(Icons.directions_car));
      expect(_taps(), 1);
    });

    testWidgets('RTL: swiping the other way advances, counter stays n/total', (tester) async {
      await pumpCarousel(tester, urls(4), direction: TextDirection.rtl);
      expect(find.text('1/4'), findsOneWidget);
      // In RTL the next page sits to the left, so the finger moves right.
      await tester.drag(find.byType(PageView), const Offset(300, 0));
      await tester.pumpAndSettle();
      expect(find.text('2/4'), findsOneWidget);
    });

    testWidgets('desktop: arrows step through photos; hidden on phones', (tester) async {
      await pumpCarousel(tester, urls(3));
      expect(find.bySemanticsLabel('Next photo'), findsNothing, reason: 'default test platform is Android');

      debugDefaultTargetPlatformOverride = TargetPlatform.windows;
      await pumpCarousel(tester, urls(3));
      await tester.pump();
      expect(find.byIcon(Icons.chevron_right), findsOneWidget);
      expect(find.byIcon(Icons.chevron_left), findsNothing, reason: 'no "previous" on the first photo');

      await tester.tap(find.byIcon(Icons.chevron_right));
      await tester.pumpAndSettle();
      expect(find.text('2/3'), findsOneWidget);
      expect(find.byIcon(Icons.chevron_left), findsOneWidget);
      expect(_taps(), 0, reason: 'arrows must not open the listing');

      await tester.tap(find.byIcon(Icons.chevron_right));
      await tester.pumpAndSettle();
      expect(find.text('3/3'), findsOneWidget);
      expect(find.byIcon(Icons.chevron_right), findsNothing, reason: 'no "next" on the last photo');
      debugDefaultTargetPlatformOverride = null;
    });
  });

  group('ReelVideo states', () {
    Future<void> pumpVideo(WidgetTester tester, {String? url, required bool supported}) {
      return tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SizedBox(
              width: 300,
              height: 375,
              child: ReelVideo(reelId: 1, videoUrl: url, strings: AppStrings.en, supported: supported),
            ),
          ),
        ),
      );
    }

    testWidgets('missing video URL is reported, not shown as playable', (tester) async {
      await pumpVideo(tester, url: null, supported: true);
      expect(find.text('Video unavailable'), findsOneWidget);
      expect(find.byIcon(Icons.play_circle_fill_rounded), findsNothing);
    });

    testWidgets('unsupported platform offers to open the video instead', (tester) async {
      await pumpVideo(tester, url: 'https://videos.example.com/a.mp4', supported: false);
      expect(find.text('In-app video playback is not available on this device'), findsOneWidget);
      expect(find.text('Open video'), findsOneWidget);
    });

    testWidgets('supported platform starts idle with a play button (nothing loads until pressed)', (tester) async {
      await pumpVideo(tester, url: 'https://videos.example.com/a.mp4', supported: true);
      expect(find.byIcon(Icons.play_circle_fill_rounded), findsOneWidget);
      expect(find.byType(CircularProgressIndicator), findsNothing);
    });
  });

  group('relativeTime', () {
    final now = DateTime.utc(2026, 10, 9, 12);

    test('SQLite timestamps are read as UTC', () {
      expect(parseBackendTime('2026-07-26 00:04:43'), DateTime.utc(2026, 7, 26, 0, 4, 43));
      expect(parseBackendTime('2026-07-26T00:04:43Z'), DateTime.utc(2026, 7, 26, 0, 4, 43));
      expect(parseBackendTime(''), isNull);
      expect(parseBackendTime(null), isNull);
      expect(parseBackendTime('not a date'), isNull);
    });

    test('English', () {
      expect(relativeTime('2026-10-09 11:59:40', arabic: false, now: now), 'just now');
      expect(relativeTime('2026-10-09 11:15:00', arabic: false, now: now), '45 minutes ago');
      expect(relativeTime('2026-10-09 11:00:00', arabic: false, now: now), '1 hour ago');
      expect(relativeTime('2026-10-06 12:00:00', arabic: false, now: now), '3 days ago');
      expect(relativeTime('2026-07-26 00:04:43', arabic: false, now: now), '2 months ago');
      expect(relativeTime('2024-10-01 00:00:00', arabic: false, now: now), '2 years ago');
    });

    test('Arabic number agreement', () {
      expect(relativeTime('2026-10-09 11:00:00', arabic: true, now: now), 'منذ ساعة');
      expect(relativeTime('2026-10-09 10:00:00', arabic: true, now: now), 'منذ ساعتين');
      expect(relativeTime('2026-10-06 12:00:00', arabic: true, now: now), 'منذ 3 أيام');
      expect(relativeTime('2026-09-25 12:00:00', arabic: true, now: now), 'منذ 14 يوم');
      expect(relativeTime('2026-07-26 00:04:43', arabic: true, now: now), 'منذ شهرين');
    });

    test('unknown or future times give no label rather than a made-up one', () {
      expect(relativeTime(null, arabic: true, now: now), isNull);
      expect(relativeTime('garbage', arabic: false, now: now), isNull);
      expect(relativeTime('2026-10-10 00:00:00', arabic: false, now: now), 'just now');
    });
  });

  group('DealerReel.fromJson (GET /api/reels row)', () {
    test('full row', () {
      final reel = DealerReel.fromJson({
        'id': 2,
        'dealer_id': 3,
        'video_url': 'https://videos.example.com/b.mp4',
        'caption': 'Ghost',
        'car_id': 6,
        'views': 3,
        'likes': 1,
        'created_at': '2026-07-26 00:04:44',
        'dealer_name': 'Rotana Motors',
        'dealer_logo': 'https://api.dicebear.com/7.x/initials/svg?seed=Rotana%20Motors',
        'make': 'Rolls-Royce',
        'model': 'Ghost',
        'is_liked': 1,
      });
      expect(reel.carId, 6);
      expect(reel.views, 3);
      expect(reel.likes, 1);
      expect(reel.isLiked, isTrue);
      expect(reel.dealerName, 'Rotana Motors');
      expect(reel.make, 'Rolls-Royce');
    });

    test('reel with no caption, car or counters', () {
      final reel = DealerReel.fromJson({
        'id': 9,
        'dealer_id': 1,
        'video_url': '/uploads/reels/reel-1.mp4',
        'caption': null,
        'car_id': null,
        'views': null,
        'likes': null,
        'created_at': null,
        'make': null,
        'model': null,
        'is_liked': 0,
      });
      expect(reel.caption, isNull);
      expect(reel.carId, isNull);
      expect(reel.views, 0);
      expect(reel.likes, 0);
      expect(reel.isLiked, isFalse);
    });
  });
}
