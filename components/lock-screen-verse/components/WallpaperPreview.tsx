import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { WallpaperTheme } from '../constants/wallpaperThemes';

interface Props {
  wallpaperRef: React.RefObject<View | null>;
  theme: WallpaperTheme;
  verseText: string;
  verseReference: string;
}

const WallpaperPreview = ({
  wallpaperRef,
  theme,
  verseText,
  verseReference,
}: Props) => {
  return (
    <View
      ref={wallpaperRef}
      collapsable={false}
      style={[styles.wallpaper, { backgroundColor: theme.background }]}
    >
      <View
        style={[styles.wallpaperGlowTop, { backgroundColor: theme.glowTop }]}
      />
      <View
        style={[
          styles.wallpaperGlowBottom,
          { backgroundColor: theme.glowBottom },
        ]}
      />
      <View style={styles.lockBar} />
      <View style={styles.verseBlock}>
        <View style={styles.logoContainer}>
          <MaterialCommunityIcons
            name="hands-pray"
            size={18}
            color={theme.accentColor}
          />
          <Text style={[styles.appNameText, { color: theme.accentColor }]}>
            هنا راحتي
          </Text>
        </View>
        <Text style={[styles.verseText, { color: theme.textColor }]}>
          {verseText}
        </Text>
        <View style={styles.referencePill}>
          <Text style={[styles.referenceText, { color: theme.textColor }]}>
            {verseReference}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wallpaper: {
    width: '100%',
    aspectRatio: 9 / 16,
    borderRadius: 28,
    overflow: 'hidden',
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 30,
    justifyContent: 'space-between',
  },
  wallpaperGlowTop: {
    position: 'absolute',
    top: -90,
    right: -58,
    width: 210,
    height: 210,
    borderRadius: 105,
  },
  wallpaperGlowBottom: {
    position: 'absolute',
    bottom: -82,
    left: -70,
    width: 220,
    height: 220,
    borderRadius: 110,
  },
  lockBar: {
    alignSelf: 'center',
    width: 72,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.26)',
  },
  verseBlock: { alignItems: 'center', paddingBottom: 34 },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  appNameText: { fontSize: 15, fontWeight: '900', letterSpacing: 0.5 },
  verseText: {
    fontSize: 20,
    lineHeight: 34,
    fontWeight: '900',
    textAlign: 'center',
  },
  referencePill: {
    marginTop: 18,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  referenceText: { fontSize: 13, fontWeight: '900' },
});

export default WallpaperPreview;
