/**
 * BibleMemorizationScreen
 * Lets the user pick a book/chapter/verse, then hides random words
 * and challenges the user to fill them back in.
 */

import React, { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import CustomAlert, { AlertButton } from './CustomAlert';

const NAVY = '#0A1124';
const GOLD = '#C9A84C';
const API = 'https://arabic-bible.onrender.com/api';

// Same canonical set re-used for the book picker
const CANONICAL_BOOK_IDS_SAMPLE = [
  { label: 'سفر التكوين', id: '1', chapters: 50 },
  { label: 'سفر الخروج', id: '2', chapters: 40 },
  { label: 'سفر المزامير', id: '22', chapters: 150 },
  { label: 'سفر الأمثال', id: '23', chapters: 31 },
  { label: 'سفر إشعياء', id: '26', chapters: 66 },
  { label: 'إنجيل يوحنا', id: '50', chapters: 21 },
  { label: 'رسالة رومية', id: '53', chapters: 16 },
  { label: 'سفر الرؤيا', id: '66', chapters: 22 },
];

interface WordSlot {
  word: string;       // original word
  hidden: boolean;    // whether this slot is blanked
  userInput: string;  // what user typed
  correct?: boolean;  // result after check
}

/** Strip leading verse number (e.g. "١ " or "1 ") from verse text */
function stripVerseNumber(text: string): string {
  return text.replace(/^[\u0660-\u0669\d]+\s/, '');
}

const HIDE_INTERVAL = 3;    // hide every Nth word
const HIDE_POSITION = 1;    // which position within the interval
const MIN_WORD_LENGTH = 3;  // minimum chars for a word to be hideable

/** Pick ~30% of words to hide using randomized selection for better memorization */
function buildSlots(verseText: string): WordSlot[] {
  const clean = stripVerseNumber(verseText);
  const words = clean.split(' ').filter(w => w.trim());
  // Collect candidate indices (long enough words), then randomly pick ~30%
  const candidates = words
    .map((w, i) => ({ i, w }))
    .filter(({ w }) => w.replace(/[،.؟!:؛]/g, '').length >= MIN_WORD_LENGTH);
  const hideCount = Math.max(1, Math.round(candidates.length * 0.3));
  const shuffled = candidates.slice().sort(() => Math.random() - 0.5);
  const hiddenIndices = new Set(shuffled.slice(0, hideCount).map(({ i }) => i));
  return words.map((word, i) => ({
    word,
    hidden: hiddenIndices.has(i),
    userInput: '',
  }));
}

type Step = 'pick' | 'memorize' | 'result';

const BibleMemorizationScreen = ({ navigation }: any) => {
  const [step, setStep] = useState<Step>('pick');

  // picker state
  const [selectedBook, setSelectedBook] = useState(CANONICAL_BOOK_IDS_SAMPLE[0]);
  const [chapterInput, setChapterInput] = useState('1');
  const [verseInput, setVerseInput] = useState('1');
  const [loadingVerse, setLoadingVerse] = useState(false);

  // memorize state
  const [verseOriginal, setVerseOriginal] = useState('');
  const [bookLabel, setBookLabel] = useState('');
  const [chapterLabel, setChapterLabel] = useState('');
  const [slots, setSlots] = useState<WordSlot[]>([]);

  // result
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);

  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean; title: string; message?: string;
    type?: 'error' | 'warning' | 'success' | 'info'; buttons?: AlertButton[];
  }>({ visible: false, title: '' });

  const showAlert = (title: string, message?: string, buttons?: AlertButton[],
    type: 'error' | 'warning' | 'success' | 'info' = 'error') =>
    setAlertConfig({ visible: true, title, message, buttons, type });
  const hideAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));

  const fetchVerse = async () => {
    const ch = parseInt(chapterInput, 10);
    const ver = parseInt(verseInput, 10);
    if (!ch || !ver) {
      showAlert('تنبيه', 'أدخل رقم إصحاح وآية صحيحين.', undefined, 'warning');
      return;
    }
    setLoadingVerse(true);
    try {
      const res = await fetch(`${API}?book=${selectedBook.id}&ch=${ch}&ver=${ver}`);
      const data = await res.json();
      const text: string = data.text ?? '';
      if (!text) {
        showAlert('تنبيه', 'لم يتم العثور على هذه الآية.', undefined, 'warning');
        setLoadingVerse(false);
        return;
      }
      setVerseOriginal(text);
      setBookLabel(selectedBook.label);
      setChapterLabel(`إصحاح ${ch}، آية ${ver}`);
      setSlots(buildSlots(text));
      setStep('memorize');
    } catch {
      showAlert('خطأ', 'تعذّر تحميل الآية. تأكد من اتصالك بالإنترنت.');
    }
    setLoadingVerse(false);
  };

  const checkAnswers = () => {
    let correct = 0;
    const updated = slots.map(slot => {
      if (!slot.hidden) { return slot; }
      const clean = (s: string) =>
        s.replace(/[،.؟!:؛\u060C\u061B\u061F]/g, '').trim();
      const isOk = clean(slot.userInput) === clean(slot.word);
      if (isOk) { correct++; }
      return { ...slot, correct: isOk };
    });
    setSlots(updated);
    const hiddenCount = slots.filter(s => s.hidden).length;
    setScore(correct);
    setTotal(hiddenCount);
    setStep('result');
  };

  const reset = () => {
    setStep('pick');
    setSlots([]);
    setVerseOriginal('');
    setScore(0);
    setTotal(0);
  };

  const tryAgain = () => {
    setSlots(buildSlots(verseOriginal));
    setStep('memorize');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => { step !== 'pick' ? reset() : navigation.goBack(); }}
          style={styles.backBtn}
        >
          <MaterialCommunityIcons name="arrow-right" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>حفظ الكتاب المقدس</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* ─── Step 1: Pick verse ─── */}
      {step === 'pick' && (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.sectionLabel}>اختر السفر</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.bookScroll}
            contentContainerStyle={{ gap: 8, paddingHorizontal: 4 }}
          >
            {CANONICAL_BOOK_IDS_SAMPLE.map(b => (
              <TouchableOpacity
                key={b.id}
                style={[styles.bookChip, selectedBook.id === b.id && styles.bookChipActive]}
                onPress={() => setSelectedBook(b)}
              >
                <Text style={[
                  styles.bookChipText,
                  selectedBook.id === b.id && styles.bookChipTextActive,
                ]}>
                  {b.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.sectionLabel}>رقم الإصحاح</Text>
          <TextInput
            style={styles.numInput}
            keyboardType="numeric"
            value={chapterInput}
            onChangeText={setChapterInput}
            textAlign="center"
          />

          <Text style={styles.sectionLabel}>رقم الآية</Text>
          <TextInput
            style={styles.numInput}
            keyboardType="numeric"
            value={verseInput}
            onChangeText={setVerseInput}
            textAlign="center"
          />

          <TouchableOpacity
            style={[styles.primaryBtn, loadingVerse && { opacity: 0.6 }]}
            onPress={fetchVerse}
            disabled={loadingVerse}
          >
            {loadingVerse
              ? <ActivityIndicator color="#FFF" />
              : <>
                  <MaterialCommunityIcons name="brain" size={20} color="#FFF" />
                  <Text style={styles.primaryBtnText}>ابدأ الاختبار</Text>
                </>}
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ─── Step 2: Memorize ─── */}
      {step === 'memorize' && (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.refText}>{bookLabel} — {chapterLabel}</Text>
          <Text style={styles.instructionText}>
            أكمل الكلمات المحجوبة في الآية التالية:
          </Text>

          <View style={styles.verseBox}>
            <View style={styles.wordsWrap}>
              {slots.map((slot, i) =>
                slot.hidden ? (
                  <TextInput
                    key={i}
                    style={styles.blankInput}
                    value={slot.userInput}
                    onChangeText={val =>
                      setSlots(prev =>
                        prev.map((s, j) => j === i ? { ...s, userInput: val } : s),
                      )
                    }
                    placeholder="___"
                    placeholderTextColor="#AAA"
                    textAlign="center"
                  />
                ) : (
                  <Text key={i} style={styles.wordText}>{slot.word} </Text>
                ),
              )}
            </View>
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={checkAnswers}>
            <MaterialCommunityIcons name="check-bold" size={20} color="#FFF" />
            <Text style={styles.primaryBtnText}>تحقق من إجاباتي</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.ghostBtn} onPress={reset}>
            <Text style={styles.ghostBtnText}>اختر آية أخرى</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ─── Step 3: Result ─── */}
      {step === 'result' && (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.scoreBox}>
            <MaterialCommunityIcons
              name={score === total ? 'trophy-outline' : 'lightbulb-outline'}
              size={56}
              color={score === total ? GOLD : NAVY}
            />
            <Text style={styles.scoreText}>{score} / {total}</Text>
            <Text style={styles.scoreLabel}>
              {score === total ? '🎉 ممتاز! حفظت الآية بشكل كامل!' :
               score >= total * 0.7 ? '👍 جيد جداً! استمر في المحاولة.' :
               '📖 راجع الآية وحاول مرة أخرى.'}
            </Text>
          </View>

          {/* Show corrected verse */}
          <View style={styles.verseBox}>
            <View style={styles.wordsWrap}>
              {slots.map((slot, i) =>
                slot.hidden ? (
                  <View key={i} style={[
                    styles.resultSlot,
                    slot.correct ? styles.resultCorrect : styles.resultWrong,
                  ]}>
                    <Text style={[
                      styles.resultSlotText,
                      slot.correct ? styles.resultSlotCorrectText : styles.resultSlotWrongText,
                    ]}>
                      {slot.correct ? slot.word : `${slot.userInput || '؟'} (${slot.word})`}
                    </Text>
                  </View>
                ) : (
                  <Text key={i} style={styles.wordText}>{slot.word} </Text>
                ),
              )}
            </View>
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={tryAgain}>
            <MaterialCommunityIcons name="refresh" size={20} color="#FFF" />
            <Text style={styles.primaryBtnText}>حاول مرة أخرى</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.ghostBtn} onPress={reset}>
            <Text style={styles.ghostBtnText}>اختر آية أخرى</Text>
          </TouchableOpacity>
        </ScrollView>
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
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },

  content: { padding: 20, paddingBottom: 48 },
  sectionLabel: {
    fontSize: 14,
    color: '#888',
    textAlign: 'left',
    marginBottom: 8,
    marginTop: 16,
  },

  bookScroll: { marginBottom: 4 },
  bookChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#E8E8E8',
  },
  bookChipActive: { backgroundColor: NAVY },
  bookChipText: { color: '#555', fontSize: 13 },
  bookChipTextActive: { color: '#FFF', fontWeight: 'bold' },

  numInput: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    fontSize: 18,
    fontWeight: 'bold',
    color: NAVY,
    elevation: 1,
  },

  primaryBtn: {
    backgroundColor: NAVY,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
  },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  ghostBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  ghostBtnText: { color: '#888', fontSize: 15 },

  refText: { color: GOLD, fontWeight: 'bold', textAlign: 'center', marginBottom: 4, fontSize: 14 },
  instructionText: { color: '#666', textAlign: 'center', marginBottom: 16, fontSize: 14 },

  verseBox: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
  },
  wordsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 6,
  },
  wordText: { fontSize: 17, color: '#333', lineHeight: 32 },
  blankInput: {
    minWidth: 60,
    borderBottomWidth: 2,
    borderBottomColor: NAVY,
    fontSize: 16,
    color: NAVY,
    paddingHorizontal: 4,
    height: 36,
  },

  scoreBox: { alignItems: 'center', marginBottom: 24 },
  scoreText: { fontSize: 40, fontWeight: 'bold', color: NAVY, marginTop: 8 },
  scoreLabel: { fontSize: 15, color: '#555', textAlign: 'center', marginTop: 8, lineHeight: 24 },

  resultSlot: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  resultCorrect: { backgroundColor: 'rgba(52,199,89,0.18)' },
  resultWrong: { backgroundColor: 'rgba(255,59,48,0.12)' },
  resultSlotText: { fontSize: 15 },
  resultSlotCorrectText: { color: '#1A7A1A', fontWeight: 'bold' },
  resultSlotWrongText: { color: '#CC0000' },
});

export default BibleMemorizationScreen;
