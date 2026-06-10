import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Testament } from '../data/bibleMetadata';
import { dailyNotificationStyles as styles, GOLD } from './styles';
import BiblePassagePicker from '../shared/BiblePassagePicker';
import { ReadingEntry, formatReadingEntries } from '../../lib/readingEntries';


type Props = {
  strings: any;
  selectedTestament: Testament;
  booksForTestament: Array<{ bookID: string | number; bookName: string }>;
  readingBook: string;
  chapterOptions: number[];
  selectedChapters: number[];
  readingEntries: ReadingEntry[];
  timeDisplay: string;
  saving: boolean;
  saved: boolean;
  canSaveReading: boolean;
  onSetTestament: (value: Testament) => void;
  onSetReadingBook: (value: string) => void;
  onToggleChapter: (value: number) => void;
  onSelectAllChapters?: () => void;
  onClearChapters?: () => void;
  onAddReadingEntry: () => void;
  onRemoveReadingEntry: (index: number) => void;
  onOpenSuggestions: () => void;
  onEditTime: () => void;
  onSave: () => void;
};


const DailyReadingPlanCard = ({
  strings,
  selectedTestament,
  booksForTestament,
  readingBook,
  chapterOptions,
  selectedChapters,
  readingEntries,
  timeDisplay,
  saving,
  saved,
  canSaveReading,
  onSetTestament,
  onSetReadingBook,
  onToggleChapter,
  onSelectAllChapters,
  onClearChapters,
  onAddReadingEntry,
  onRemoveReadingEntry,
  onOpenSuggestions,
  onEditTime,
  onSave,
}: Props) => {
  const canAddReading = Boolean(readingBook && selectedChapters.length > 0);

  return (
  <View style={styles.pickerCard}>
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{strings.readingPlanTitle}</Text>
      <Text style={styles.sectionSubtitle}>{strings.readingPlanSubtitle}</Text>
    </View>

    <TouchableOpacity style={styles.inlineTimeCard} onPress={onEditTime}>
      <View style={styles.inlineTimeIconWrap}>
        <MaterialCommunityIcons
          name="clock-time-four-outline"
          size={18}
          color="#FFF"
        />
      </View>
      <View style={styles.inlineTimeBody}>
        <Text style={styles.inlineTimeLabel}>{strings.selectedTime}</Text>
        <Text style={styles.inlineTimeValue}>{timeDisplay}</Text>
      </View>
      <MaterialCommunityIcons name="pencil-outline" size={18} color={GOLD} />
    </TouchableOpacity>


    <View style={cardStyles.pickerContainer}>
      <Text style={styles.multiReadingHint}>
        {strings.multipleReadingsHint}
      </Text>
      <TouchableOpacity
        style={styles.openSuggestionsCard}
        onPress={onOpenSuggestions}
        activeOpacity={0.84}
        accessibilityRole="button"
        accessibilityLabel={strings.openSuggestions}
      >
        <View style={styles.openSuggestionsIcon}>
          <MaterialCommunityIcons name="map-search-outline" size={20} color={GOLD} />
        </View>
        <View style={styles.openSuggestionsBody}>
          <Text style={styles.openSuggestionsTitle}>
            {strings.suggestionsTitle}
          </Text>
          <Text style={styles.openSuggestionsText}>
            {strings.suggestionsSubtitle}
          </Text>
        </View>
        <MaterialCommunityIcons name="chevron-left" size={22} color={GOLD} />
      </TouchableOpacity>
      <BiblePassagePicker
        labels={{
          bookTitle: strings.selectBook,
          chapterTitle: strings.selectChapter,
          chapterHint: strings.chapterRangeHint,
          selectBookFirst: strings.selectBookFirst,
          oldTestament: strings.oldTestament,
          newTestament: strings.newTestament,
          selectAllChapters: strings.selectAllChapters || 'اختيار الكل',
        }}
        selectedTestament={selectedTestament}
        books={booksForTestament}
        selectedBook={readingBook}
        chapterOptions={chapterOptions}
        selectedChapters={selectedChapters}
        onSetTestament={onSetTestament}
        onSetBook={onSetReadingBook}
        onToggleChapter={onToggleChapter}
        onSelectAllChapters={onSelectAllChapters}
        onClearChapters={onClearChapters}
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
    </View>

    <TouchableOpacity
      style={[
        styles.saveBtn,
        (saving || !canSaveReading) && styles.saveBtnDisabled,
      ]}
      onPress={onSave}
      disabled={saving || !canSaveReading}
    >
      {saving ? (
        <MaterialCommunityIcons
          name="loading"
          size={20}
          color="#FFF"
        />
      ) : (
        <>
          <MaterialCommunityIcons
            name={saved ? 'check-bold' : 'content-save-outline'}
            size={20}
            color="#FFF"
          />
          <Text style={styles.saveBtnText}>{strings.saveTime}</Text>
        </>
      )}
    </TouchableOpacity>
  </View>
  );
};

const cardStyles = StyleSheet.create({
  pickerContainer: {
    marginVertical: 12,
  },
});

export default React.memo(DailyReadingPlanCard);
