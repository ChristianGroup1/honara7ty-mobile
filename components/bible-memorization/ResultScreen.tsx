import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import MemorizationHeader from './MemorizationHeader';
import { memorizationStyles as styles } from './styles';
import { MemorizationStackParamList } from './types';
import { GOLD, NAVY } from './utils';

type Props = StackScreenProps<MemorizationStackParamList, 'Result'>;

const ResultScreen = ({ navigation, route }: Props) => {
  const result = route.params;

  return (
    <View style={styles.container}>
      <MemorizationHeader
        title="النتيجة"
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.scoreBox, styles.resultHeroCard]}>
          <MaterialCommunityIcons
            name={
              result.score === result.total ? 'trophy-outline' : 'lightbulb-outline'
            }
            size={56}
            color={result.score === result.total ? GOLD : NAVY}
          />
          <Text style={styles.scoreText}>
            {result.score} / {result.total}
          </Text>
          <Text style={styles.scoreLabel}>
            {result.score === result.total
              ? 'ممتاز! حفظت النص بشكل كامل!'
              : result.score >= result.total * 0.7
                ? 'جيد جداً، حاول مرة أخرى لتثبيت الحفظ.'
              : 'راجع النص وحاول مرة أخرى.'}
          </Text>
          <View style={styles.resultToneBadge}>
            <Text style={styles.resultToneBadgeText}>
              {result.score === result.total
                ? 'إتقان كامل'
                : result.score >= result.total * 0.7
                  ? 'مستوى جيد جدًا'
                  : 'يحتاج مراجعة'}
            </Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.refText}>
            {result.bookLabel} - {result.chapterLabel}
          </Text>
          <Text style={styles.instructionText}>
            الكلمات الصحيحة تظهر بوضوح، والخطأ يظهر مع الإجابة الأصلية.
          </Text>
        </View>

        <View style={styles.verseBox}>
          <View style={styles.verseBoxHeader}>
            <Text style={styles.verseBoxTitle}>مراجعة الإجابات</Text>
            <MaterialCommunityIcons name="check-decagram-outline" size={18} color="#C9A84C" />
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
                      : `${slot.userInput || '؟'} ← ${slot.word}`}
                  </Text>
                </View>
              ) : (
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
          <Text style={styles.primaryBtnText}>حاول مرة أخرى</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.ghostBtn}
          onPress={() => navigation.navigate('Pick')}
        >
          <Text style={styles.ghostBtnText}>اختر مرجعًا آخر</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

export default ResultScreen;
