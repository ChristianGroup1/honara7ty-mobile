import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import MemorizationHeader from './MemorizationHeader';
import { memorizationStyles as styles } from './styles';
import { MemorizationStackParamList } from './types';
import { GOLD } from './utils';
import { getStrings } from '../../localization';

type Props = StackScreenProps<MemorizationStackParamList, 'Result'>;

const ResultScreen = ({ navigation, route }: Props) => {
  const strings = getStrings().bibleMemorization.result;
  const result = route.params;
  const isFullTextMode = result.difficulty === 'fullText';
  const isPerfect = result.score === result.total;
  const isGood = !isPerfect && result.score >= result.total * 0.7;
  const statusIcon = isPerfect
    ? 'medal-outline'
    : isGood
    ? 'star-outline'
    : 'refresh';
  const statusText = isPerfect
    ? strings.perfect
    : isGood
    ? strings.good
    : strings.retry;
  const statusBadge = isPerfect
    ? strings.perfectBadge
    : isGood
    ? strings.goodBadge
    : strings.retryBadge;

  return (
    <View style={styles.container}>
      <MemorizationHeader
        title={strings.title}
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.scoreBox, styles.resultHeroCard]}>
          <View style={styles.resultHeroGlow} />
          <View style={styles.resultHeroTopRow}>
            <View style={styles.resultHeroBadge}>
              <Text style={styles.resultHeroBadgeText}>{strings.badge}</Text>
            </View>
            <View style={styles.resultHeroIconWrap}>
              <MaterialCommunityIcons
                name={statusIcon}
                size={28}
                color={isPerfect ? GOLD : '#FFF'}
              />
            </View>
          </View>

          <Text style={styles.scoreLabel}>{strings.scoreLabel}</Text>
          <Text style={styles.scoreText}>
            {result.score} / {result.total}
          </Text>
          <Text style={styles.resultHeroMessage}>{statusText}</Text>
          <View style={styles.resultToneBadge}>
            <Text style={styles.resultToneBadgeText}>{statusBadge}</Text>
          </View>

          <View style={styles.resultStatsRow}>
            <View style={styles.resultStatCard}>
              <Text style={styles.resultStatNumber}>{result.total}</Text>
              <Text style={styles.resultStatLabel}>
                {strings.hiddenWordsLabel}
              </Text>
            </View>
            <View style={styles.resultStatCard}>
              <Text style={styles.resultStatNumber}>{result.score}</Text>
              <Text style={styles.resultStatLabel}>
                {strings.correctWordsLabel}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.resultMetaLabel}>
            {strings.verseReferenceLabel}
          </Text>
          <Text style={styles.refText}>
            {result.bookLabel} - {result.chapterLabel}
          </Text>
          <Text style={styles.instructionText}>{strings.instruction}</Text>
        </View>

        <View style={styles.verseBox}>
          <View style={styles.verseBoxHeader}>
            <Text style={styles.verseBoxTitle}>
              {isFullTextMode
                ? strings.writtenReviewAnswers
                : strings.reviewAnswers}
            </Text>
            <MaterialCommunityIcons
              name="check-circle-outline"
              size={18}
              color="#C9A84C"
            />
          </View>
          <View style={styles.wordsWrap}>
            {result.slots.map((slot, i) =>
              slot.hidden ? (
                <View
                  key={i}
                  style={[
                    styles.resultSlot,
                    slot.correct ? styles.resultCorrect : styles.resultWrong,
                  ]}
                >
                  <Text
                    style={[
                      styles.resultSlotText,
                      slot.correct
                        ? styles.resultSlotCorrectText
                        : styles.resultSlotWrongText,
                    ]}
                  >
                    {slot.correct
                      ? slot.word
                      : `${slot.userInput || strings.wrongAnswerFallback} ← ${
                          slot.word
                        }`}
                  </Text>
                </View>
              ) : isFullTextMode ? null : (
                <Text key={i} style={styles.wordText}>
                  {slot.word}{' '}
                </Text>
              ),
            )}
          </View>
        </View>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() =>
            navigation.replace('Recite', {
              selectedBook: result.selectedBook,
              selectedChapter: result.selectedChapter,
              selectedVerseStart: result.selectedVerseStart,
              selectedVerseEnd: result.selectedVerseEnd,
              verseMode: result.verseMode,
              difficulty: result.difficulty,
              verseOriginal: result.verseOriginal,
              bookLabel: result.bookLabel,
              chapterLabel: result.chapterLabel,
            })
          }
        >
          <MaterialCommunityIcons name="refresh" size={20} color="#FFF" />
          <Text style={styles.primaryBtnText}>{strings.retryAction}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.ghostBtn}
          onPress={() => navigation.navigate('Pick')}
        >
          <Text style={styles.ghostBtnText}>
            {strings.chooseAnotherReference}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

export default ResultScreen;
