import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/providers/language_provider.dart';
import '../../../shared/widgets/coming_soon_screen.dart';

/// TODO(ai-search): mirrors src/screens/SmartAIScreen.tsx — chat UI over
/// POST /api/smart-search/chat (domain-routed cars+parts AI search,
/// server.ts:1163) or /api/ai-search/chat (cars-only, server.ts:1030).
/// Needs a chat bubble list + streaming-friendly state, both public
/// (no-auth) endpoints.
class AiSearchScreen extends ConsumerWidget {
  const AiSearchScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = ref.watch(stringsProvider);
    return ComingSoonScreen(title: 'AI Search', strings: strings, icon: Icons.auto_awesome_rounded);
  }
}
