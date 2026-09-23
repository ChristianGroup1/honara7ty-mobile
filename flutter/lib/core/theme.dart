// ─── App Colors ────────────────────────────────────────────────────────────
// Mirrors lib/nightMode.tsx from the React Native source.

import 'package:flutter/material.dart';

class AppColors {
  // Brand palette
  static const Color navy = Color(0xFF0A1124);
  static const Color accent = Color(0xFF78A1BD);
  static const Color gold = Color(0xFFE6D5A2);
  static const headerGradientLight = [
    Color(0xFF0A1124),
    Color(0xFF16243F),
    Color(0xFF33506E),
  ];
  static const headerGradientDark = [
    Color(0xFF0B1224),
    Color(0xFF111A2E),
    Color(0xFF1D2940),
  ];

  // Light theme
  static const Color lightBackground = Color(0xFFF2F4F8);
  static const Color lightCard = Color(0xFFFFFFFF);
  static const Color lightCardMuted = Color(0xFFF8FAFD);
  static const Color lightHeader = Color(0xFF0A1124);
  static const Color lightText = Color(0xFF0A1124);
  static const Color lightMutedText = Color(0xFF667085);
  static const Color lightBorder = Color(0xFFE3E8F1);
  static const Color lightTabInactive = Color(0x73FFFFFF);

  // Dark theme
  static const Color darkBackground = Color(0xFF0B1020);
  static const Color darkCard = Color(0xFF151E31);
  static const Color darkCardMuted = Color(0xFF1D2940);
  static const Color darkHeader = Color(0xFF111A2E);
  static const Color darkText = Color(0xFFF7FAFC);
  static const Color darkMutedText = Color(0xFFC0C8D6);
  static const Color darkBorder = Color(0xFF34425F);
  static const Color darkTabInactive = Color(0x9DDCE2EE);

  // Auth screens
  static const Color authNavy = Color(0xFF0A1124);
  static const Color authGold = Color(0xFFFDFCF9);
}

// ─── Theme Data ─────────────────────────────────────────────────────────────

ThemeData buildLightTheme() {
  const colorScheme = ColorScheme.light(
    primary: AppColors.navy,
    secondary: AppColors.accent,
    surface: AppColors.lightCard,
    onSurface: AppColors.lightText,
  );

  return ThemeData(
    useMaterial3: true,
    colorScheme: colorScheme,
    scaffoldBackgroundColor: AppColors.lightBackground,
    appBarTheme: const AppBarTheme(
      backgroundColor: AppColors.lightHeader,
      foregroundColor: Colors.white,
      elevation: 0,
    ),
    bottomNavigationBarTheme: const BottomNavigationBarThemeData(
      backgroundColor: AppColors.lightHeader,
      selectedItemColor: AppColors.accent,
      unselectedItemColor: AppColors.lightTabInactive,
      type: BottomNavigationBarType.fixed,
      selectedLabelStyle: TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
      unselectedLabelStyle:
          TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
    ),
    cardTheme: const CardThemeData(
      color: AppColors.lightCard,
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.all(Radius.circular(16)),
      ),
    ),
    dividerColor: AppColors.lightBorder,
    textTheme: _buildTextTheme(AppColors.lightText, AppColors.lightMutedText),
    fontFamily: 'System',
  );
}

ThemeData buildDarkTheme() {
  const colorScheme = ColorScheme.dark(
    primary: AppColors.accent,
    secondary: AppColors.accent,
    surface: AppColors.darkCard,
    onSurface: AppColors.darkText,
  );

  return ThemeData(
    useMaterial3: true,
    colorScheme: colorScheme,
    scaffoldBackgroundColor: AppColors.darkBackground,
    appBarTheme: const AppBarTheme(
      backgroundColor: AppColors.darkHeader,
      foregroundColor: Colors.white,
      elevation: 0,
    ),
    bottomNavigationBarTheme: const BottomNavigationBarThemeData(
      backgroundColor: AppColors.darkHeader,
      selectedItemColor: AppColors.accent,
      unselectedItemColor: AppColors.darkTabInactive,
      type: BottomNavigationBarType.fixed,
      selectedLabelStyle: TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
      unselectedLabelStyle:
          TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
    ),
    cardTheme: const CardThemeData(
      color: AppColors.darkCard,
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.all(Radius.circular(16)),
      ),
    ),
    dividerColor: AppColors.darkBorder,
    textTheme: _buildTextTheme(AppColors.darkText, AppColors.darkMutedText),
    fontFamily: 'System',
  );
}

TextTheme _buildTextTheme(Color primary, Color muted) {
  return TextTheme(
    displayLarge: TextStyle(color: primary, fontWeight: FontWeight.bold),
    displayMedium: TextStyle(color: primary, fontWeight: FontWeight.bold),
    bodyLarge: TextStyle(color: primary, fontSize: 16),
    bodyMedium: TextStyle(color: primary, fontSize: 14),
    bodySmall: TextStyle(color: muted, fontSize: 12),
    labelLarge: TextStyle(color: primary, fontWeight: FontWeight.w600),
    labelSmall: TextStyle(color: muted, fontSize: 11),
  );
}
