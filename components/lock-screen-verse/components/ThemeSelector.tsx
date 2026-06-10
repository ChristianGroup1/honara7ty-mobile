import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { WALLPAPER_THEMES, WallpaperTheme } from '../constants/wallpaperThemes';

interface Props {
  selectedTheme: WallpaperTheme;
  onSelectTheme: (theme: WallpaperTheme) => void;
  accentColor: string;
  textColor: string;
  cardColor: string;
  borderColor: string;
}

const ThemeSelector = ({
  selectedTheme,
  onSelectTheme,
  accentColor,
  textColor,
  cardColor,
  borderColor,
}: Props) => {
  return (
    <>
      <View style={styles.sectionHeader}>
        <MaterialCommunityIcons
          name="palette-outline"
          size={18}
          color={accentColor}
        />
        <Text style={[styles.sectionTitle, { color: textColor }]}>
          اختر الخلفية
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.themesRow}
      >
        {WALLPAPER_THEMES.map(theme => (
          <TouchableOpacity
            key={theme.id}
            onPress={() => onSelectTheme(theme)}
            style={[
              styles.themeCard,
              { backgroundColor: cardColor, borderColor },
              selectedTheme.id === theme.id && {
                borderColor: accentColor,
                borderWidth: 2,
              },
            ]}
          >
            <View
              style={[
                styles.themePreview,
                { backgroundColor: theme.background },
              ]}
            >
              <View
                style={[styles.themeGlow, { backgroundColor: theme.glowTop }]}
              />
              <Text
                style={[styles.themeAccentDot, { color: theme.accentColor }]}
              >
                ✦
              </Text>
            </View>
            <Text style={[styles.themeName, { color: textColor }]}>
              {theme.name}
            </Text>
            {selectedTheme.id === theme.id && (
              <View
                style={[
                  styles.themeCheckBadge,
                  { backgroundColor: accentColor },
                ]}
              >
                <MaterialCommunityIcons name="check" size={12} color="#FFF" />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </>
  );
};

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  themesRow: { paddingHorizontal: 4, gap: 10, marginBottom: 20 },
  themeCard: {
    alignItems: 'center',
    gap: 6,
    borderRadius: 14,
    padding: 6,
    borderWidth: 1,
    position: 'relative',
  },
  themePreview: {
    width: 60,
    height: 80,
    borderRadius: 10,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeGlow: {
    position: 'absolute',
    top: -15,
    right: -15,
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  themeAccentDot: { fontSize: 20, fontWeight: '900' },
  themeName: { fontSize: 11, fontWeight: '600' },
  themeCheckBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ThemeSelector;
