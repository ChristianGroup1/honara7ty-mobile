import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { DAILY_QUESTION } from './constants';
import { homeStyles as styles } from './styles';

interface DailyQuestionCardProps {
  devotionAnswer: boolean | null;
  onAnswerNow: () => void;
}

const DailyQuestionCard = ({
  devotionAnswer,
  onAnswerNow,
}: DailyQuestionCardProps) => {
  return (
    <View style={styles.questionCard}>
      <View style={styles.questionDecor} />
      <Text style={styles.questionCardLabel}>سؤال اليوم المتغير</Text>
      <Text style={styles.questionText}>{DAILY_QUESTION}</Text>

      {devotionAnswer === null ? (
        <TouchableOpacity
          style={styles.answerBtn}
          activeOpacity={0.85}
          onPress={onAnswerNow}
        >
          <Text style={styles.answerBtnText}>جاوب الآن</Text>
        </TouchableOpacity>
      ) : devotionAnswer ? (
        <View style={styles.answeredYesCard}>
          <MaterialCommunityIcons name="check-circle" size={22} color="#fff" />
          <Text style={styles.answeredYesText}>
            أجبت بنعم اليوم 🎉 بارك الله خلوتك!
          </Text>
        </View>
      ) : (
        <View style={styles.answeredNoCard}>
          <MaterialCommunityIcons
            name="clock-alert-outline"
            size={22}
            color="#fff"
          />
          <Text style={styles.answeredNoText}>
            لم تأخذ خلوتك بعد — لا يزال الوقت أمامك 💙
          </Text>
        </View>
      )}
    </View>
  );
};

export default DailyQuestionCard;
