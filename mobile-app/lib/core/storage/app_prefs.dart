import 'package:shared_preferences/shared_preferences.dart';

/// Non-sensitive local preferences: first-run onboarding flag and language,
/// mirroring the website's `localStorage.getItem("lang")` in src/App.tsx.
class AppPrefs {
  AppPrefs(this._prefs);

  final SharedPreferences _prefs;

  static const _onboardingSeenKey = 'onboarding_seen';
  static const _langKey = 'lang';

  bool get hasSeenOnboarding => _prefs.getBool(_onboardingSeenKey) ?? false;

  Future<void> setSeenOnboarding() => _prefs.setBool(_onboardingSeenKey, true);

  String get language => _prefs.getString(_langKey) ?? 'ar';

  Future<void> setLanguage(String lang) => _prefs.setString(_langKey, lang);
}
