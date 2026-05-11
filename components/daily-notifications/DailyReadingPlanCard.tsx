import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Testament } from '../data/bibleMetadata';
import { dailyNotificationStyles as styles, GOLD } from './styles';

type TestamentOption = {
  key: Testament;
  label: string;
  icon: string;
};

type Props = {
  strings: any;
  selectedTestament: Testament;
  testamentOptions: TestamentOption[];
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
  onEditTime: () => void;
  onSave: () => void;
};

const renderChoiceChip = (
  label: string,
  selected: boolean,
  onPress: () => void,
  extraStyle?: object,
  textStyle?: object,
) => (
  <TouchableOpacity
    key={label}
    style={[
      styles.choiceChip,
      extraStyle,
      selected && styles.choiceChipSelected,
    ]}
    onPress={onPress}
    activeOpacity={0.85}
  >
    <Text
      style={[
        styles.choiceChipText,
        textStyle,
        selected && styles.choiceChipTextSelected,
      ]}
      numberOfLines={1}
      ellipsizeMode="tail"
    >
      {label}
    </Text>
  </TouchableOpacity>
);

const DailyReadingPlanCard = ({
  strings,
  selectedTestament,
  testamentOptions,
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

    <Text style={styles.fieldLabel}>{strings.selectBook}</Text>

    <View style={styles.testamentTabs}>
      {testamentOptions.map(option => {
        const active = selectedTestament === option.key;
        return (
          <TouchableOpacity
            key={option.key}
            style={[styles.testamentTab, active && styles.testamentTabActive]}
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
        <Text style={styles.bookPanelCount}>{booksForTestament.length} سفر</Text>
      </View>

      <ScrollView
        horizontal
        style={styles.bookListScroll}
        contentContainerStyle={styles.bookListContent}
        showsHorizontalScrollIndicator={false}
      >
        {booksForTestament.map(book =>
          renderChoiceChip(
            book.bookName,
            readingBook === book.bookName,
            () => onSetReadingBook(book.bookName),
            styles.bookChoiceChip,
            styles.bookChoiceChipText,
          ),
        )}
      </ScrollView>
    </View>

    <Text style={styles.fieldLabel}>{strings.selectChapter}</Text>
    <Text style={styles.rangeHint}>
      {readingBook ? strings.chapterRangeHint : strings.selectBookFirst}
    </Text>
    {readingBook ? (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.choiceRow}
      >
        {chapterOptions.map(chapter =>
          renderChoiceChip(
            `اصحاح ${chapter}`,
            selectedChapters.includes(chapter),
            () => onToggleChapter(chapter),
          ),
        )}
      </ScrollView>
    ) : null}

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

export default React.memo(DailyReadingPlanCard);
