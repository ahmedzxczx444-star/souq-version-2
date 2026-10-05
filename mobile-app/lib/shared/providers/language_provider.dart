import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/l10n/app_strings.dart';
import 'core_providers.dart';

class LanguageNotifier extends Notifier<AppLanguage> {
  @override
  AppLanguage build() {
    final prefs = ref.watch(appPrefsProvider);
    return prefs.language == 'en' ? AppLanguage.en : AppLanguage.ar;
  }

  Future<void> toggle() async {
    final next = state == AppLanguage.ar ? AppLanguage.en : AppLanguage.ar;
    state = next;
    await ref.read(appPrefsProvider).setLanguage(next == AppLanguage.ar ? 'ar' : 'en');
  }
}

final languageProvider = NotifierProvider<LanguageNotifier, AppLanguage>(LanguageNotifier.new);

final stringsProvider = Provider<AppStrings>((ref) => AppStrings.of(ref.watch(languageProvider)));
