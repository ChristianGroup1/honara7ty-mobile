import { useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import RNShare from 'react-native-share';
import { WALLPAPER_THEMES, WallpaperTheme } from '../constants/wallpaperThemes';
import bibleDataJson from '../../data/bible.json';
import { getDailyVerse } from '../../../lib/dailyVerse';

const bibleData: any = bibleDataJson;

export interface CustomVerse {
  text: string;
  reference: string;
}

export type PickerStep = 'book' | 'chapter' | 'verse';

export const useLockScreenVerse = (
  strings: any,
  initialCustomVerse?: CustomVerse | null,
) => {
  // ─── Verse State ───
  const defaultVerse = getDailyVerse(strings.verses) ?? strings.verses[0];
  const [customVerse, setCustomVerse] = useState<CustomVerse | null>(
    initialCustomVerse ?? null,
  );
  const verse = customVerse || defaultVerse;

  useEffect(() => {
    if (initialCustomVerse) {
      setCustomVerse(initialCustomVerse);
    }
  }, [initialCustomVerse]);

  // ─── Theme State ───
  const [selectedTheme, setSelectedTheme] = useState<WallpaperTheme>(
    WALLPAPER_THEMES[0],
  );

  // ─── Picker State ───
  const [showPicker, setShowPicker] = useState(false);
  const [pickerStep, setPickerStep] = useState<PickerStep>('book');
  const [selectedBookIndex, setSelectedBookIndex] = useState<number | null>(
    null,
  );
  const [selectedChapterIndex, setSelectedChapterIndex] = useState<
    number | null
  >(null);
  const [selectedVerses, setSelectedVerses] = useState<number[]>([]);

  // ─── Capture State ───
  const [capturing, setCapturing] = useState(false);

  // ─── Picker Handlers ───
  const openPicker = () => {
    setPickerStep('book');
    setSelectedBookIndex(null);
    setSelectedChapterIndex(null);
    setSelectedVerses([]);
    setShowPicker(true);
  };

  const handleBookSelect = (index: number) => {
    setSelectedBookIndex(index);
    setPickerStep('chapter');
  };

  const handleChapterSelect = (chapterIdx: number) => {
    setSelectedChapterIndex(chapterIdx);
    setPickerStep('verse');
  };

  const handleVerseSelect = (verseIdx: number) => {
    setSelectedVerses(prev =>
      prev.includes(verseIdx)
        ? prev.filter(i => i !== verseIdx).sort((a, b) => a - b)
        : [...prev, verseIdx].sort((a, b) => a - b),
    );
  };

  const confirmSelection = () => {
    if (
      selectedBookIndex === null ||
      selectedChapterIndex === null ||
      selectedVerses.length === 0
    )
      return;
    const book = bibleData.books[selectedBookIndex];
    const chapter = book.chapters[selectedChapterIndex];
    const combinedText = selectedVerses
      .map((idx: number) => chapter.verses[idx]?.text)
      .join(' ');
    const verseRef = selectedVerses.map((v: number) => v + 1).join('، ');
    setCustomVerse({
      text: combinedText,
      reference: `${book.name} ${chapter.chapter}: ${verseRef}`,
    });
    setShowPicker(false);
  };

  const resetToDefault = () => setCustomVerse(null);

  // ─── Share Handlers ───
  const shareWallpaperImage = async (wallpaperRef: any) => {
    if (!wallpaperRef.current || capturing) return;
    setCapturing(true);
    try {
      const uri = await captureRef(wallpaperRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });
      const fileUri = Platform.OS === 'android' ? `file://${uri}` : uri;
      await RNShare.open({
        title: strings.title,
        message: strings.shareMessage,
        url: fileUri,
        type: 'image/png',
        failOnCancel: false,
      });
    } catch (error: any) {
      if (error?.message?.includes?.('cancel')) return;
      Alert.alert(strings.captureErrorTitle, strings.captureErrorMessage);
    } finally {
      setCapturing(false);
    }
  };

  const shareVerseText = async () => {
    try {
      await RNShare.open({
        message: `${verse.text}\n${verse.reference}\n\n${strings.shareMessage}`,
        failOnCancel: false,
      });
    } catch (error: any) {
      if (error?.message?.includes?.('cancel')) return;
    }
  };

  return {
    // verse
    verse,
    customVerse,
    resetToDefault,
    // theme
    selectedTheme,
    setSelectedTheme,
    // picker
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
    // capture
    capturing,
    shareWallpaperImage,
    shareVerseText,
  };
};
