import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Testament } from '../data/bibleMetadata';

const NAVY = '#0A1124';
const GOLD = '#C9A84C';

type Labels = {
  bookTitle: string;
  chapterTitle: string;
  chapterHint: string;
  selectBookFirst: string;
  oldTestament: string;
  newTestament: string;
  bookCountSuffix?: string;
  selectAllChapters?: string;
  clearChapters?: string;
  verseTitle?: string;
  fromVerseTitle?: string;
  toVerseTitle?: string;
  selectAllVerses?: string;
  clearVerses?: string;
};

type PassageBook = {
  bookID: string | number;
  bookName: string;
};

type Props = {
  labels: Labels;
  selectedTestament: Testament;
  books: PassageBook[];
  selectedBook: string;
  chapterOptions: number[];
  selectedChapters: number[];
  onSetTestament: (value: Testament) => void;
  onSetBook: (value: string) => void;
  onToggleChapter: (value: number) => void;
  onSelectAllChapters?: () => void;
  onClearChapters?: () => void;
  // New props for memorization/verses
  multiSelectChapters?: boolean;
  verseMode?: 'single' | 'multi' | 'none';
  verseOptions?: number[];
  selectedVerseStart?: number;
  selectedVerseEnd?: number;
  selectedVerses?: number[];
  onSetVerseStart?: (v: number) => void;
  onSetVerseEnd?: (v: number) => void;
  onToggleVerse?: (v: number) => void;
  onSelectAllVerses?: () => void;
  onClearVerses?: () => void;
};

