import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/providers/language_provider.dart';
import '../../../shared/widgets/coming_soon_screen.dart';

/// TODO(reels): mirrors src/screens/ReelsScreen.tsx — a TikTok-style
/// vertical PageView over GET /api/reels, using `video_player` (already a
/// dependency) with view/like posted to /api/reels/:id/view and
/// /api/reels/:id/like. Left as a placeholder for the follow-up pass that
/// wires up video playback + caching.
class ReelsScreen extends ConsumerWidget {
  const ReelsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = ref.watch(stringsProvider);
    return ComingSoonScreen(title: strings.reels, strings: strings, icon: Icons.play_circle_outline_rounded);
  }
}
