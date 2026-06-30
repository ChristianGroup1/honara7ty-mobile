import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { DevotionCalendarStyles } from './styles';

type Strings = any;

type Props = {
  styles: DevotionCalendarStyles;
  strings: Strings;
  selectedDateLabel: string;
  readingText: string;
  completed?: boolean | null;
  canRecordSelectedDate: boolean;
  saving?: boolean;
  onRecord: () => void;
};

const DevotionCalendarSelectedDayCard = ({
  styles,
  strings,
  selectedDateLabel,
  readingText,
  completed,
  canRecordSelectedDate,
  saving = false,
  onRecord,
}: Props) => (
  <View style={styles.selectedDayCard}>
    <View style={styles.selectedDayHeader}>
      <View>
        <Text style={styles.selectedDayTitle}>{strings.selectedDayTitle}</Text>
        <Text style={styles.selectedDayDate}>{selectedDateLabel}</Text>
      </View>
      <View
        style={[
          styles.selectedDayStatus,
          completed ? styles.selectedDayStatusDone : styles.selectedDayStatusPending,
        ]}
      >
        <Text
          style={[
            styles.selectedDayStatusText,
            completed
              ? styles.selectedDayStatusTextDone
              : styles.selectedDayStatusTextPending,
          ]}
        >
          {completed == null
            ? strings.noRecordStatus
            : completed
              ? strings.completed
              : strings.notCompleted}
        </Text>
      </View>
    </View>
    <Text style={styles.selectedDayReading}>{readingText}</Text>
    {canRecordSelectedDate ? (
      <TouchableOpacity
        style={styles.recordDevotionButton}
        onPress={onRecord}
        disabled={saving}
      >
        <Text style={styles.recordDevotionButtonText}>
          {strings.recordDevotion}
        </Text>
      </TouchableOpacity>
    ) : null}
  </View>
);

export default DevotionCalendarSelectedDayCard;
