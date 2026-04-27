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
              <>
                <Text style={styles.answerFieldTitle}>
                  {strings.answerBook}
                </Text>
                <View style={styles.answerTestamentTabs}>
                  <TouchableOpacity
                    style={[
                      styles.answerTestamentTab,
                      selectedTestament === 'old' &&
                        styles.answerTestamentTabActive,
                    ]}
                    onPress={() => onSetSelectedTestament('old')}
                  >
                    <Text
                      style={[
                        styles.answerTestamentTabText,
                        selectedTestament === 'old' &&
                          styles.answerTestamentTabTextActive,
                      ]}
                    >
                      {strings.oldTestament}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.answerTestamentTab,
                      selectedTestament === 'new' &&
                        styles.answerTestamentTabActive,
                    ]}
                    onPress={() => onSetSelectedTestament('new')}
                  >
                    <Text
                      style={[
                        styles.answerTestamentTabText,
                        selectedTestament === 'new' &&
                          styles.answerTestamentTabTextActive,
                      ]}
                    >
                      {strings.newTestament}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.answerBookPanel}>
                  <View style={styles.answerBookPanelHeader}>
                    <Text style={styles.answerBookPanelTitle}>
                      {selectedTestament === 'old'
                        ? strings.oldTestament
                        : strings.newTestament}
                    </Text>
                    <Text style={styles.answerBookPanelCount}>
                      {books.length} سفر
                    </Text>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.answerChoiceRow}
                  >
                    {books.map(book => (
                      <TouchableOpacity
                        key={book.bookID}
                        style={[
                          styles.answerChoiceChip,
                          styles.answerBookChoiceChip,
                          readingBook === book.bookName &&
                            styles.answerChoiceChipSelected,
                        ]}
                        onPress={() => onSetReadingBook(book.bookName)}
                      >
                        <Text
                          style={[
                            styles.answerChoiceText,
                            styles.answerBookChoiceText,
                            readingBook === book.bookName &&
                              styles.answerChoiceTextSelected,
                          ]}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {book.bookName}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <Text style={styles.answerFieldTitle}>
                  {strings.answerChapter}
                </Text>
                <Text style={styles.answerRangeHint}>
                  {readingBook ? strings.answerRangeHint : strings.selectBookFirst}
                </Text>
                {readingBook ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.answerChoiceRow}
                  >
                    {chapterOptions.map(chapter => {
                      return (
                        <TouchableOpacity
                          key={`chapter-${chapter}`}
                          style={[
                            styles.answerChoiceChip,
                            selectedChapters.includes(chapter) &&
                              styles.answerChoiceChipSelected,
                          ]}
                          onPress={() => onToggleChapter(chapter)}
                        >
                          <Text
                            style={[
                              styles.answerChoiceText,
                              selectedChapters.includes(chapter) &&
                                styles.answerChoiceTextSelected,
                            ]}
                          >
                            {chapter}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                ) : null}
              </>
            ) : null}
          </ScrollView>

          <TouchableOpacity
            style={[
              styles.saveAnswerBtn,
              pendingCompleted && !canSaveReading && styles.saveAnswerBtnDisabled,
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

export default HomeAnswerSheet;
