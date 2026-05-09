import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { DAILY_QUESTION } from './constants';
import { homeStyles as styles } from './styles';
import { getStrings } from '../../localization';

interface DailyQuestionCardProps {
  devotionAnswer: boolean | null;
  onAnswerNow: () => void;
  onEditAnswer: () => void;
}

const DailyQuestionCard = ({
  devotionAnswer,
  onAnswerNow,
  onEditAnswer,
}: DailyQuestionCardProps) => {
  const strings = getStrings().home;

  return (
    <View style={styles.questionCard}>
      <View style={styles.questionDecor} />
      <Text style={styles.questionText}>{DAILY_QUESTION}</Text>

      {devotionAnswer === null ? (
        <TouchableOpacity
          style={styles.answerBtn}
          activeOpacity={0.85}
          onPress={onAnswerNow}
        >
          <Text style={styles.answerBtnText}>{strings.answerNow}</Text>
        </TouchableOpacity>
      ) : devotionAnswer ? (
        <View style={styles.answeredBlock}>
          <View style={styles.answeredYesCard}>
            <MaterialCommunityIcons
              name="check-circle"
              size={22}
              color="#fff"
            />
            <Text style={styles.answeredYesText}>{strings.answeredYes}</Text>
          </View>
          <TouchableOpacity style={styles.editAnswerBtn} onPress={onEditAnswer}>
            <Text style={styles.editAnswerBtnText}>{strings.editAnswer}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.answeredBlock}>
          <View style={styles.answeredNoCard}>
            <MaterialCommunityIcons
              name="clock-alert-outline"
              size={22}
              color="#fff"
            />
            <Text style={styles.answeredNoText}>{strings.answeredNo}</Text>
          </View>
          <TouchableOpacity style={styles.editAnswerBtn} onPress={onEditAnswer}>
            <Text style={styles.editAnswerBtnText}>{strings.editAnswer}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export default React.memo(DailyQuestionCard);
