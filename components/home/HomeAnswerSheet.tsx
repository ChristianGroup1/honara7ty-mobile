import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Testament } from '../data/bibleMetadata';
import { createHomeStyles } from './styles';
import BiblePassagePicker from '../shared/BiblePassagePicker';
import { ReadingEntry, formatReadingEntries } from '../../lib/readingEntries';
import { useNightMode } from '../../lib/nightMode';

type Props = {
  visible: boolean;
  strings: any;
  pendingCompleted: boolean;
  selectedTestament: Testament;
  books: Array<{ bookID: string | number; bookName: string }>;
  readingBook: string;
  chapterOptions: number[];
  selectedChapters: number[];
  readingEntries: ReadingEntry[];
  canSaveReading: boolean;
  planLabel?: string;
  planDayNumber?: number;
  planApplied?: boolean;
  onApplyPlan?: () => void;
  onClose: () => void;
  onSetPendingCompleted: (value: boolean) => void;
  onSetSelectedTestament: (value: Testament) => void;
  onSetReadingBook: (value: string) => void;
  onToggleChapter: (value: number) => void;
  onAddReadingEntry: () => void;
  onRemoveReadingEntry: (index: number) => void;
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
  readingEntries,
  canSaveReading,
  planLabel,
  planDayNumber,
  planApplied,
  onApplyPlan,
  onClose,
  onSetPendingCompleted,
  onSetSelectedTestament,
  onSetReadingBook,
  onToggleChapter,
  onAddReadingEntry,
  onRemoveReadingEntry,
  onSave,
}: Props) => {
  const canAddReading = Boolean(readingBook && selectedChapters.length > 0);
  const { colors } = useNightMode();
  const styles = React.useMemo(() => createHomeStyles(colors), [colors]);

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
                {planLabel ? (
                  <View style={styles.planTodayCard}>
                    <View style={styles.planTodayHeaderRow}>
                      <MaterialCommunityIcons
                        name="map-marker-path"
                        size={18}
                        color="#FFF"
                      />
                      <Text style={styles.planTodayEyebrow}>
                        {strings.planTodayEyebrow}
                        {planDayNumber
                          ? ` · ${strings.planTodayDay(planDayNumber)}`
                          : ''}
                      </Text>
                    </View>
                    <Text style={styles.planTodayQuestion}>
                      {strings.planTodayQuestion}
                    </Text>
                    <Text style={styles.planTodayLabel}>{planLabel}</Text>
                    <TouchableOpacity
                      style={[
                        styles.planTodayBtn,
                        planApplied && styles.planTodayBtnApplied,
                      ]}
                      onPress={onApplyPlan}
                      disabled={planApplied}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.planTodayBtnText}>
                        {planApplied
                          ? strings.planTodayApplied
                          : strings.planTodayApply}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
                <Text style={styles.answerSheetHint}>
                  {strings.multipleReadingsHint}
                </Text>
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
                    selectedChapters.forEach(chapter =>
                      onToggleChapter(chapter),
                    )
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
