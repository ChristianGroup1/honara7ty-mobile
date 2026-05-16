import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Testament } from '../data/bibleMetadata';
import { homeStyles as styles } from './styles';
import BiblePassagePicker from '../shared/BiblePassagePicker';

type Props = {
  visible: boolean;
  strings: any;
  pendingCompleted: boolean;
  selectedTestament: Testament;
  books: Array<{ bookID: string | number; bookName: string }>;
  readingBook: string;
  chapterOptions: number[];
  selectedChapters: number[];
  canSaveReading: boolean;
  onClose: () => void;
  onSetPendingCompleted: (value: boolean) => void;
  onSetSelectedTestament: (value: Testament) => void;
  onSetReadingBook: (value: string) => void;
  onToggleChapter: (value: number) => void;
  onSave: () => void;
};

const HomeAnswerSheet = ({
  visible,
  strings,
  pendingCompleted,
  selectedTestament,
  books,
  readingBook,
  chapterOptions,
  selectedChapters,
  canSaveReading,
  onClose,
  onSetPendingCompleted,
  onSetSelectedTestament,
  onSetReadingBook,
  onToggleChapter,
  onSave,
}: Props) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.sheetOverlay}>
        <Pressable style={styles.sheetBackdrop} onPress={onClose} />
        <View style={styles.answerSheet}>
          <Text style={styles.answerSheetTitle}>
            {strings.answerSheetTitle}
          </Text>
          <Text style={styles.answerSheetSubtitle}>
            {strings.answerSheetSubtitle}
          </Text>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.answerSheetScrollContent}
          >
            <View style={styles.answerBinaryRow}>
              <TouchableOpacity
                style={[
                  styles.answerBinaryBtn,
                  pendingCompleted && styles.answerBinaryBtnSelected,
                ]}
                onPress={() => onSetPendingCompleted(true)}
              >
                <Text
                  style={[
                    styles.answerBinaryText,
                    pendingCompleted && styles.answerBinaryTextSelected,
                  ]}
                >
                  {strings.yes}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.answerBinaryBtn,
                  !pendingCompleted && styles.answerBinaryBtnSelected,
                ]}
                onPress={() => onSetPendingCompleted(false)}
              >
                <Text
                  style={[
                    styles.answerBinaryText,
                    !pendingCompleted && styles.answerBinaryTextSelected,
                  ]}
                >
                  {strings.no}
                </Text>
              </TouchableOpacity>
            </View>

            {pendingCompleted ? (
              <BiblePassagePicker
                labels={{
                  bookTitle: strings.answerBook,
                  chapterTitle: strings.answerChapter,
                  chapterHint: strings.answerRangeHint,
                  selectBookFirst: strings.selectBookFirst,
                  oldTestament: strings.oldTestament,
                  newTestament: strings.newTestament,
                  selectAllChapters: strings.selectAllChapters,
                }}
                selectedTestament={selectedTestament}
                books={books.map(book => ({
                  ...book,
                  bookID: String(book.bookID),
                }))}
                selectedBook={readingBook}
                chapterOptions={chapterOptions}
                selectedChapters={selectedChapters}
                onSetTestament={onSetSelectedTestament}
                onSetBook={onSetReadingBook}
                onToggleChapter={onToggleChapter}
                onSelectAllChapters={() =>
                  chapterOptions.forEach(chapter => {
                    if (!selectedChapters.includes(chapter)) {
                      onToggleChapter(chapter);
                    }
                  })
                }
                onClearChapters={() =>
                  selectedChapters.forEach(chapter => onToggleChapter(chapter))
                }
              />
            ) : null}
          </ScrollView>

          <TouchableOpacity
            style={[
              styles.saveAnswerBtn,
              pendingCompleted &&
                !canSaveReading &&
                styles.saveAnswerBtnDisabled,
            ]}
            onPress={onSave}
            disabled={pendingCompleted && !canSaveReading}
          >
            <Text style={styles.saveAnswerBtnText}>{strings.saveAnswer}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default React.memo(HomeAnswerSheet);
