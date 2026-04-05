import React from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BibleBook, Testament } from '../data/bibleMetadata';
import { devotionCalendarStyles as styles } from './styles';
import { TestamentOption } from './types';

type Strings = any;

type Props = {
  strings: Strings;
  visible: boolean;
  selectedDate: string;
  selectedCompleted: boolean;
  selectedBook: string;
  selectedChapters: number[];
  selectedTestament: Testament;
  saving: boolean;
  books: BibleBook[];
  chapterOptions: number[];
  testamentOptions: TestamentOption[];
  onClose: () => void;
  onSetCompleted: (value: boolean) => void;
  onSetTestament: (value: Testament) => void;
  onSetBook: (value: string) => void;
  onToggleChapter: (value: number) => void;
  onSave: () => void;
};

const DevotionDayEditor = ({
  strings,
  visible,
  selectedDate,
  selectedCompleted,
  selectedBook,
  selectedChapters,
  selectedTestament,
  saving,
  books,
  chapterOptions,
  testamentOptions,
  onClose,
  onSetCompleted,
  onSetTestament,
  onSetBook,
  onToggleChapter,
  onSave,
}: Props) => (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
    onRequestClose={onClose}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.editorCard}>
        <View style={styles.editorHandle} />
        <Text style={styles.editorTitle}>{strings.trackDayTitle}</Text>
        <Text style={styles.editorSubtitle}>{strings.trackDaySubtitle}</Text>
        <Text style={styles.selectedDateText}>
          {strings.pickedDate}: {selectedDate}
        </Text>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.editorScrollContent}
        >
          <Text style={styles.fieldTitle}>{strings.answerQuestion}</Text>
          <View style={styles.binaryRow}>
            <TouchableOpacity
              style={[
                styles.binaryBtn,
                selectedCompleted && styles.binaryBtnSelected,
              ]}
              onPress={() => onSetCompleted(true)}
            >
              <Text
                style={[
                  styles.binaryText,
                  selectedCompleted && styles.binaryTextSelected,
                ]}
              >
                {strings.yes}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.binaryBtn,
                !selectedCompleted && styles.binaryBtnSelected,
              ]}
              onPress={() => onSetCompleted(false)}
            >
              <Text
                style={[
                  styles.binaryText,
                  !selectedCompleted && styles.binaryTextSelected,
                ]}
              >
                {strings.no}
              </Text>
            </TouchableOpacity>
          </View>

          {selectedCompleted ? (
            <>
              <Text style={styles.fieldTitle}>{strings.selectBook}</Text>

              <View style={styles.testamentTabs}>
                {testamentOptions.map(option => {
                  const active = selectedTestament === option.key;
                  return (
                    <TouchableOpacity
                      key={option.key}
                      style={[
                        styles.testamentTab,
                        active && styles.testamentTabActive,
                      ]}
                      onPress={() => onSetTestament(option.key)}
                    >
                      <Text
                        style={[
                          styles.testamentTabText,
                          active && styles.testamentTabTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.bookPanel}>
                <View style={styles.bookPanelHeader}>
                  <Text style={styles.bookPanelTitle}>
                    {selectedTestament === 'old'
                      ? strings.oldTestament
                      : strings.newTestament}
                  </Text>
                  <Text style={styles.bookPanelCount}>{books.length} سفر</Text>
                </View>
                <ScrollView
                  horizontal
                  style={styles.bookListScroll}
                  contentContainerStyle={styles.bookListContent}
                  showsHorizontalScrollIndicator={false}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled
                >
                  {books.map(book => (
                    <TouchableOpacity
                      key={`book-${book.bookID}`}
                      style={[
                        styles.choiceChip,
                        styles.bookChoiceChip,
                        selectedBook === book.bookName &&
                          styles.choiceChipSelected,
                      ]}
                      onPress={() => onSetBook(book.bookName)}
                    >
                      <Text
                        style={[
                          styles.choiceChipText,
                          styles.bookChoiceChipText,
                          selectedBook === book.bookName &&
                            styles.choiceChipTextSelected,
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

              <Text style={styles.fieldTitle}>{strings.selectChapter}</Text>
              <Text style={styles.rangeHint}>{strings.chapterRangeHint}</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalChipWrap}
              >
                {chapterOptions.map(chapter => (
                  <TouchableOpacity
                    key={`chapter-${chapter}`}
                    style={[
                      styles.choiceChip,
                      selectedChapters.includes(chapter) &&
                        styles.choiceChipSelected,
                    ]}
                    onPress={() => onToggleChapter(chapter)}
                  >
                    <Text
                      style={[
                        styles.choiceChipText,
                        selectedChapters.includes(chapter) &&
                          styles.choiceChipTextSelected,
                      ]}
                    >
                      {chapter}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          ) : null}
        </ScrollView>

        <View style={styles.modalActionsRow}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>{strings.closeEditor}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            disabled={saving}
            onPress={onSave}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.saveBtnText}>{strings.saveDay}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

export default DevotionDayEditor;
