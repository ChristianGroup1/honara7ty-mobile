import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BibleBook, Testament } from '../data/bibleMetadata';
import { devotionCalendarStyles as styles } from './styles';
import BiblePassagePicker from '../shared/BiblePassagePicker';
import { ReadingEntry, formatReadingEntries } from '../../lib/readingEntries';

type Strings = any;

type Props = {
  strings: Strings;
  visible: boolean;
  selectedDate: string;
  selectedCompleted: boolean;
  selectedBook: string;
  selectedChapters: number[];
  readingEntries: ReadingEntry[];
  selectedTestament: Testament;
  saving: boolean;
  books: BibleBook[];
  chapterOptions: number[];
  canSaveReading: boolean;
  onClose: () => void;
  onSetCompleted: (value: boolean) => void;
  onSetTestament: (value: Testament) => void;
  onSetBook: (value: string) => void;
  onToggleChapter: (value: number) => void;
  onAddReadingEntry: () => void;
  onRemoveReadingEntry: (index: number) => void;
  onSave: () => void;
};

const DevotionDayEditor = ({
  strings,
  visible,
  selectedDate,
  selectedCompleted,
  selectedBook,
  selectedChapters,
  readingEntries,
  selectedTestament,
  saving,
  books,
  chapterOptions,
  canSaveReading,
  onClose,
  onSetCompleted,
  onSetTestament,
  onSetBook,
  onToggleChapter,
  onAddReadingEntry,
  onRemoveReadingEntry,
  onSave,
}: Props) => {
  const canAddReading = Boolean(selectedBook && selectedChapters.length > 0);

  return (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
    onRequestClose={onClose}
  >
    <View style={styles.modalOverlay}>
      <Pressable style={styles.modalBackdrop} onPress={onClose} />
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
              <Text style={styles.multiReadingHint}>
                {strings.multipleReadingsHint}
              </Text>
              <BiblePassagePicker
                labels={{
                  bookTitle: strings.selectBook,
                  chapterTitle: strings.selectChapter,
                  chapterHint: strings.chapterRangeHint,
                  selectBookFirst: strings.selectBookFirst,
                  oldTestament: strings.oldTestament,
                  newTestament: strings.newTestament,
                  selectAllChapters: strings.selectAllChapters,
                }}
                selectedTestament={selectedTestament}
                books={books}
                selectedBook={selectedBook}
                chapterOptions={chapterOptions}
                selectedChapters={selectedChapters}
                onSetTestament={onSetTestament}
                onSetBook={onSetBook}
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
              <TouchableOpacity
                style={[
                  styles.addReadingEntryBtn,
                  !canAddReading && styles.addReadingEntryBtnDisabled,
                ]}
                disabled={!canAddReading}
                onPress={onAddReadingEntry}
              >
                <Text style={styles.addReadingEntryText}>
                  {strings.addReadingEntry}
                </Text>
              </TouchableOpacity>
              {readingEntries.length > 0 ? (
                <View style={styles.readingEntriesBox}>
                  {readingEntries.map((entry, index) => (
                    <View
                      key={`${entry.reading_book}-${index}`}
                      style={styles.readingEntryRow}
                    >
                      <Text style={styles.readingEntryText}>
                        {formatReadingEntries([entry])}
                      </Text>
                      <TouchableOpacity
                        style={styles.readingEntryRemove}
                        onPress={() => onRemoveReadingEntry(index)}
                      >
                        <Text style={styles.readingEntryRemoveText}>
                          {strings.removeReadingEntry}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              ) : null}
            </>
          ) : null}
        </ScrollView>

        <View style={styles.modalActionsRow}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>{strings.closeEditor}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.saveBtn,
              (saving || (selectedCompleted && !canSaveReading)) &&
                styles.saveBtnDisabled,
            ]}
            disabled={saving || (selectedCompleted && !canSaveReading)}
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
};

export default DevotionDayEditor;
