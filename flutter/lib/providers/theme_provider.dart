// ─── Theme Provider ──────────────────────────────────────────────────────────
// Mirrors lib/nightMode.tsx – persists the user's light/dark preference.

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

const _kNightModeKey = 'app_night_mode_enabled';

class ThemeProvider extends ChangeNotifier {
  ThemeMode _themeMode = ThemeMode.light;

  ThemeMode get themeMode => _themeMode;
  bool get isNightMode => _themeMode == ThemeMode.dark;

  ThemeProvider() {
    _loadFromPrefs();
  }

  Future<void> _loadFromPrefs() async {
    final prefs = await SharedPreferences.getInstance();
    final enabled = prefs.getBool(_kNightModeKey) ?? false;
    _themeMode = enabled ? ThemeMode.dark : ThemeMode.light;
    notifyListeners();
  }

  Future<void> setNightMode(bool enabled) async {
    _themeMode = enabled ? ThemeMode.dark : ThemeMode.light;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_kNightModeKey, enabled);
  }

  Future<void> toggleNightMode() => setNightMode(!isNightMode);
}
