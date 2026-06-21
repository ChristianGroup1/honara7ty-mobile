import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { captureRef } from 'react-native-view-shot';
import RNShare from 'react-native-share';
import { getStrings } from '../../localization';
import { useNightMode } from '../../lib/nightMode';
import { getDailyVerse } from '../../lib/dailyVerse';
import { palette, radius, shadow, spacing } from '../shared/designTokens';

const DailyVerseCard = () => {
  const { colors } = useNightMode();
  const { height } = useWindowDimensions();
  const strings = getStrings();
  const verse = useMemo(
    () =>
      getDailyVerse(strings.lockScreenVerse.verses) ??
      strings.lockScreenVerse.verses[0],
    [strings.lockScreenVerse.verses],
  );
  const cardRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);
  const styles = useMemo(() => createStyles(colors, height), [colors, height]);

  const shareCard = useCallback(async () => {
    if (!cardRef.current || sharing) {
      return;
    }

    setSharing(true);
    try {
      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });
      const fileUri = Platform.OS === 'android' ? `file://${uri}` : uri;
      await RNShare.open({
        title: strings.home.dailyVerseShareTitle,
        message: `${verse.text}\n${verse.reference}`,
        url: fileUri,
        type: 'image/png',
        failOnCancel: false,
      });
    } catch (error: any) {
      if (error?.message?.includes?.('cancel')) {
        return;
      }
      Alert.alert(
        strings.home.dailyVerseShareErrorTitle,
        strings.home.dailyVerseShareErrorMessage,
      );
    } finally {
      setSharing(false);
    }
  }, [sharing, strings.home, verse.reference, verse.text]);

  return (
    <View style={styles.card}>
      <View ref={cardRef} collapsable={false} style={styles.captureContent}>
        <View style={styles.captureInner}>
          <View style={styles.glowTop} />
          <View style={styles.glowBottom} />
          <View style={styles.textureLineTop} />
          <View style={styles.textureLineBottom} />

          <View style={styles.headerRow}>
            <View style={styles.headerText}>
              <Text style={styles.eyebrow}>
                {strings.home.dailyVerseEyebrow}
              </Text>
              <Text style={styles.title}>{strings.home.dailyVerseTitle}</Text>
            </View>
            <View style={styles.iconWrap}>
              <MaterialCommunityIcons
                name="book-open-page-variant"
                size={22}
                color="#FFF"
              />
            </View>
          </View>

          <View style={styles.versePanel}>
            <Text style={styles.quoteMark}>“</Text>
            <Text style={styles.verseText}>{verse.text}</Text>
            <Text style={styles.quoteMarkEnd}>”</Text>
          </View>

          <View style={styles.footerRow}>
            <View style={styles.referencePill}>
              <Text style={styles.referenceText}>{verse.reference}</Text>
            </View>
            <View style={styles.brandWrap}>
              <MaterialCommunityIcons
                name="hands-pray"
                size={14}
                color="rgba(255,255,255,0.72)"
              />
              <Text style={styles.appName}>هنا راحتي</Text>
            </View>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={styles.inlineShareButton}
        activeOpacity={0.84}
        onPress={shareCard}
        disabled={sharing}
      >
        {sharing ? (
          <ActivityIndicator color="#FFF" size="small" />
        ) : (
          <MaterialCommunityIcons
            name="share-variant-outline"
            size={19}
            color="#FFF"
          />
        )}
      </TouchableOpacity>
    </View>
  );
};

const createStyles = (
  colors: ReturnType<typeof useNightMode>['colors'],
  screenHeight: number,
) =>
  StyleSheet.create({
    card: {
      borderRadius: radius.xl,
      position: 'relative',
      marginBottom: Math.min(120, Math.max(56, screenHeight * 0.19)),
      ...shadow.hero,
    },
    captureContent: {
      backgroundColor: colors.header,
      borderRadius: radius.xl,
      overflow: 'hidden',
    },
    captureInner: {
      padding: spacing.xl,
      overflow: 'hidden',
      minHeight: 250,
      justifyContent: 'space-between',
    },
    glowTop: {
      position: 'absolute',
      top: -86,
      right: -54,
      width: 220,
      height: 220,
      borderRadius: 110,
      backgroundColor: 'rgba(120,161,189,0.24)',
    },
    glowBottom: {
      position: 'absolute',
      bottom: -96,
      left: -72,
      width: 240,
      height: 240,
      borderRadius: 120,
      backgroundColor: 'rgba(255,255,255,0.07)',
    },
    textureLineTop: {
      position: 'absolute',
      top: 74,
      left: -20,
      right: -20,
      height: 1,
      backgroundColor: 'rgba(255,255,255,0.08)',
      transform: [{ rotate: '-3deg' }],
    },
    textureLineBottom: {
      position: 'absolute',
      bottom: 62,
      left: -20,
      right: -20,
      height: 1,
      backgroundColor: 'rgba(255,255,255,0.07)',
      transform: [{ rotate: '3deg' }],
    },
    headerRow: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    iconWrap: {
      width: 46,
      height: 46,
      borderRadius: 18,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.22)',
    },
    headerText: { flex: 1, minWidth: 0 },
    eyebrow: {
      color: palette.gold,
      fontSize: 12,
      fontWeight: '900',
      textAlign: 'left',
      marginBottom: 2,
    },
    title: {
      color: '#FFF',
      fontSize: 18,
      fontWeight: '900',
      textAlign: 'left',
    },
    versePanel: {
      marginVertical: spacing.xl,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.xl,
      borderRadius: radius.lg,
      backgroundColor: 'rgba(255,255,255,0.09)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.12)',
      position: 'relative',
    },
    verseText: {
      color: '#FFF',
      fontSize: 21,
      lineHeight: 36,
      fontWeight: '900',
      textAlign: 'center',
      writingDirection: 'rtl',
    },
    quoteMark: {
      position: 'absolute',
      top: -10,
      right: 14,
      color: 'rgba(255,255,255,0.22)',
      fontSize: 48,
      fontWeight: '900',
      lineHeight: 52,
    },
    quoteMarkEnd: {
      position: 'absolute',
      bottom: -20,
      left: 14,
      color: 'rgba(255,255,255,0.18)',
      fontSize: 48,
      fontWeight: '900',
      lineHeight: 52,
    },
    footerRow: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    brandWrap: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 6,
      flexShrink: 0,
    },
    appName: {
      color: 'rgba(255,255,255,0.72)',
      fontSize: 12,
      fontWeight: '900',
    },
    referencePill: {
      borderRadius: radius.pill,
      paddingHorizontal: spacing.lg,
      paddingVertical: 9,
      backgroundColor: 'rgba(120,161,189,0.20)',
      borderWidth: 1,
      borderColor: 'rgba(120,161,189,0.34)',
      flexShrink: 1,
    },
    referenceText: {
      color: '#FFF',
      fontSize: 13,
      fontWeight: '900',
    },
    inlineShareButton: {
      position: 'absolute',
      top: spacing.lg,
      right: spacing.lg,
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.12)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.18)',
    },
  });

export default React.memo(DailyVerseCard);
