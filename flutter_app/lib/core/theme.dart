// Official Stitch youth palette — هنا راحتى Color Palette Tokens

import 'package:flutter/material.dart';

class AppColors {
  // Foundations
  static const Color navy = Color(0xFF0F172A); // primary text / anchors
  static const Color steel = Color(0xFF0EA5E9); // sky accent (journal)
  static const Color steelLight = Color(0xFFE0F2FE);
  static const Color steelDark = Color(0xFF0369A1);
  static const Color champagne = Color(0xFFF59E0B); // amber / daily question
  static const Color champagneSoft = Color(0xFFFFFBEB);

  /// Legacy alias — maps to sky accent.
  static const Color accent = steel;

  /// Legacy alias — maps to amber.
  static const Color gold = champagne;

  static const headerGradientLight = [
    Color(0xFF0F172A),
    Color(0xFF1E293B),
    Color(0xFF1E3A8A),
  ];
  static const headerGradientDark = [
    Color(0xFF020617),
    Color(0xFF0F172A),
    Color(0xFF1E293B),
  ];

  // Light theme foundations
  static const Color lightBackground = Color(0xFFF8FAFC);
  static const Color lightCard = Color(0xFFFFFFFF);
  static const Color lightCardMuted = Color(0xFFF1F5F9);
  static const Color lightHeader = Color(0xFF0F172A);
  static const Color lightText = Color(0xFF0F172A);
  static const Color lightMutedText = Color(0xFF64748B);
  static const Color lightBorder = Color(0xFFE2E8F0);
  static const Color lightTabInactive = Color(0x73FFFFFF);
  static const Color success = Color(0xFF10B981);
  static const Color warning = Color(0xFFF59E0B);
  static const Color danger = Color(0xFFF43F5E);

  // Dark theme
  static const Color darkBackground = Color(0xFF020617);
  static const Color darkCard = Color(0xFF0F172A);
  static const Color darkCardMuted = Color(0xFF1E293B);
  static const Color darkHeader = Color(0xFF020617);
  static const Color darkText = Color(0xFFF8FAFC);
  static const Color darkMutedText = Color(0xFF94A3B8);
  static const Color darkBorder = Color(0xFF334155);
  static const Color darkTabInactive = Color(0x9DDCE2EE);

  // Auth screens
  static const Color authNavy = Color(0xFF0F172A);
  static const Color authGold = champagne;

  // Feature gradients (official Stitch tokens)
  static const prayerStart = Color(0xFFF43F5E);
  static const prayerEnd = Color(0xFFF472B6);
  static const journalStart = Color(0xFF0EA5E9);
  static const journalEnd = Color(0xFF22D3EE);
  static const dailyQuestionStart = Color(0xFFF59E0B);
  static const dailyQuestionEnd = Color(0xFFD97706);
  static const groupsStart = Color(0xFF10B981);
  static const groupsEnd = Color(0xFF2DD4BF);
  static const settingsStart = Color(0xFF4F46E5);
  static const settingsEnd = Color(0xFF8B5CF6);
  static const memorizationStart = Color(0xFFF59E0B);
  static const memorizationEnd = Color(0xFFFB923C);
  static const scriptureStart = Color(0xFF1E3A8A);
  static const scriptureEnd = Color(0xFF020617);

  static const prayerGradient = [prayerStart, prayerEnd];
  static const journalGradient = [journalStart, journalEnd];
  static const dailyQuestionGradient = [dailyQuestionStart, dailyQuestionEnd];
  static const groupsGradient = [groupsStart, groupsEnd];
  static const settingsGradient = [settingsStart, settingsEnd];
  static const memorizationGradient = [memorizationStart, memorizationEnd];
  static const scriptureGradient = [scriptureStart, scriptureEnd];
}

class AppFonts {
  static const String ui = 'Tajawal';
  static const String verse = 'Amiri';
}

class AppSpacing {
  static const double xs = 4;
  static const double sm = 8;
  static const double md = 16;
  static const double lg = 20;
  static const double xl = 28;
  static const double section = 32;
  static const double page = 20;
}

class AppRadius {
  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;
  static const double xl = 22;
  static const double xxl = 26;
  static const double full = 9999;

  static BorderRadius get card => BorderRadius.circular(xl);
  static BorderRadius get control => BorderRadius.circular(md);
  static BorderRadius get sheet =>
      const BorderRadius.vertical(top: Radius.circular(xxl));
}

