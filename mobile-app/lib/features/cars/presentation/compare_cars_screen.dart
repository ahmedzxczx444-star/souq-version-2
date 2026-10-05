import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/providers/language_provider.dart';
import '../../../shared/widgets/coming_soon_screen.dart';

/// TODO(compare): no direct React source (there is no compare-cars screen
/// in src/screens today — Car.comparisonGroup in src/types.ts hints at a
/// planned "a"/"b" comparison UI). Design + build against GET /api/cars/:id
/// for two selected cars side by side.
class CompareCarsScreen extends ConsumerWidget {
  const CompareCarsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = ref.watch(stringsProvider);
    return ComingSoonScreen(title: 'Compare', strings: strings, icon: Icons.compare_arrows_rounded);
  }
}
