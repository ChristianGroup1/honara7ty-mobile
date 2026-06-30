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
import {
  createThemedMemorizationStyles,
  memorizationStyles as styles,
} from './styles';
import { MemorizationStackParamList, WordSlot } from './types';
import {
  buildFullTextResultSlots,
  buildSlots,
  normalizeArabicAnswer,
} from './utils';
import { getStrings } from '../../localization';
import { useNightMode } from '../../lib/nightMode';

type Props = StackScreenProps<MemorizationStackParamList, 'Recite'>;

interface WordInputProps {
  index: number;
  slot: WordSlot;
  hasNextInput: boolean;
  onFocus: (index: number) => void;
  onChangeText: (index: number, value: string) => void;
  onSubmitEditing: (index: number) => void;
  inputRef: (ref: TextInput | null) => void;
  placeholder: string;
  themedStyles: ReturnType<typeof createThemedMemorizationStyles>;
  placeholderTextColor: string;
}

const WordInput = React.memo(
  ({
    index,
    slot,
    hasNextInput,
    onFocus,
    onChangeText,
    onSubmitEditing,
    inputRef,
    placeholder,
    themedStyles,
    placeholderTextColor,
  }: WordInputProps) => {
    return (
      <TextInput
        ref={inputRef}
        style={[styles.blankInput, themedStyles.input]}
        value={slot.userInput}
        onFocus={() => onFocus(index)}
        onChangeText={val => onChangeText(index, val)}
        placeholder={placeholder}
        placeholderTextColor={placeholderTextColor}
        textAlign="center"
        textAlignVertical="center"
        returnKeyType="done"
        blurOnSubmit={!hasNextInput}
        onSubmitEditing={() => onSubmitEditing(index)}
      />
    );
  },
);

const ReciteScreen = ({ navigation, route }: Props) => {
  const strings = getStrings().bibleMemorization.recite;
  const { colors } = useNightMode();
  const themedStyles = React.useMemo(
    () => createThemedMemorizationStyles(colors),
    [colors],
  );
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

  const focusNextInput = useCallback(
    (index: number) => {
      const nextIndex = slots.findIndex(
        (slot, slotIndex) => slotIndex > index && slot.hidden,
      );

      if (nextIndex === -1) {
        inputRefs.current[index]?.blur();
        return;
      }

      requestAnimationFrame(() => {
        inputRefs.current[nextIndex]?.focus();
      });
    },
    [slots],
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
    <View style={[styles.container, themedStyles.container]}>
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
          <View style={[styles.infoCard, themedStyles.cardMuted]}>
            <Text style={styles.refText}>
              {selection.bookLabel} - {selection.chapterLabel}
            </Text>
            <Text style={[styles.instructionText, themedStyles.mutedText]}>{strings.instruction}</Text>
          </View>

          <View style={styles.statusPillsRow}>
            <View style={[styles.statusPill, themedStyles.card]}>
              <MaterialCommunityIcons
                name="circle-slice-3"
                size={16}
                color={colors.text}
              />
              <Text style={[styles.statusPillText, themedStyles.primaryText]}>
                {selection.difficulty === 'easy'
                  ? getStrings().bibleMemorization.difficultyLevels.easy
                  : selection.difficulty === 'medium'
                  ? getStrings().bibleMemorization.difficultyLevels.medium
                  : selection.difficulty === 'hard'
                  ? getStrings().bibleMemorization.difficultyLevels.hard
                  : getStrings().bibleMemorization.difficultyLevels.fullText}
              </Text>
            </View>
            <View style={[styles.statusPill, themedStyles.card]}>
              <MaterialCommunityIcons
                name="form-textbox"
                size={16}
                color={colors.text}
              />
              <Text style={[styles.statusPillText, themedStyles.primaryText]}>
                {isFullTextMode
                  ? strings.fullTextWords(slots.length)
                  : strings.blanks(slots.filter(slot => slot.hidden).length)}
              </Text>
            </View>
          </View>

          {isFullTextMode ? (
            <View style={[styles.referenceVerseBox, themedStyles.referenceVerseBox]}>
              <View style={[styles.referenceVerseHeader, themedStyles.dividerBorder]}>
                <Text style={[styles.verseBoxTitle, themedStyles.primaryText]}>
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
                    themedStyles.primaryText,
                    isReferenceBlurred && styles.revealedVerseTextBlurred,
                  ]}
                >
                  {selection.verseOriginal}
                </Text>
                {isReferenceBlurred ? (
                  <View pointerEvents="none" style={[styles.verseBlurOverlay, themedStyles.blurOverlay]} />
                ) : null}
              </View>
            </View>
          ) : null}

          <View style={[styles.verseBox, themedStyles.card]}>
            <View style={[styles.verseBoxHeader, themedStyles.dividerBorder]}>
              <Text style={[styles.verseBoxTitle, themedStyles.primaryText]}>{strings.verseTextTitle}</Text>
              <MaterialCommunityIcons
                name={isFullTextMode ? 'form-textbox' : 'feather'}
                size={18}
                color="#78A1BD"
              />
            </View>
            {isFullTextMode ? (
              <>
                <Text style={[styles.instructionText, themedStyles.mutedText]}>
                  {strings.fullTextInstruction}
                </Text>
                <TextInput
                  style={[styles.fullVerseInput, themedStyles.input]}
                  multiline
                  textAlignVertical="top"
                  value={fullVerseAnswer}
                  textAlign="right"
                  onChangeText={setFullVerseAnswer}
                  placeholder={strings.fullTextPlaceholder}
                  placeholderTextColor={colors.mutedText}
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
                      hasNextInput={slots.some(
                        (candidate, candidateIndex) =>
                          candidateIndex > i && candidate.hidden,
                      )}
                      onFocus={scrollToFocusedInput}
                      onChangeText={handleInputChange}
                      onSubmitEditing={focusNextInput}
                      inputRef={setInputRef(i)}
                      placeholder={strings.blankPlaceholder}
                      themedStyles={themedStyles}
                      placeholderTextColor={colors.mutedText}
                    />
                  ) : (
                    <Text key={i} style={[styles.wordText, themedStyles.primaryText]}>
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
            <Text style={[styles.ghostBtnText, themedStyles.mutedText]}>
              {strings.chooseAnotherReference}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default ReciteScreen;