class AppShadows {
  static List<BoxShadow> get card => [
        BoxShadow(
          color: AppColors.navy.withValues(alpha: 0.03),
          blurRadius: 20,
          offset: const Offset(0, 4),
          spreadRadius: -2,
        ),
      ];

  static List<BoxShadow> get soft => [
        BoxShadow(
          color: AppColors.navy.withValues(alpha: 0.025),
          blurRadius: 14,
          offset: const Offset(0, 3),
          spreadRadius: -1,
        ),
      ];
}

class AppMotion {
  static const Duration stateChange = Duration(milliseconds: 150);
  static const Duration surfaceEnter = Duration(milliseconds: 240);
  static const Duration surfaceExit = Duration(milliseconds: 150);
  static const Curve serene = Cubic(0.2, 0, 0, 1);
}

// ─── Theme Data ─────────────────────────────────────────────────────────────

ThemeData buildLightTheme() {
  const colorScheme = ColorScheme.light(
    primary: AppColors.navy,
    onPrimary: Colors.white,
    secondary: AppColors.steel,
    onSecondary: Colors.white,
    surface: AppColors.lightCard,
    onSurface: AppColors.lightText,
    outline: AppColors.lightBorder,
  );

  return ThemeData(
    useMaterial3: true,
    brightness: Brightness.light,
    colorScheme: colorScheme,
    scaffoldBackgroundColor: AppColors.lightBackground,
    fontFamily: AppFonts.ui,
    appBarTheme: const AppBarTheme(
      backgroundColor: AppColors.lightHeader,
      foregroundColor: Colors.white,
      elevation: 0,
      centerTitle: true,
      titleTextStyle: TextStyle(
        fontFamily: AppFonts.ui,
        color: Colors.white,
        fontSize: 18,
        fontWeight: FontWeight.w700,
      ),
    ),
    bottomNavigationBarTheme: const BottomNavigationBarThemeData(
      backgroundColor: AppColors.lightHeader,
      selectedItemColor: AppColors.champagne,
      unselectedItemColor: AppColors.lightTabInactive,
      type: BottomNavigationBarType.fixed,
      selectedLabelStyle: TextStyle(
        fontFamily: AppFonts.ui,
        fontSize: 11,
        fontWeight: FontWeight.w600,
      ),
      unselectedLabelStyle: TextStyle(
        fontFamily: AppFonts.ui,
        fontSize: 11,
        fontWeight: FontWeight.w600,
      ),
    ),
    cardTheme: CardThemeData(
      color: AppColors.lightCard,
      elevation: 0,
      surfaceTintColor: Colors.transparent,
      shadowColor: AppColors.navy.withValues(alpha: 0.03),
      shape: RoundedRectangleBorder(
        borderRadius: AppRadius.card,
        side: const BorderSide(color: AppColors.lightBorder),
      ),
    ),
    dialogTheme: const DialogThemeData(
      backgroundColor: AppColors.lightCard,
      surfaceTintColor: Colors.transparent,
      elevation: 8,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.all(Radius.circular(AppRadius.xxl)),
      ),
      titleTextStyle: TextStyle(
        fontFamily: AppFonts.ui,
        color: AppColors.lightText,
        fontSize: 18,
        fontWeight: FontWeight.w700,
        height: 1.4,
      ),
      contentTextStyle: TextStyle(
        fontFamily: AppFonts.ui,
        color: AppColors.lightMutedText,
        fontSize: 15,
        height: 1.65,
      ),
    ),
    bottomSheetTheme: const BottomSheetThemeData(
      backgroundColor: AppColors.lightCard,
      modalBackgroundColor: AppColors.lightCard,
      surfaceTintColor: Colors.transparent,
      // Custom sheets use youthSheetHandle(); avoid the Material handle
      // floating as a blue bar on transparent full-height sheets.
      showDragHandle: false,
      dragHandleColor: Color(0xFFCBD5E1),
      dragHandleSize: Size(36, 4),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.xxl)),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppColors.lightCardMuted,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      border: OutlineInputBorder(
        borderRadius: AppRadius.control,
        borderSide: const BorderSide(color: AppColors.lightBorder),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: AppRadius.control,
        borderSide: const BorderSide(color: AppColors.lightBorder),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: AppRadius.control,
        borderSide: const BorderSide(color: AppColors.steel, width: 1.5),
      ),
    ),
    snackBarTheme: const SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      backgroundColor: AppColors.navy,
      contentTextStyle: TextStyle(
        fontFamily: AppFonts.ui,
        color: Colors.white,
        fontSize: 14,
      ),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.all(Radius.circular(AppRadius.lg)),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        minimumSize: const Size(44, 48),
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
        backgroundColor: AppColors.navy,
        foregroundColor: Colors.white,
        textStyle: const TextStyle(
          fontFamily: AppFonts.ui,
          fontSize: 14,
          fontWeight: FontWeight.w700,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.lg),
        ),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        minimumSize: const Size(44, 48),
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
        foregroundColor: AppColors.navy,
        side: const BorderSide(color: AppColors.lightBorder),
        textStyle: const TextStyle(
          fontFamily: AppFonts.ui,
          fontSize: 14,
          fontWeight: FontWeight.w600,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.lg),
        ),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        minimumSize: const Size(44, 44),
        foregroundColor: AppColors.steelDark,
        textStyle: const TextStyle(
          fontFamily: AppFonts.ui,
          fontWeight: FontWeight.w700,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.md),
        ),
      ),
    ),
    dividerColor: AppColors.lightBorder,
    textTheme: _buildTextTheme(AppColors.lightText, AppColors.lightMutedText),
  );
}

