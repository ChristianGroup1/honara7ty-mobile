import React, { useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import MemorizationHeader from './MemorizationHeader';
import { memorizationStyles as styles } from './styles';
import { MemorizationStackParamList, WordSlot } from './types';
import { buildSlots, normalizeArabicAnswer } from './utils';

type Props = StackScreenProps<MemorizationStackParamList, 'Recite'>;

const ReciteScreen = ({ navigation, route }: Props) => {
  const selection = route.params;
  const [slots, setSlots] = useState<WordSlot[]>(
    buildSlots(selection.verseOriginal, selection.difficulty),
  );

  const checkAnswers = () => {
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

    navigation.navigate('Result', {
      ...selection,
      slots: updated,
      score: correct,
      total: updated.filter(slot => slot.hidden).length,
    });
  };

  return (
    <View style={styles.container}>
      <MemorizationHeader
        title="التسميع"
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.infoCard}>
          <Text style={styles.refText}>
            {selection.bookLabel} - {selection.chapterLabel}
          </Text>
          <Text style={styles.instructionText}>
            أكمل الكلمات المحجوبة في النص التالي:
          </Text>
        </View>

        <View style={styles.statusPillsRow}>
          <View style={styles.statusPill}>
            <MaterialCommunityIcons name="circle-slice-3" size={16} color="#0A1124" />
            <Text style={styles.statusPillText}>
              {selection.difficulty === 'easy'
                ? 'سهل'
                : selection.difficulty === 'medium'
                  ? 'متوسط'
                  : 'صعب'}
            </Text>
          </View>
          <View style={styles.statusPill}>
            <MaterialCommunityIcons name="form-textbox" size={16} color="#0A1124" />
            <Text style={styles.statusPillText}>
              {slots.filter(slot => slot.hidden).length} فراغ
            </Text>
          </View>
        </View>

        <View style={styles.verseBox}>
          <View style={styles.verseBoxHeader}>
            <Text style={styles.verseBoxTitle}>نص التسميع</Text>
            <MaterialCommunityIcons name="feather" size={18} color="#C9A84C" />
          </View>
          <View style={styles.wordsWrap}>
            {slots.map((slot, i) =>
              slot.hidden ? (
                <TextInput
                  key={i}
                  style={styles.blankInput}
                  value={slot.userInput}
                  onChangeText={val =>
                    setSlots(prev =>
                      prev.map((current, index) =>
                        index === i ? { ...current, userInput: val } : current,
                      ),
                    )
                  }
                  placeholder="___"
                  placeholderTextColor="#AAA"
                  textAlign="center"
                  textAlignVertical="center"
                />
              ) : (
                <Text key={i} style={styles.wordText}>
                  {slot.word}{' '}
                </Text>
              ),
            )}
          </View>
        </View>

        <TouchableOpacity style={styles.primaryBtn} onPress={checkAnswers}>
          <MaterialCommunityIcons name="check-bold" size={20} color="#FFF" />
          <Text style={styles.primaryBtnText}>عرض النتيجة</Text>
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

export default ReciteScreen;
