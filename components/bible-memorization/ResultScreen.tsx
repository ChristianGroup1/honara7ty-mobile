import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import MemorizationHeader from './MemorizationHeader';
import {
  createThemedMemorizationStyles,
  memorizationStyles as styles,
} from './styles';
import { MemorizationStackParamList } from './types';
import { GOLD } from './utils';
import { getStrings } from '../../localization';
import { saveMemorizationAttempt } from '../../lib/memorization';
import { useEffect } from 'react';
import { useNightMode } from '../../lib/nightMode';

type Props = StackScreenProps<MemorizationStackParamList, 'Result'>;

const ResultScreen = ({ navigation, route }: Props) => {
  const strings = getStrings().bibleMemorization.result;
  const { colors } = useNightMode();
  const themedStyles = React.useMemo(
    () => createThemedMemorizationStyles(colors),
    [colors],
  );
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

  useEffect(() => {
    saveMemorizationAttempt(result);
  }, []);

  return (
    <View style={[styles.container, themedStyles.container]}>
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
            <View style={styles.resultStatCard}>
              <Text style={styles.resultStatNumber}>
                {result.timeSeconds || 0}
              </Text>
              <Text style={styles.resultStatLabel}>
                {strings.timeTaken(result.timeSeconds || 0).split(': ')[1]}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.infoCard, themedStyles.cardMuted]}>
          <Text style={[styles.resultMetaLabel, themedStyles.mutedText]}>
            {strings.verseReferenceLabel}
          </Text>
          <Text style={styles.refText}>
            {result.bookLabel} - {result.chapterLabel}
          </Text>
          <Text style={[styles.instructionText, themedStyles.mutedText]}>{strings.instruction}</Text>
        </View>

        <View style={[styles.verseBox, themedStyles.card]}>
          <View style={[styles.verseBoxHeader, themedStyles.dividerBorder]}>
            <Text style={[styles.verseBoxTitle, themedStyles.primaryText]}>
              {isFullTextMode
                ? strings.writtenReviewAnswers
                : strings.reviewAnswers}
            </Text>
            <MaterialCommunityIcons
              name="check-circle-outline"
              size={18}
              color="#78A1BD"
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
                <Text key={i} style={[styles.wordText, themedStyles.primaryText]}>
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
              selectedVerses: result.selectedVerses,
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

        <View style={styles.resultActionsRow}>
          <TouchableOpacity
            style={[styles.resultSecondaryBtn, themedStyles.resultSecondaryBtn]}
            onPress={() =>
              navigation.reset({ index: 0, routes: [{ name: 'Pick' }] })
            }
          >
            <MaterialCommunityIcons
              name="book-search-outline"
              size={19}
              color={colors.text}
            />
            <Text style={[styles.resultSecondaryBtnText, themedStyles.primaryText]}>
              {strings.chooseAnotherReference}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resultHomeBtn}
            onPress={() => {
              navigation.reset({ index: 0, routes: [{ name: 'Pick' }] });
              navigation.getParent()?.navigate('Home');
            }}
          >
            <MaterialCommunityIcons name="home" size={19} color="#FFF" />
            <Text style={styles.resultHomeBtnText}>{strings.backToHome}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

export default ResultScreen;