ThemeData buildDarkTheme() {
  const colorScheme = ColorScheme.dark(
    primary: AppColors.champagne,
    onPrimary: AppColors.navy,
    secondary: AppColors.steel,
    onSecondary: Colors.white,
    surface: AppColors.darkCard,
    onSurface: AppColors.darkText,
    outline: AppColors.darkBorder,
  );

  return ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    colorScheme: colorScheme,
    scaffoldBackgroundColor: AppColors.darkBackground,
    fontFamily: AppFonts.ui,
    appBarTheme: const AppBarTheme(
      backgroundColor: AppColors.darkHeader,
      foregroundColor: Colors.white,
      elevation: 0,
      centerTitle: true,
      titleTextStyle: TextStyle(
        fontFamily: AppFonts.ui,
        color: Colors.white,
        fontSize: 18,
        fontWeight: FontWeight.w700,
      ),
    ),
    bottomNavigationBarTheme: const BottomNavigationBarThemeData(
      backgroundColor: AppColors.darkHeader,
      selectedItemColor: AppColors.champagne,
      unselectedItemColor: AppColors.darkTabInactive,
      type: BottomNavigationBarType.fixed,
      selectedLabelStyle: TextStyle(
        fontFamily: AppFonts.ui,
        fontSize: 11,
        fontWeight: FontWeight.w600,
      ),
      unselectedLabelStyle: TextStyle(
        fontFamily: AppFonts.ui,
        fontSize: 11,
        fontWeight: FontWeight.w600,
      ),
    ),
    cardTheme: CardThemeData(
      color: AppColors.darkCard,
      elevation: 0,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(
        borderRadius: AppRadius.card,
        side: const BorderSide(color: AppColors.darkBorder),
      ),
    ),
    dialogTheme: const DialogThemeData(
      backgroundColor: AppColors.darkCard,
      surfaceTintColor: Colors.transparent,
      elevation: 8,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.all(Radius.circular(AppRadius.xxl)),
      ),
      titleTextStyle: TextStyle(
        fontFamily: AppFonts.ui,
        color: AppColors.darkText,
        fontSize: 18,
        fontWeight: FontWeight.w700,
        height: 1.4,
      ),
      contentTextStyle: TextStyle(
        fontFamily: AppFonts.ui,
        color: AppColors.darkMutedText,
        fontSize: 15,
        height: 1.65,
      ),
    ),
    bottomSheetTheme: const BottomSheetThemeData(
      backgroundColor: AppColors.darkCard,
      modalBackgroundColor: AppColors.darkCard,
      surfaceTintColor: Colors.transparent,
      showDragHandle: false,
      dragHandleColor: Color(0xFF64748B),
      dragHandleSize: Size(36, 4),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.xxl)),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppColors.darkCardMuted,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      border: OutlineInputBorder(
        borderRadius: AppRadius.control,
        borderSide: const BorderSide(color: AppColors.darkBorder),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: AppRadius.control,
        borderSide: const BorderSide(color: AppColors.darkBorder),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: AppRadius.control,
        borderSide: const BorderSide(color: AppColors.steel, width: 1.5),
      ),
    ),
    snackBarTheme: const SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      backgroundColor: AppColors.darkCard,
      contentTextStyle: TextStyle(
        fontFamily: AppFonts.ui,
        color: AppColors.darkText,
        fontSize: 14,
      ),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.all(Radius.circular(AppRadius.lg)),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        minimumSize: const Size(44, 48),
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
        backgroundColor: AppColors.champagne,
        foregroundColor: AppColors.navy,
        textStyle: const TextStyle(
          fontFamily: AppFonts.ui,
          fontSize: 14,
          fontWeight: FontWeight.w700,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.lg),
        ),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        minimumSize: const Size(44, 48),
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
        foregroundColor: AppColors.darkText,
        side: const BorderSide(color: AppColors.darkBorder),
        textStyle: const TextStyle(
          fontFamily: AppFonts.ui,
          fontSize: 14,
          fontWeight: FontWeight.w600,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.lg),
        ),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        minimumSize: const Size(44, 44),
        foregroundColor: AppColors.champagne,
        textStyle: const TextStyle(
          fontFamily: AppFonts.ui,
          fontWeight: FontWeight.w700,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.md),
        ),
      ),
    ),
    dividerColor: AppColors.darkBorder,
    textTheme: _buildTextTheme(AppColors.darkText, AppColors.darkMutedText),
  );
}

