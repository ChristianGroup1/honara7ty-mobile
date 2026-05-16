import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Testament } from '../data/bibleMetadata';
import { dailyNotificationStyles as styles, GOLD, NAVY } from './styles';
import BiblePassagePicker from '../shared/BiblePassagePicker';


type Props = {
  strings: any;
  selectedTestament: Testament;
  booksForTestament: Array<{ bookID: string | number; bookName: string }>;
  readingBook: string;
  chapterOptions: number[];
  selectedChapters: number[];
  timeDisplay: string;
  saving: boolean;
  saved: boolean;
  canSaveReading: boolean;
  onSetTestament: (value: Testament) => void;
  onSetReadingBook: (value: string) => void;
  onToggleChapter: (value: number) => void;
  onSelectAllChapters?: () => void;
  onClearChapters?: () => void;
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
  timeDisplay,
  saving,
  saved,
  canSaveReading,
  onSetTestament,
  onSetReadingBook,
  onToggleChapter,
  onSelectAllChapters,
  onClearChapters,
  onEditTime,
  onSave,
}: Props) => (
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

const cardStyles = StyleSheet.create({
  pickerContainer: {
    marginVertical: 12,
  },
});

export default React.memo(DailyReadingPlanCard);
