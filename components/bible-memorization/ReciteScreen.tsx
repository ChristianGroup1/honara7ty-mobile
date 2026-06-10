import React, { useCallback, useRef, useState } from 'react';
import {
  findNodeHandle,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import MemorizationHeader from './MemorizationHeader';
import { memorizationStyles as styles } from './styles';
import { MemorizationStackParamList, WordSlot } from './types';
import {
  buildFullTextResultSlots,
  buildSlots,
  normalizeArabicAnswer,
} from './utils';
import { getStrings } from '../../localization';

type Props = StackScreenProps<MemorizationStackParamList, 'Recite'>;

interface WordInputProps {
  index: number;
  slot: WordSlot;
  onFocus: (index: number) => void;
  onChangeText: (index: number, value: string) => void;
  inputRef: (ref: TextInput | null) => void;
  placeholder: string;
}

const WordInput = React.memo(
  ({
    index,
    slot,
    onFocus,
    onChangeText,
    inputRef,
    placeholder,
  }: WordInputProps) => {
    return (
      <TextInput
        ref={inputRef}
        style={styles.blankInput}
        value={slot.userInput}
        onFocus={() => onFocus(index)}
        onChangeText={val => onChangeText(index, val)}
        placeholder={placeholder}
        placeholderTextColor="#AAA"
        textAlign="center"
        textAlignVertical="center"
        returnKeyType="next"
      />
    );
  },
);

const ReciteScreen = ({ navigation, route }: Props) => {
  const strings = getStrings().bibleMemorization.recite;
  const selection = route.params;
  const scrollRef = useRef<ScrollView | null>(null);
  const inputRefs = useRef<Array<TextInput | null>>([]);
  const [fullVerseAnswer, setFullVerseAnswer] = useState('');
  const [startTime] = useState(Date.now());
  const [slots, setSlots] = useState<WordSlot[]>(
    buildSlots(selection.verseOriginal, selection.difficulty),
  );
  const [isReferenceBlurred, setIsReferenceBlurred] = useState(false);
  const isFullTextMode = selection.difficulty === 'fullText';

  const scrollToFocusedInput = useCallback((index: number) => {
    const target = inputRefs.current[index];
    const targetHandle = target ? findNodeHandle(target) : null;

    if (!targetHandle || !scrollRef.current) {
      return;
    }

    scrollRef.current.scrollResponderScrollNativeHandleToKeyboard(
      targetHandle,
      Platform.OS === 'android' ? 90 : 70,
      true,
    );
  }, []);

  const handleInputChange = useCallback((index: number, val: string) => {
    setSlots(prev =>
      prev.map((current, i) =>
        i === index ? { ...current, userInput: val } : current,
      ),
    );
  }, []);

  const setInputRef = useCallback(
    (index: number) => (ref: TextInput | null) => {
      inputRefs.current[index] = ref;
    },
    [],
  );

  const checkAnswers = () => {
    if (isFullTextMode) {
      const updated = buildFullTextResultSlots(
        selection.verseOriginal,
        fullVerseAnswer,
      );
      const correct = updated.filter(slot => slot.correct).length;

      const duration = Math.floor((Date.now() - startTime) / 1000);
      navigation.navigate('Result', {
        ...selection,
        slots: updated,
        score: correct,
        total: updated.length,
        timeSeconds: duration,
      });
      return;
    }

    let correct = 0;
    const updated = slots.map(slot => {
      if (!slot.hidden) {
        return slot;
      }

      const isOk =
        normalizeArabicAnswer(slot.userInput) ===
        normalizeArabicAnswer(slot.word);

      if (isOk) {
        correct++;
      }

      return { ...slot, correct: isOk };
    });

    const duration = Math.floor((Date.now() - startTime) / 1000);
    navigation.navigate('Result', {
      ...selection,
      slots: updated,
      score: correct,
      total: updated.filter(slot => slot.hidden).length,
      timeSeconds: duration,
    });
  };

  return (
    <View style={styles.container}>
      <MemorizationHeader
        title={strings.title}
        onBack={() => navigation.goBack()}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.infoCard}>
            <Text style={styles.refText}>
              {selection.bookLabel} - {selection.chapterLabel}
            </Text>
            <Text style={styles.instructionText}>{strings.instruction}</Text>
          </View>

          <View style={styles.statusPillsRow}>
            <View style={styles.statusPill}>
              <MaterialCommunityIcons
                name="circle-slice-3"
                size={16}
                color="#0A1124"
              />
              <Text style={styles.statusPillText}>
                {selection.difficulty === 'easy'
                  ? getStrings().bibleMemorization.difficultyLevels.easy
                  : selection.difficulty === 'medium'
                  ? getStrings().bibleMemorization.difficultyLevels.medium
                  : selection.difficulty === 'hard'
                  ? getStrings().bibleMemorization.difficultyLevels.hard
                  : getStrings().bibleMemorization.difficultyLevels.fullText}
              </Text>
            </View>
            <View style={styles.statusPill}>
              <MaterialCommunityIcons
                name="form-textbox"
                size={16}
                color="#0A1124"
              />
              <Text style={styles.statusPillText}>
                {isFullTextMode
                  ? strings.fullTextWords(slots.length)
                  : strings.blanks(slots.filter(slot => slot.hidden).length)}
              </Text>
            </View>
          </View>

          {isFullTextMode ? (
            <View style={styles.referenceVerseBox}>
              <View style={styles.referenceVerseHeader}>
                <Text style={styles.verseBoxTitle}>
                  {strings.referenceTextTitle}
                </Text>
                <TouchableOpacity
                  style={styles.revealVerseButton}
                  activeOpacity={0.82}
                  accessibilityRole="button"
                  accessibilityLabel={
                    isReferenceBlurred
                      ? strings.showReferenceText
                      : strings.hideReferenceText
                  }
                  onPress={() => setIsReferenceBlurred(current => !current)}
                >
                  <MaterialCommunityIcons
                    name={
                      isReferenceBlurred ? 'eye-off-outline' : 'eye-outline'
                    }
                    size={20}
                    color="#FFF"
                  />
                </TouchableOpacity>
              </View>
              <View style={styles.revealedVerseTextWrap}>
                <Text
                  style={[
                    styles.revealedVerseText,
                    isReferenceBlurred && styles.revealedVerseTextBlurred,
                  ]}
                >
                  {selection.verseOriginal}
                </Text>
                {isReferenceBlurred ? (
                  <View pointerEvents="none" style={styles.verseBlurOverlay} />
                ) : null}
              </View>
            </View>
          ) : null}

          <View style={styles.verseBox}>
            <View style={styles.verseBoxHeader}>
              <Text style={styles.verseBoxTitle}>{strings.verseTextTitle}</Text>
              <MaterialCommunityIcons
                name={isFullTextMode ? 'form-textbox' : 'feather'}
                size={18}
                color="#78A1BD"
              />
            </View>
            {isFullTextMode ? (
              <>
                <Text style={styles.instructionText}>
                  {strings.fullTextInstruction}
                </Text>
                <TextInput
                  style={styles.fullVerseInput}
                  multiline
                  textAlignVertical="top"
                  value={fullVerseAnswer}
                  textAlign="right"
                  onChangeText={setFullVerseAnswer}
                  placeholder={strings.fullTextPlaceholder}
                  placeholderTextColor="#98A2B3"
                />
              </>
            ) : (
              <View style={styles.wordsWrap}>
                {slots.map((slot, i) =>
                  slot.hidden ? (
                    <WordInput
                      key={i}
                      index={i}
                      slot={slot}
                      onFocus={scrollToFocusedInput}
                      onChangeText={handleInputChange}
                      inputRef={setInputRef(i)}
                      placeholder={strings.blankPlaceholder}
                    />
                  ) : (
                    <Text key={i} style={styles.wordText}>
                      {slot.word}{' '}
                    </Text>
                  ),
                )}
              </View>
            )}
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={checkAnswers}>
            <MaterialCommunityIcons name="check-bold" size={20} color="#FFF" />
            <Text style={styles.primaryBtnText}>{strings.showResult}</Text>
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
      </KeyboardAvoidingView>
    </View>
  );
};

export default ReciteScreen;
