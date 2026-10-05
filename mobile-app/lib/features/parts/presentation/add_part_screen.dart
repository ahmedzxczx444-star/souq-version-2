import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/providers/language_provider.dart';
import '../../../shared/widgets/coming_soon_screen.dart';

/// TODO(add-part): mirrors src/screens/AddPartScreen.tsx — POST /api/parts
/// (dealer only, routes/parts.ts). Reuse POST /api/cars/upload for images
/// (routes/parts.ts stores image URLs only; the `uploads/parts` dir it
/// creates is currently unused — see the exploration notes in this repo's
/// migration report).
class AddPartScreen extends ConsumerWidget {
  const AddPartScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = ref.watch(stringsProvider);
    return ComingSoonScreen(title: 'Add Part', strings: strings, icon: Icons.add_box_rounded);
  }
}
