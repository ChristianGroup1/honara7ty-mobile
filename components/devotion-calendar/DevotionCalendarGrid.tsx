import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { AppTheme } from '../../lib/nightMode';
import { palette } from '../shared/designTokens';
import { DevotionCalendarStyles } from './styles';
import { CalendarCell } from './types';
import { getMonthLabel } from './utils';

type Strings = any;

type Props = {
  styles: DevotionCalendarStyles;
  colors: AppTheme['colors'];
  strings: Strings;
  visibleMonth: Date;
  monthCells: CalendarCell[];
  selectedDate: string;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onPickDay: (isoDate: string) => void;
};

const DevotionCalendarGrid = ({
  styles,
  colors,
  strings,
  visibleMonth,
  monthCells,
  selectedDate,
  onPrevMonth,
  onNextMonth,
  onPickDay,
}: Props) => {
  const rows: CalendarCell[][] = [];
  for (let i = 0; i < monthCells.length; i += 7) {
    rows.push(monthCells.slice(i, i + 7));
  }
  const missedIconColor =
    colors.background === palette.bg ? '#B45B12' : '#F0A060';
  const isLight = colors.background === palette.bg;
  const completedCheckColor = '#FFFFFF';
  const legendCompletedCheckColor = isLight ? '#FFFFFF' : '#5FD492';

  return (
    <View style={styles.calendarCard}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>{strings.sectionTitle}</Text>
          <Text style={styles.sectionCaption}>{strings.sectionCaption}</Text>
        </View>
        <View style={styles.sectionIconWrap}>
          <MaterialCommunityIcons
            name="calendar-blank-outline"
            size={20}
            color={colors.accent}
          />
        </View>
      </View>

      <View style={styles.monthHeader}>
        <TouchableOpacity style={styles.monthNavBtn} onPress={onNextMonth}>
          <MaterialCommunityIcons
            name="chevron-right"
            size={22}
            color={colors.text}
          />
        </TouchableOpacity>

        <Text style={styles.monthTitle}>{getMonthLabel(visibleMonth)}</Text>

        <TouchableOpacity style={styles.monthNavBtn} onPress={onPrevMonth}>
          <MaterialCommunityIcons
            name="chevron-left"
            size={22}
            color={colors.text}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, styles.legendSwatchCompleted]}>
            <MaterialCommunityIcons
              name="check-bold"
              size={9}
              color={legendCompletedCheckColor}
            />
          </View>
          <Text style={styles.legendText}>{strings.completed}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, styles.legendSwatchMissed]} />
          <Text style={styles.legendText}>{strings.notCompleted}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, styles.legendSwatchToday]} />
          <Text style={styles.legendText}>{strings.today}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, styles.legendSwatchDefault]} />
          <Text style={styles.legendText}>{strings.remainingDays}</Text>
        </View>
      </View>

      <View style={styles.weekRow}>
        {strings.weekDays.map((day: string) => (
          <Text key={day} style={styles.weekDay}>
            {day}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {rows.map((row, index) => (
          <View key={`row-${index}`} style={styles.gridRow}>
            {row.map(cell => (
              <TouchableOpacity
                key={cell.key}
                activeOpacity={0.8}
                disabled={cell.empty}
                onPress={() => cell.isoDate && onPickDay(cell.isoDate)}
                style={[
                  styles.dayCell,
                  cell.empty && styles.dayCellEmpty,
                  !cell.empty &&
                    cell.missed &&
                    !cell.completed &&
                    styles.dayCellMissed,
                  !cell.empty &&
                    cell.today &&
                    !cell.completed &&
                    styles.dayCellToday,
                  !cell.empty && cell.completed && styles.dayCellCompleted,
                  cell.isoDate === selectedDate &&
                    cell.completed &&
                    styles.dayCellSelectedCompleted,
                  cell.isoDate === selectedDate &&
                    !cell.completed &&
                    styles.dayCellSelected,
                ]}
              >
                {!cell.empty ? (
                  <>
                    <Text
                      style={[
                        styles.dayText,
                        cell.completed && styles.dayTextCompleted,
                        cell.missed && styles.dayTextMissed,
                        cell.today && styles.dayTextToday,
                      ]}
                    >
                      {cell.dayNumber}
                    </Text>
                    {cell.completed ? (
                      <View style={styles.dayMetaWrap}>
                        <View style={styles.completedMark}>
                          <MaterialCommunityIcons
                            name="check-bold"
                            size={isLight ? 11 : 10}
                            color={completedCheckColor}
                          />
                        </View>
                      </View>
                    ) : cell.missed ? (
                      <View style={styles.dayMetaWrap}>
                        <MaterialCommunityIcons
                          name="close"
                          size={13}
                          color={missedIconColor}
                        />
                      </View>
                    ) : cell.today ? (
                      <View style={styles.dayMetaWrap}>
                        <MaterialCommunityIcons
                          name="circle-small"
                          size={16}
                          color={colors.accent}
                        />
                      </View>
                    ) : null}
                  </>
                ) : null}
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
};

export default DevotionCalendarGrid;
