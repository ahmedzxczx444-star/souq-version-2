import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/providers/language_provider.dart';
import '../../../shared/widgets/coming_soon_screen.dart';

/// TODO(add-car): mirrors src/screens/AddCarScreen.tsx — POST /api/cars
/// (JSON) after POST /api/cars/upload (multipart, field "images", ≤10
/// files/5MB/jpeg-png-webp, dealer-only — see server.ts:1785). Needs an
/// image_picker-based flow; that dependency isn't in Phase 1's pubspec yet.
class AddCarScreen extends ConsumerWidget {
  const AddCarScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = ref.watch(stringsProvider);
    return ComingSoonScreen(title: 'Add Car', strings: strings, icon: Icons.add_road_rounded);
  }
}
