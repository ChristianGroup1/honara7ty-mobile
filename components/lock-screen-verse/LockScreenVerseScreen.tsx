import React, { useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { getStrings } from '../../localization';
import { AppTheme, useNightMode } from '../../lib/nightMode';
import AppHeader, { AppHeaderAction } from '../shared/AppHeader';
import { useLockScreenVerse } from './hooks/useLockScreenVerse';
import WallpaperPreview from './components/WallpaperPreview';
import ThemeSelector from './components/ThemeSelector';
import VersePicker from './components/VersePicker';

const LockScreenVerseScreen = ({ navigation, route }: any) => {
  const strings = getStrings().lockScreenVerse;
  const insets = useSafeAreaInsets();
  const { colors } = useNightMode();
  const themedStyles = useMemo(() => createStyles(colors), [colors]);
  const wallpaperRef = useRef<View>(null);

  const {
    verse,
    customVerse,
    resetToDefault,
    selectedTheme,
    setSelectedTheme,
    showPicker,
    setShowPicker,
    pickerStep,
    setPickerStep,
    selectedBookIndex,
    selectedChapterIndex,
    selectedVerses,
    openPicker,
    handleBookSelect,
    handleChapterSelect,
    handleVerseSelect,
    confirmSelection,
    capturing,
    shareWallpaperImage,
    shareVerseText,
  } = useLockScreenVerse(strings, route?.params?.designedVerse ?? null);

  return (
    <SafeAreaView style={themedStyles.container} edges={[]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.header} />
      <AppHeader
        topInsetHeight={insets.top}
        title={strings.title}
        leading={
          <AppHeaderAction
            icon="chevron-right"
            onPress={() => navigation.goBack()}
          />
        }
      />

      <ScrollView
        contentContainerStyle={themedStyles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={themedStyles.subtitle}>{strings.subtitle}</Text>

        {/* ─── Preview ─── */}
        <View style={themedStyles.previewShell}>
          <WallpaperPreview
            wallpaperRef={wallpaperRef}
            theme={selectedTheme}
            verseText={verse.text}
            verseReference={verse.reference}
          />
        </View>

        {/* ─── اختيار الخلفية ─── */}
        <ThemeSelector
          selectedTheme={selectedTheme}
          onSelectTheme={setSelectedTheme}
          accentColor={colors.accent}
          textColor={colors.text}
          cardColor={colors.card}
          borderColor={colors.border}
        />

        {/* ─── أزرار اختيار الآية ─── */}
        <View style={themedStyles.verseActions}>
          <TouchableOpacity
            style={themedStyles.chooseButton}
            onPress={openPicker}
          >
            <MaterialCommunityIcons
              name="book-open-page-variant-outline"
              size={18}
              color={colors.accent}
            />
            <Text style={themedStyles.chooseButtonText}>
              اختر آية من الكتاب المقدس
            </Text>
          </TouchableOpacity>
          {customVerse && (
            <TouchableOpacity
              style={themedStyles.resetButton}
              onPress={resetToDefault}
            >
              <MaterialCommunityIcons
                name="refresh"
                size={16}
                color={colors.mutedText}
              />
              <Text style={themedStyles.resetButtonText}>رجّع آية اليوم</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ─── أزرار المشاركة ─── */}
        <TouchableOpacity
          style={themedStyles.primaryButton}
          activeOpacity={0.84}
          onPress={() => shareWallpaperImage(wallpaperRef)}
          disabled={capturing}
        >
          {capturing ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <MaterialCommunityIcons
                name="image-outline"
                size={19}
                color="#FFF"
              />
              <Text style={themedStyles.primaryButtonText}>
                {strings.makeWallpaper}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={themedStyles.secondaryButton}
          activeOpacity={0.84}
          onPress={shareVerseText}
        >
          <MaterialCommunityIcons
            name="share-variant-outline"
            size={19}
            color={colors.text}
          />
          <Text style={themedStyles.secondaryButtonText}>
            {strings.shareVerse}
          </Text>
        </TouchableOpacity>

        <View style={themedStyles.infoCard}>
          <MaterialCommunityIcons
            name="information-outline"
            size={22}
            color={colors.accent}
          />
          <View style={themedStyles.infoBody}>
            <Text style={themedStyles.infoTitle}>
              {strings.instructionTitle}
            </Text>
            <Text style={themedStyles.infoText}>{strings.instructionBody}</Text>
          </View>
        </View>
      </ScrollView>

      {/* ─── Verse Picker Modal ─── */}
      <VersePicker
        visible={showPicker}
        pickerStep={pickerStep}
        selectedBookIndex={selectedBookIndex}
        selectedChapterIndex={selectedChapterIndex}
        selectedVerses={selectedVerses}
        onClose={() => setShowPicker(false)}
        onBack={() => {
          if (pickerStep === 'chapter') setPickerStep('book');
          else if (pickerStep === 'verse') setPickerStep('chapter');
          else setShowPicker(false);
        }}
        onBookSelect={handleBookSelect}
        onChapterSelect={handleChapterSelect}
        onVerseSelect={handleVerseSelect}
        onConfirm={confirmSelection}
        background={colors.background}
        cardColor={colors.card}
        borderColor={colors.border}
        textColor={colors.text}
        mutedTextColor={colors.mutedText}
        accentColor={colors.accent}
      />
    </SafeAreaView>
  );
};

const createStyles = (colors: AppTheme['colors']) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 34, alignItems: 'center' },
    subtitle: {
      color: colors.mutedText,
      fontSize: 14,
      lineHeight: 22,
      marginBottom: 16,
      textAlign: 'left',
      alignSelf: 'stretch',
    },
    previewShell: {
      width: '85%',
      maxWidth: 300,
      borderRadius: 30,
      padding: 6,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.16,
      shadowRadius: 16,
      elevation: 4,
      marginBottom: 16,
    },
    // ─── Theme Selector ───
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'flex-start',
      marginBottom: 10,
    },
    sectionTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
    themesRow: { paddingHorizontal: 4, gap: 10, marginBottom: 20 },
    themeCard: {
      alignItems: 'center',
      gap: 6,
      borderRadius: 14,
      padding: 6,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
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
    themeName: { color: colors.text, fontSize: 11, fontWeight: '600' },
    themeCheckBadge: {
      position: 'absolute',
      top: 4,
      right: 4,
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    // ─── Verse Actions ───
    verseActions: { alignSelf: 'stretch', gap: 10, marginBottom: 20 },
    chooseButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 14,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chooseButtonText: { color: colors.accent, fontSize: 14, fontWeight: '700' },
    resetButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 8,
    },
    resetButtonText: { color: colors.mutedText, fontSize: 13 },
    primaryButton: {
      minHeight: 48,
      borderRadius: 14,
      backgroundColor: colors.accent,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingHorizontal: 14,
      marginBottom: 10,
      alignSelf: 'stretch',
    },
    primaryButtonText: { color: '#FFF', fontSize: 15, fontWeight: '900' },
    secondaryButton: {
      minHeight: 46,
      borderRadius: 14,
      backgroundColor: colors.card,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 14,
      alignSelf: 'stretch',
    },
    secondaryButtonText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '900',
    },
    infoCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'flex-start',
      borderWidth: 1,
      borderColor: colors.border,
      alignSelf: 'stretch',
    },
    infoBody: { flex: 1, marginHorizontal: 10 },
    infoTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '900',
      textAlign: 'left',
    },
    infoText: {
      color: colors.mutedText,
      fontSize: 13,
      lineHeight: 20,
      marginTop: 4,
      textAlign: 'left',
    },
  });

export default LockScreenVerseScreen;
