import React from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { homeStyles as styles } from './styles';

type Props = {
  visible: boolean;
  strings: any;
  pendingCompleted: boolean;
  oldTestamentBooks: Array<{ bookID: string | number; bookName: string }>;
  newTestamentBooks: Array<{ bookID: string | number; bookName: string }>;
  readingBook: string;
  chapterOptions: number[];
  readingChapter: number;
  chaptersRead: number;
  onClose: () => void;
  onSetPendingCompleted: (value: boolean) => void;
  onSetReadingBook: (value: string) => void;
  onSetReadingChapter: (value: number) => void;
  onSetChaptersRead: (value: number) => void;
  onSave: () => void;
};

const HomeAnswerSheet = ({
  visible,
  strings,
  pendingCompleted,
  oldTestamentBooks,
  newTestamentBooks,
  readingBook,
  chapterOptions,
  readingChapter,
  chaptersRead,
  onClose,
  onSetPendingCompleted,
  onSetReadingBook,
  onSetReadingChapter,
  onSetChaptersRead,
  onSave,
}: Props) => (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
    onRequestClose={onClose}
  >
    <View style={styles.sheetOverlay}>
      <View style={styles.answerSheet}>
        <Text style={styles.answerSheetTitle}>{strings.answerSheetTitle}</Text>
        <Text style={styles.answerSheetSubtitle}>{strings.answerSheetSubtitle}</Text>

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

        <Text style={styles.answerFieldTitle}>{strings.answerBook}</Text>
        <Text style={styles.answerGroupLabel}>{strings.oldTestament}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.answerChoiceRow}
        >
          {oldTestamentBooks.map(book => (
            <TouchableOpacity
              key={book.bookID}
              style={[
                styles.answerChoiceChip,
                readingBook === book.bookName && styles.answerChoiceChipSelected,
              ]}
              onPress={() => onSetReadingBook(book.bookName)}
            >
              <Text
                style={[
                  styles.answerChoiceText,
                  readingBook === book.bookName &&
                    styles.answerChoiceTextSelected,
                ]}
              >
                {book.bookName}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <Text style={styles.answerGroupLabel}>{strings.newTestament}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.answerChoiceRow}
        >
          {newTestamentBooks.map(book => (
            <TouchableOpacity
              key={book.bookID}
              style={[
                styles.answerChoiceChip,
                readingBook === book.bookName && styles.answerChoiceChipSelected,
              ]}
              onPress={() => onSetReadingBook(book.bookName)}
            >
              <Text
                style={[
                  styles.answerChoiceText,
                  readingBook === book.bookName &&
                    styles.answerChoiceTextSelected,
                ]}
              >
                {book.bookName}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.answerFieldTitle}>{strings.answerChapter}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.answerChoiceRow}
        >
          {chapterOptions.map(chapter => (
            <TouchableOpacity
              key={`chapter-${chapter}`}
              style={[
                styles.answerChoiceChip,
                readingChapter === chapter && styles.answerChoiceChipSelected,
              ]}
              onPress={() => onSetReadingChapter(chapter)}
            >
              <Text
                style={[
                  styles.answerChoiceText,
                  readingChapter === chapter && styles.answerChoiceTextSelected,
                ]}
              >
                {chapter}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.answerFieldTitle}>{strings.answerVerses}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.answerChoiceRow}
        >
          {chapterOptions.map(value => (
            <TouchableOpacity
              key={`read-${value}`}
              style={[
                styles.answerChoiceChip,
                chaptersRead === value && styles.answerChoiceChipSelected,
              ]}
              onPress={() => onSetChaptersRead(value)}
            >
              <Text
                style={[
                  styles.answerChoiceText,
                  chaptersRead === value && styles.answerChoiceTextSelected,
                ]}
              >
                {value}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity style={styles.saveAnswerBtn} onPress={onSave}>
          <Text style={styles.saveAnswerBtnText}>{strings.saveAnswer}</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

export default HomeAnswerSheet;
