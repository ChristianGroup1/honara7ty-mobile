/**
 * BibleReaderScreen
 * Fetches books from https://arabic-bible.onrender.com/api
 * Filters out deuterocanonical / apocryphal books (non-Protestant-canon).
 * Stores each chapter read in Supabase `reading_log` for streak tracking.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import supabase from '../lib/supbase';
import CustomAlert, { AlertButton } from './CustomAlert';

const NAVY = '#0A1124';
const GOLD = '#C9A84C';
const API = 'https://arabic-bible.onrender.com/api';

// Protestant-canon Arabic book names (66 books).
// Any book returned by the API whose name is NOT in this set will be hidden.
const CANONICAL_NAMES = new Set([
  'سفر التكوين', 'سفر الخروج', 'سفر اللاويين', 'سفر العدد', 'سفر التثنية',
  'سفر يشوع', 'سفر القضاة', 'سفر راعوث',
  'سفر صموئيل الأول', 'سفر صموئيل الثاني',
  'سفر الملوك الأول', 'سفر الملوك الثاني',
  'سفر أخبار الأيام الأول', 'سفر أخبار الأيام الثاني',
  'سفر الأخبار الأول', 'سفر الأخبار الثاني', // alternate spellings
  'سفر عزرا', 'سفر نحميا', 'سفر أستير', 'سفر أيوب',
  'سفر المزامير', 'سفر الأمثال', 'سفر الجامعة', 'سفر نشيد الأنشاد',
  'سفر إشعياء', 'سفر إرميا', 'مراثي إرميا', 'سفر حزقيال', 'سفر دانيال',
  'سفر هوشع', 'سفر يوئيل', 'سفر عاموس', 'سفر عوبديا',
  'سفر يونان', 'سفر ميخا', 'سفر ناحوم', 'سفر حبقوق',
  'سفر صفنيا', 'سفر حجي', 'سفر زكريا', 'سفر ملاخي',
  // New Testament
  'إنجيل متى', 'إنجيل مرقس', 'إنجيل لوقا', 'إنجيل يوحنا',
  'سفر أعمال الرسل', 'رسالة بولس الرسول إلى أهل رومية',
  'رسالة بولس الرسول الأولى إلى أهل كورنثوس',
  'رسالة بولس الرسول الثانية إلى أهل كورنثوس',
  'رسالة بولس الرسول إلى أهل غلاطية',
  'رسالة بولس الرسول إلى أهل أفسس',
  'رسالة بولس الرسول إلى أهل فيلبي',
  'رسالة بولس الرسول إلى أهل كولوسي',
  'رسالة بولس الرسول الأولى إلى أهل تسالونيكي',
  'رسالة بولس الرسول الثانية إلى أهل تسالونيكي',
  'رسالة بولس الرسول الأولى إلى تيموثاوس',
  'رسالة بولس الرسول الثانية إلى تيموثاوس',
  'رسالة بولس الرسول إلى تيطس',
  'رسالة بولس الرسول إلى فيلمون',
  'رسالة بولس الرسول إلى العبرانيين',
  'رسالة يعقوب', 'رسالة بطرس الأولى', 'رسالة بطرس الثانية',
  'رسالة يوحنا الأولى', 'رسالة يوحنا الثانية', 'رسالة يوحنا الثالثة',
  'رسالة يهوذا', 'سفر الرؤيا',
  // Common alternative spellings
  'متى', 'مرقس', 'لوقا', 'يوحنا',
  'أعمال الرسل', 'رومية', 'كورنثوس الأولى', 'كورنثوس الثانية',
  'غلاطية', 'أفسس', 'فيلبي', 'كولوسي',
  'تسالونيكي الأولى', 'تسالونيكي الثانية',
  'تيموثاوس الأولى', 'تيموثاوس الثانية', 'تيطس', 'فيلمون',
  'العبرانيين', 'يعقوب', 'بطرس الأولى', 'بطرس الثانية',
  'يوحنا الأولى', 'يوحنا الثانية', 'يوحنا الثالثة', 'يهوذا', 'الرؤيا',
]);

interface Book { bookName: string; bookID: string; chapters: number }
interface Chapter { title?: string; arr?: string[]; text?: string; verses_count: number }

type Screen = 'books' | 'chapters' | 'verses';

const BibleReaderScreen = ({ navigation }: any) => {
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [chapterData, setChapterData] = useState<Chapter | null>(null);
  const [screen, setScreen] = useState<Screen>('books');
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [loadingChapter, setLoadingChapter] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean; title: string; message?: string;
    type?: 'error' | 'warning' | 'success' | 'info'; buttons?: AlertButton[];
  }>({ visible: false, title: '' });

  const showAlert = (title: string, message?: string, buttons?: AlertButton[],
    type: 'error' | 'warning' | 'success' | 'info' = 'error') =>
    setAlertConfig({ visible: true, title, message, buttons, type });
  const hideAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));

  /* ─── Fetch all books ─── */
  const fetchBooks = useCallback(async () => {
    setLoadingBooks(true);
    try {
      // Fetch books 1-73 (max possible in API); filter non-canonical
      const allBooks: Book[] = [];
      const fetches = Array.from({ length: 73 }, (_, i) =>
        fetch(`${API}?book=${i + 1}`)
          .then(r => r.json())
          .catch(() => null),
      );
      const results = await Promise.all(fetches);
      results.forEach(result => {
        if (result && result.bookName && result.bookID && result.chapters) {
          if (CANONICAL_NAMES.has(result.bookName)) {
            allBooks.push(result as Book);
          }
        }
      });
      // Sort by numeric bookID
      allBooks.sort((a, b) => Number(a.bookID) - Number(b.bookID));
      setBooks(allBooks);
    } catch (err: any) {
      showAlert('خطأ', 'تعذّر تحميل أسفار الكتاب المقدس. تأكد من اتصالك بالإنترنت.');
    }
    setLoadingBooks(false);
  }, []);

  useEffect(() => { fetchBooks(); }, [fetchBooks]);

  /* ─── Fetch chapter ─── */
  const fetchChapter = async (book: Book, chapter: number) => {
    setLoadingChapter(true);
    setChapterData(null);
    try {
      const res = await fetch(`${API}?book=${book.bookID}&ch=${chapter}`);
      const data = await res.json();
      setChapterData(data as Chapter);
      // Log reading in Supabase
      await logReading(book.bookID, chapter);
    } catch {
      showAlert('خطأ', 'تعذّر تحميل هذا الإصحاح.');
    }
    setLoadingChapter(false);
  };

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
      if (error && !error.message.includes('duplicate')) {
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

  const headerTitle =
    screen === 'books' ? 'الكتاب المقدس' :
    screen === 'chapters' ? selectedBook?.bookName ?? '' :
    `${selectedBook?.bookName} - إصحاح ${selectedChapter}`;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-right" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{headerTitle}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* ─── Books list ─── */}
      {screen === 'books' && (
        loadingBooks ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={NAVY} />
            <Text style={styles.loadingText}>جارٍ تحميل الأسفار...</Text>
          </View>
        ) : (
          <FlatList
            data={books}
            keyExtractor={item => item.bookID}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <TouchableOpacity
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
        )
      )}

      {/* ─── Chapters grid ─── */}
      {screen === 'chapters' && selectedBook && (
        <ScrollView contentContainerStyle={styles.chapterGrid}>
          {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map(ch => (
            <TouchableOpacity
              key={ch}
              style={styles.chapterBtn}
              onPress={async () => {
                setSelectedChapter(ch);
                setScreen('verses');
                await fetchChapter(selectedBook, ch);
              }}
            >
              <Text style={styles.chapterNum}>{ch}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* ─── Verses view ─── */}
      {screen === 'verses' && (
        loadingChapter ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={NAVY} />
          </View>
        ) : chapterData ? (
          <ScrollView contentContainerStyle={styles.versesContent}>
            {chapterData.title ? (
              <Text style={styles.chapterTitle}>{chapterData.title}</Text>
            ) : null}
            {chapterData.arr ? (
              chapterData.arr.map((v, idx) => (
                <Text key={idx} style={styles.verseText}>{v}</Text>
              ))
            ) : chapterData.text ? (
              <Text style={styles.verseText}>{chapterData.text}</Text>
            ) : null}
          </ScrollView>
        ) : null
      )}

      <CustomAlert {...alertConfig} onDismiss={hideAlert} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F4F8' },
  header: {
    backgroundColor: NAVY,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 12 : 8,
    paddingBottom: 16,
  },
  backBtn: { padding: 4 },
  headerTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold', flex: 1, textAlign: 'center' },
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 10,
  },
  chapterBtn: {
    width: 52,
    height: 52,
    borderRadius: 12,
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
    marginBottom: 20,
  },
  verseText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 30,
    textAlign: 'right',
    marginBottom: 8,
  },
});

export default BibleReaderScreen;
