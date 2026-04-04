import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Testament } from '../data/bibleMetadata';
import { dailyNotificationStyles as styles, NAVY } from './styles';

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
  readingChapter: number;
  dailyChaptersTarget: number;
  onSetTestament: (value: Testament) => void;
  onSetReadingBook: (value: string) => void;
  onSetReadingChapter: (value: number) => void;
  onSetDailyTarget: (value: number) => void;
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
  readingChapter,
  dailyChaptersTarget,
  onSetTestament,
  onSetReadingBook,
  onSetReadingChapter,
  onSetDailyTarget,
}: Props) => (
  <View style={styles.pickerCard}>
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{strings.readingPlanTitle}</Text>
      <Text style={styles.sectionSubtitle}>{strings.readingPlanSubtitle}</Text>
    </View>

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
        <Text style={styles.bookPanelCount}>
          {booksForTestament.length} سفر
        </Text>
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
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.choiceRow}
    >
      {chapterOptions.map(chapter =>
        renderChoiceChip(`اصحاح ${chapter}`, readingChapter === chapter, () =>
          onSetReadingChapter(chapter),
        ),
      )}
    </ScrollView>

    <Text style={styles.fieldLabel}>{strings.chaptersPerDay}</Text>
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.choiceRow}
    >
      {chapterOptions.map(value =>
        renderChoiceChip(`${value}`, dailyChaptersTarget === value, () =>
          onSetDailyTarget(value),
        ),
      )}
    </ScrollView>
  </View>
);

export default DailyReadingPlanCard;
