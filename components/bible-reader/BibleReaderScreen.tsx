/**
 * BibleReaderScreen
 * Reads books and chapters from the local `bible.json` dataset.
 * Stores each chapter read in Supabase `reading_log` for streak tracking.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import supabase from '../../lib/supbase';
import CustomAlert, { AlertButton, AlertConfig } from '../shared/CustomAlert';
import { BIBLE_BOOKS, BibleBook } from '../data/bibleMetadata';

const NAVY = '#0A1124';
const GOLD = '#C9A84C';
interface ChapterData {
  title: string;
  arr: string[];
  versesCount: number;
}

type Screen = 'books' | 'chapters' | 'verses';

const BibleReaderScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isCompactWidth = width < 360;
  const chapterColumns = isCompactWidth ? 4 : width < 430 ? 5 : 6;
  const chapterButtonSize = isCompactWidth ? 48 : 52;
  const chapterItemWidth = `${100 / chapterColumns}%` as `${number}%`;
  const [selectedBook, setSelectedBook] = useState<BibleBook | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [chapterData, setChapterData] = useState<ChapterData | null>(null);
  const [screen, setScreen] = useState<Screen>('books');
  const [loadingChapter, setLoadingChapter] = useState(false);
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    visible: false,
    title: '',
  });

  const showAlert = (title: string, message?: string, buttons?: AlertButton[],
    type: 'error' | 'warning' | 'success' | 'info' = 'error') =>
    setAlertConfig({ visible: true, title, message, buttons, type });
  const hideAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));

  /* ─── Fetch chapter ─── */
  const fetchChapter = useCallback(async (book: BibleBook, chapter: number) => {
    setLoadingChapter(true);
    setChapterData(null);
    try {
      const chapterEntry = book.chaptersData[chapter - 1];
      if (!chapterEntry) {
        throw new Error('Missing local chapter data');
      }

      setChapterData({
        title: `${book.bookName} ${chapter}`,
        arr: chapterEntry.verses.map(verse => verse.text),
        versesCount: chapterEntry.verses.length,
      });
      // Log reading in Supabase
      await logReading(book.bookID, chapter);
    } catch {
      showAlert('خطأ', 'تعذّر تحميل هذا الإصحاح.');
    } finally {
      setLoadingChapter(false);
    }
  }, []);

  const logReading = async (bookId: string, chapter: number) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) { return; }
      const today = new Date().toISOString().split('T')[0];
      // upsert with onConflict targeting the unique constraint name;
      // if the insert fails (duplicate), silently ignore — the read is already logged.
      const { error } = await supabase.from('reading_log').upsert(
        { user_id: userId, book_id: bookId, chapter, date: today },
        { onConflict: 'user_id,book_id,chapter,date' },
      );
      if (__DEV__ && error && !error.message.includes('duplicate')) {
        console.warn('reading_log upsert error:', error.message);
      }
    } catch { /* non-critical */ }
  };

  const goBack = () => {
    if (screen === 'verses') {
      setScreen('chapters');
      setChapterData(null);
    } else if (screen === 'chapters') {
      setScreen('books');
      setSelectedBook(null);
    } else {
      navigation.goBack();
    }
  };

  useEffect(() => {
    if (screen !== 'verses' || !selectedBook || selectedChapter == null) {
      return;
    }

    fetchChapter(selectedBook, selectedChapter);
  }, [fetchChapter, screen, selectedBook, selectedChapter]);

  const headerTitle =
    screen === 'books' ? 'الكتاب المقدس' :
    screen === 'chapters' ? selectedBook?.bookName ?? '' :
    `${selectedBook?.bookName} - إصحاح ${selectedChapter}`;

  const chapterNumbers = selectedBook
    ? Array.from({ length: selectedBook.chapters }, (_, i) => i + 1)
    : [];

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />
      <View style={[styles.topInset, { height: insets.top }]} />
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-right" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{headerTitle}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* ─── Books list ─── */}
      {screen === 'books' && (
        <FlatList
          data={BIBLE_BOOKS}
          keyExtractor={item => item.bookID}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              testID={`book-${item.bookID}`}
              style={styles.bookRow}
              onPress={() => { setSelectedBook(item); setScreen('chapters'); }}
            >
              <MaterialCommunityIcons name="chevron-left" size={20} color="#AAA" />
              <View style={styles.bookInfo}>
                <Text style={styles.bookName}>{item.bookName}</Text>
                <Text style={styles.bookSub}>{item.chapters} إصحاح</Text>
              </View>
              <View style={styles.bookNumBadge}>
                <Text style={styles.bookNum}>{item.bookID}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* ─── Chapters grid ─── */}
      {screen === 'chapters' && selectedBook && (
        <FlatList
          data={chapterNumbers}
          key={chapterColumns}
          numColumns={chapterColumns}
          keyExtractor={item => String(item)}
          contentContainerStyle={styles.chapterGrid}
          renderItem={({ item }) => (
            <View style={[styles.chapterItem, { width: chapterItemWidth }]}>
              <TouchableOpacity
                testID={`chapter-${item}`}
                style={[
                  styles.chapterBtn,
                  {
                    width: chapterButtonSize,
                    height: chapterButtonSize,
                    borderRadius: chapterButtonSize / 4,
                  },
                ]}
                onPress={() => {
                  setSelectedChapter(item);
                  setScreen('verses');
                }}
              >
                <Text style={styles.chapterNum}>{item}</Text>
              </TouchableOpacity>
            </View>
          )}
          removeClippedSubviews
        />
      )}

      {/* ─── Verses view ─── */}
      {screen === 'verses' && (
        loadingChapter ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={NAVY} />
          </View>
        ) : chapterData ? (
          <FlatList
            data={chapterData.arr}
            keyExtractor={(_, idx) => `${selectedBook?.bookID}-${selectedChapter}-${idx}`}
            contentContainerStyle={styles.versesContent}
            ListHeaderComponent={
              <>
                <Text style={styles.chapterTitle}>{chapterData.title}</Text>
                <Text style={styles.chapterMeta}>
                  {chapterData.versesCount} عدد
                </Text>
              </>
            }
            renderItem={({ item, index }) => (
              <View style={styles.verseRow}>
                <Text style={styles.verseIndex}>{index + 1}</Text>
                <Text
                  style={[
                    styles.verseText,
                    isCompactWidth ? styles.verseTextCompact : null,
                  ]}
                >
                  {item}
                </Text>
              </View>
            )}
            initialNumToRender={18}
            windowSize={8}
            removeClippedSubviews
          />
        ) : null
      )}

      <CustomAlert {...alertConfig} onDismiss={hideAlert} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F4F8' },
  topInset: { backgroundColor: NAVY },
  header: {
    backgroundColor: NAVY,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  backBtn: { padding: 4 },
  headerTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  headerSpacer: { width: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#888', marginTop: 12, fontSize: 14 },

  /* Books */
  list: { padding: 12 },
  bookRow: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  bookNumBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: NAVY,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  bookNum: { color: '#FFF', fontSize: 13, fontWeight: 'bold' },
  bookInfo: { flex: 1, alignItems: 'flex-end', marginRight: 10 },
  bookName: { fontSize: 15, color: NAVY, fontWeight: '600' },
  bookSub: { fontSize: 12, color: '#888', marginTop: 2 },

  /* Chapters */
  chapterGrid: {
    padding: 16,
  },
  chapterItem: {
    alignItems: 'center',
    marginBottom: 12,
  },
  chapterBtn: {
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
  },
  chapterNum: { fontSize: 16, fontWeight: 'bold', color: NAVY },

  /* Verses */
  versesContent: { padding: 20, paddingBottom: 40 },
  chapterTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: GOLD,
    textAlign: 'center',
    marginBottom: 8,
  },
  chapterMeta: {
    color: '#7A7F89',
    textAlign: 'center',
    marginBottom: 18,
    fontSize: 13,
  },
  verseRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  verseIndex: {
    width: 28,
    color: GOLD,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginLeft: 8,
    marginTop: 4,
  },
  verseText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 30,
    textAlign: 'left',
    flex: 1,
  },
  verseTextCompact: {
    fontSize: 15,
    lineHeight: 28,
  },
});

export default BibleReaderScreen;