const BiblePassagePicker = ({
  labels,
  selectedTestament,
  books,
  selectedBook,
  chapterOptions,
  selectedChapters,
  onSetTestament,
  onSetBook,
  onToggleChapter,
  onSelectAllChapters,
  onClearChapters,
  multiSelectChapters = true,
  verseMode = 'none',
  verseOptions = [],
  selectedVerseStart = 1,
  selectedVerseEnd = 1,
  selectedVerses = [],
  onSetVerseStart,
  onSetVerseEnd,
  onToggleVerse,
  onSelectAllVerses,
  onClearVerses,
}: Props) => {
  const [bookPickerVisible, setBookPickerVisible] = useState(false);
  const [chapterPickerVisible, setChapterPickerVisible] = useState(false);
  const [verseStartPickerVisible, setVerseStartPickerVisible] = useState(false);
  const [verseEndPickerVisible, setVerseEndPickerVisible] = useState(false);
  const selectedChaptersLabel = useMemo(() => {
    if (!selectedChapters.length) {
      return labels.selectBookFirst;
    }
    if (!multiSelectChapters) {
      return `${labels.chapterTitle} ${selectedChapters[0]}`;
    }
    if (
      selectedChapters.length === chapterOptions.length &&
      chapterOptions.length > 0
    ) {
      const chapters = selectedChapters.join(', ');
      return labels.selectAllChapters
        ? `${labels.selectAllChapters} (${chapters})`
        : `${selectedChapters.length} إصحاح (${chapters})`;
    }
    return selectedChapters.join(', ');
  }, [
    chapterOptions.length,
    labels.selectAllChapters,
    labels.selectBookFirst,
    selectedChapters,
    multiSelectChapters,
    labels.chapterTitle,
  ]);
  const allChaptersSelected =
    chapterOptions.length > 0 &&
    selectedChapters.length === chapterOptions.length;
  const allVersesSelected =
    verseOptions.length > 0 &&
    verseOptions.every(verse => selectedVerses.includes(verse));

  return (
    <>
      <Text style={styles.fieldTitle}>{labels.bookTitle}</Text>
      <View style={styles.testamentTabs}>
        {(['old', 'new'] as Testament[]).map(testament => {
          const active = selectedTestament === testament;
          return (
            <TouchableOpacity
              key={testament}
              style={[styles.testamentTab, active && styles.testamentTabActive]}
              onPress={() => onSetTestament(testament)}
            >
              <Text
                style={[
                  styles.testamentTabText,
                  active && styles.testamentTabTextActive,
                ]}
              >
                {testament === 'old'
                  ? labels.oldTestament
                  : labels.newTestament}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        style={styles.selectorRow}
        activeOpacity={0.82}
        onPress={() => setBookPickerVisible(true)}
      >
        <View style={styles.selectorIcon}>
          <MaterialCommunityIcons
            name="book-open-variant"
            size={19}
            color={GOLD}
          />
        </View>
        <View style={styles.selectorBody}>
          <Text style={styles.selectorLabel}>{labels.bookTitle}</Text>
          <Text style={styles.selectorValue} numberOfLines={1}>
            {selectedBook || labels.selectBookFirst}
          </Text>
        </View>
        <MaterialCommunityIcons name="chevron-left" size={22} color="#9AA3AE" />
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.selectorRow,
          !selectedBook && styles.selectorRowDisabled,
        ]}
        activeOpacity={0.82}
        disabled={!selectedBook}
        onPress={() => setChapterPickerVisible(true)}
      >
        <View style={styles.selectorIcon}>
          <MaterialCommunityIcons
            name="format-list-numbered"
            size={19}
            color={GOLD}
          />
        </View>
        <View style={styles.selectorBody}>
          <Text style={styles.selectorLabel}>{labels.chapterTitle}</Text>
          <Text style={styles.selectorValue} numberOfLines={1}>
            {selectedBook ? selectedChaptersLabel : labels.selectBookFirst}
          </Text>
        </View>
        <MaterialCommunityIcons name="chevron-left" size={22} color="#9AA3AE" />
      </TouchableOpacity>

      {verseMode !== 'none' && selectedBook && selectedChapters.length > 0 && (
        <>
          {verseMode === 'single' && (
            <TouchableOpacity
              style={styles.selectorRow}
              activeOpacity={0.82}
              onPress={() => setVerseStartPickerVisible(true)}
            >
              <View style={styles.selectorIcon}>
                <MaterialCommunityIcons
                  name="numeric-1-box-outline"
                  size={19}
                  color={GOLD}
                />
              </View>
              <View style={styles.selectorBody}>
                <Text style={styles.selectorLabel}>{labels.verseTitle}</Text>
                <Text style={styles.selectorValue}>{selectedVerseStart}</Text>
              </View>
              <MaterialCommunityIcons
                name="chevron-left"
                size={22}
                color="#9AA3AE"
              />
            </TouchableOpacity>
          )}

          {verseMode === 'multi' && (
            <TouchableOpacity
              style={styles.selectorRow}
              activeOpacity={0.82}
              onPress={() => setVerseStartPickerVisible(true)}
            >
              <View style={styles.selectorIcon}>
                <MaterialCommunityIcons
                  name="numeric-1-box-multiple-outline"
                  size={19}
                  color={GOLD}
                />
              </View>
              <View style={styles.selectorBody}>
                <Text style={styles.selectorLabel}>{labels.verseTitle}</Text>
                <Text style={styles.selectorValue}>
                  {selectedVerses.length > 0
                    ? [...selectedVerses].sort((a, b) => a - b).join(', ')
                    : labels.verseTitle ?? labels.selectBookFirst}
                </Text>
              </View>
              <MaterialCommunityIcons
                name="chevron-left"
                size={22}
                color="#9AA3AE"
              />
            </TouchableOpacity>
          )}
        </>
      )}

      <Text style={styles.hint}>
        {selectedBook ? labels.chapterHint : labels.selectBookFirst}
      </Text>

      <PickerModal
        visible={bookPickerVisible}
        title={
          selectedTestament === 'old'
            ? labels.oldTestament
            : labels.newTestament
        }
        onClose={() => setBookPickerVisible(false)}
      >
        <View style={styles.booksGrid}>
          {books.map(book => (
            <TouchableOpacity
              key={book.bookID}
              style={[
                styles.bookOption,
                selectedBook === book.bookName && styles.optionSelected,
              ]}
              onPress={() => {
                onSetBook(book.bookName);
                setBookPickerVisible(false);
              }}
            >
              <Text
                style={[
                  styles.bookOptionText,
                  selectedBook === book.bookName && styles.optionTextSelected,
                ]}
              >
                {book.bookName}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </PickerModal>

      <PickerModal
        visible={chapterPickerVisible}
        title={labels.chapterTitle}
        onClose={() => setChapterPickerVisible(false)}
      >
        {onSelectAllChapters && labels.selectAllChapters ? (
          <TouchableOpacity
            style={styles.selectAllButton}
            onPress={
              allChaptersSelected && onClearChapters
                ? onClearChapters
                : onSelectAllChapters
            }
          >
            <MaterialCommunityIcons name="select-all" size={17} color={NAVY} />
            <Text style={styles.selectAllButtonText}>
              {allChaptersSelected && onClearChapters
                ? labels.clearChapters ?? 'مسح الاختيار'
                : labels.selectAllChapters}
            </Text>
          </TouchableOpacity>
        ) : null}
        <View style={styles.chapterGrid}>
          {chapterOptions.map(chapter => (
            <TouchableOpacity
              key={`chapter-${chapter}`}
              style={[
                styles.chapterOption,
                selectedChapters.includes(chapter) && styles.optionSelected,
              ]}
              onPress={() => {
                onToggleChapter(chapter);
                if (!multiSelectChapters) {
                  setChapterPickerVisible(false);
                }
              }}
            >
              <Text
                style={[
                  styles.chapterOptionText,
                  selectedChapters.includes(chapter) &&
                    styles.optionTextSelected,
                ]}
              >
                {chapter}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </PickerModal>

      <PickerModal
        visible={verseStartPickerVisible}
        title={labels.verseTitle || ''}
        onClose={() => setVerseStartPickerVisible(false)}
      >
        {verseMode === 'multi' &&
        onSelectAllVerses &&
        labels.selectAllVerses ? (
          <TouchableOpacity
            style={styles.selectAllButton}
            onPress={
              allVersesSelected && onClearVerses
                ? onClearVerses
                : onSelectAllVerses
            }
          >
            <MaterialCommunityIcons
              name={
                allVersesSelected ? 'close-box-multiple-outline' : 'select-all'
              }
              size={17}
              color={NAVY}
            />
            <Text style={styles.selectAllButtonText}>
              {allVersesSelected && onClearVerses
                ? labels.clearVerses ?? labels.selectAllVerses
                : labels.selectAllVerses}
            </Text>
          </TouchableOpacity>
        ) : null}
        <View style={styles.chapterGrid}>
          {verseOptions.map(verse => (
            <TouchableOpacity
              key={`verse-select-${verse}`}
              style={[
                styles.chapterOption,
                (verseMode === 'multi'
                  ? selectedVerses.includes(verse)
                  : selectedVerseStart === verse) && styles.optionSelected,
              ]}
              onPress={() => {
                if (verseMode === 'multi') {
                  onToggleVerse?.(verse);
                } else {
                  onSetVerseStart?.(verse);
                  setVerseStartPickerVisible(false);
                }
              }}
            >
              <Text
                style={[
                  styles.chapterOptionText,
                  (verseMode === 'multi'
                    ? selectedVerses.includes(verse)
                    : selectedVerseStart === verse) &&
                    styles.optionTextSelected,
                ]}
              >
                {verse}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </PickerModal>

      <PickerModal
        visible={verseEndPickerVisible}
        title={labels.toVerseTitle || ''}
        onClose={() => setVerseEndPickerVisible(false)}
      >
        <View style={styles.chapterGrid}>
          {verseOptions
            .filter(v => v >= selectedVerseStart)
            .map(verse => (
              <TouchableOpacity
                key={`verse-end-${verse}`}
                style={[
                  styles.chapterOption,
                  selectedVerseEnd === verse && styles.optionSelected,
                ]}
                onPress={() => {
                  onSetVerseEnd?.(verse);
                  setVerseEndPickerVisible(false);
                }}
              >
                <Text
                  style={[
                    styles.chapterOptionText,
                    selectedVerseEnd === verse && styles.optionTextSelected,
                  ]}
                >
                  {verse}
                </Text>
              </TouchableOpacity>
            ))}
        </View>
      </PickerModal>
    </>
  );
};

const PickerModal = ({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
    onRequestClose={onClose}
  >
    <View style={styles.modalOverlay}>
      <Pressable style={styles.modalBackdrop} onPress={onClose} />
      <View style={styles.modalCard}>
        <View style={styles.modalHandle} />
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{title}</Text>
          <TouchableOpacity style={styles.closeIconButton} onPress={onClose}>
            <MaterialCommunityIcons name="close" size={20} color={NAVY} />
          </TouchableOpacity>
        </View>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.modalScroll}
        >
          {children}
        </ScrollView>
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  fieldTitle: {
    color: NAVY,
    fontSize: 14,
    fontWeight: '900',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'left',
  },
  testamentTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    backgroundColor: '#EFF3F8',
    borderRadius: 16,
    padding: 5,
  },
  testamentTab: {
    flex: 1,
    minHeight: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testamentTabActive: { backgroundColor: NAVY },
  testamentTabText: { color: NAVY, fontSize: 13, fontWeight: '900' },
  testamentTabTextActive: { color: '#FFF' },
  selectorRow: {
    minHeight: 58,
    borderRadius: 15,
    backgroundColor: '#F8FAFD',
    borderWidth: 1,
    borderColor: '#E3E8F1',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  selectorRowDisabled: { opacity: 0.62 },
  selectorIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: '#FFF8E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectorBody: { flex: 1, marginHorizontal: 10 },
  selectorLabel: {
    color: '#667085',
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'left',
  },
  selectorValue: {
    color: NAVY,
    fontSize: 14,
    fontWeight: '900',
    marginTop: 3,
    textAlign: 'left',
  },
  hint: {
    color: '#667085',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 0,
    marginBottom: 4,
    textAlign: 'left',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: { flex: 1 },
  modalCard: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    maxHeight: '78%',
  },
  modalHandle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#D8DEE8',
    marginBottom: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    color: NAVY,
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'left',
  },
  closeIconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F4F6FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: { paddingBottom: 18 },
  booksGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  bookOption: {
    width: '48%',
    minHeight: 46,
    borderRadius: 13,
    backgroundColor: '#F8FAFD',
    borderWidth: 1,
    borderColor: '#E3E8F1',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  bookOptionText: {
    color: NAVY,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  selectAllButton: {
    alignSelf: 'flex-start',
    minHeight: 38,
    borderRadius: 12,
    backgroundColor: '#FFF4D6',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  selectAllButtonText: { color: NAVY, fontSize: 13, fontWeight: '900' },
  chapterGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chapterOption: {
    minWidth: 44,
    minHeight: 40,
    borderRadius: 12,
    backgroundColor: '#F8FAFD',
    borderWidth: 1,
    borderColor: '#E3E8F1',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  chapterOptionText: { color: NAVY, fontSize: 13, fontWeight: '900' },
  optionSelected: { backgroundColor: NAVY, borderColor: NAVY },
  optionTextSelected: { color: '#FFF' },
});

export default React.memo(BiblePassagePicker);