TextTheme _buildTextTheme(Color primary, Color muted) {
  return TextTheme(
    displayLarge: TextStyle(
      fontFamily: AppFonts.verse,
      color: primary,
      fontSize: 26,
      fontWeight: FontWeight.w700,
      height: 36 / 26,
    ),
    displayMedium: TextStyle(
      fontFamily: AppFonts.verse,
      color: primary,
      fontSize: 22,
      fontWeight: FontWeight.w700,
      height: 30 / 22,
    ),
    headlineLarge: TextStyle(
      fontFamily: AppFonts.verse,
      color: primary,
      fontSize: 22,
      fontWeight: FontWeight.w700,
      height: 30 / 22,
    ),
    headlineMedium: TextStyle(
      fontFamily: AppFonts.ui,
      color: primary,
      fontSize: 18,
      fontWeight: FontWeight.w700,
      height: 26 / 18,
    ),
    headlineSmall: TextStyle(
      fontFamily: AppFonts.ui,
      color: primary,
      fontSize: 16,
      fontWeight: FontWeight.w700,
      height: 24 / 16,
    ),
    titleLarge: TextStyle(
      fontFamily: AppFonts.ui,
      color: primary,
      fontSize: 18,
      fontWeight: FontWeight.w700,
      height: 26 / 18,
    ),
    titleMedium: TextStyle(
      fontFamily: AppFonts.ui,
      color: primary,
      fontSize: 16,
      fontWeight: FontWeight.w700,
      height: 24 / 16,
    ),
    titleSmall: TextStyle(
      fontFamily: AppFonts.ui,
      color: primary,
      fontSize: 14,
      fontWeight: FontWeight.w700,
      height: 20 / 14,
    ),
    bodyLarge: TextStyle(
      fontFamily: AppFonts.verse,
      color: primary,
      fontSize: 20,
      fontWeight: FontWeight.w400,
      height: 36 / 20,
    ),
    bodyMedium: TextStyle(
      fontFamily: AppFonts.ui,
      color: primary,
      fontSize: 15,
      fontWeight: FontWeight.w400,
      height: 26 / 15,
    ),
    bodySmall: TextStyle(
      fontFamily: AppFonts.ui,
      color: muted,
      fontSize: 13,
      fontWeight: FontWeight.w400,
      height: 20 / 13,
    ),
    labelLarge: TextStyle(
      fontFamily: AppFonts.ui,
      color: primary,
      fontSize: 14,
      fontWeight: FontWeight.w700,
      height: 20 / 14,
    ),
    labelMedium: TextStyle(
      fontFamily: AppFonts.ui,
      color: muted,
      fontSize: 12,
      fontWeight: FontWeight.w500,
      height: 18 / 12,
    ),
    labelSmall: TextStyle(
      fontFamily: AppFonts.ui,
      color: muted,
      fontSize: 11,
      fontWeight: FontWeight.w500,
      height: 16 / 11,
    ),
  );
}

/// Verse / scripture text style helper.
TextStyle verseStyle({
  required Color color,
  double fontSize = 20,
  FontWeight fontWeight = FontWeight.w400,
  double height = 1.8,
}) {
  return TextStyle(
    fontFamily: AppFonts.verse,
    color: color,
    fontSize: fontSize,
    fontWeight: fontWeight,
    height: height,
  );
}
