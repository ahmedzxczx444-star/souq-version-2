import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'app_colors.dart';

/// Text theme built on Cairo (Arabic, primary per src/index.css `font-arabic`
/// on <body>) with Inter as the Latin fallback — matching the website's
/// `font-sans`/`font-arabic` Tailwind theme tokens.
class AppTheme {
  AppTheme._();

  static TextTheme _textTheme(TextTheme base) {
    return GoogleFonts.cairoTextTheme(base).apply(
      bodyColor: AppColors.gray900,
      displayColor: AppColors.gray900,
    );
  }

  static ThemeData light() {
    final base = ThemeData.light(useMaterial3: true);
    return base.copyWith(
      scaffoldBackgroundColor: AppColors.white,
      colorScheme: base.colorScheme.copyWith(
        primary: AppColors.emeraldAccent,
        secondary: AppColors.emerald500,
        surface: AppColors.white,
        error: AppColors.red500,
      ),
      textTheme: _textTheme(base.textTheme),
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.white,
        foregroundColor: AppColors.gray900,
        elevation: 0,
        centerTitle: false,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.black,
          foregroundColor: AppColors.white,
          padding: const EdgeInsets.symmetric(vertical: 16),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          textStyle: GoogleFonts.cairo(fontWeight: FontWeight.w900, fontSize: 14),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.gray50,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: AppColors.gray100),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: AppColors.gray100),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: AppColors.black, width: 1.5),
        ),
        hintStyle: const TextStyle(color: AppColors.gray400),
      ),
      dividerColor: AppColors.gray100,
    );
  }
}
