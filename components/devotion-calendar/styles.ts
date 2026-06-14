import { StyleSheet } from 'react-native';
import { AppTheme } from '../../lib/nightMode';
import { palette } from '../shared/designTokens';
import {
  heroBadgeBase,
  heroBadgeTextBase,
  heroCardBase,
  heroGlowBase,
  heroIconWrapBase,
  heroTextBase,
  heroTitleBase,
  heroTopRowBase,
  heroEyebrowBase,
} from '../shared/heroStyles';

export const createDevotionCalendarStyles = (colors: AppTheme['colors']) => {
  const isLight = colors.background === palette.bg;
  const accentFaint = `${colors.accent}1F`;
  const missedSoft = isLight ? '#FFF0E6' : 'rgba(217,123,41,0.16)';
  const missedBorder = isLight ? 'rgba(217,123,41,0.28)' : 'rgba(217,123,41,0.38)';
  const successSoft = isLight ? '#EAF6EF' : 'rgba(45,156,90,0.22)';
  const successBorder = isLight
    ? 'rgba(45,156,90,0.28)'
    : 'rgba(45,156,90,0.48)';
  const successText = isLight ? palette.success : '#5FD492';
  const missedText = isLight ? '#B45B12' : '#F0A060';
  const completedBadgeBg = palette.success;

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    topInset: { backgroundColor: colors.header },
    header: {
      backgroundColor: colors.header,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 18,
    },
    backBtn: { padding: 4 },
    headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '700' },
    headerSpacer: { width: 32 },
    loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    loadingWrapMuted: { backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 36 },
    heroCard: {
      ...heroCardBase,
      backgroundColor: colors.header,
      shadowColor: colors.shadow,
      marginBottom: 14,
    },
    heroGlow: {
      ...heroGlowBase,
    },
    heroTopRow: {
      ...heroTopRowBase,
      marginBottom: 14,
    },
    heroIconWrap: {
      ...heroIconWrapBase,
    },
    heroBadge: {
      ...heroBadgeBase,
    },
    heroBadgeText: {
      ...heroBadgeTextBase,
    },
    heroLabel: {
      ...heroEyebrowBase,
    },
    heroTitle: {
      ...heroTitleBase,
    },
    heroText: {
      ...heroTextBase,
    },
    heroHintRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 14,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: 'rgba(255,255,255,0.08)',
    },
    heroHintText: {
      flex: 1,
      color: 'rgba(255,255,255,0.84)',
      fontSize: 12,
      lineHeight: 18,
    },
    statsRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 14,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 18,
      paddingVertical: 16,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 8,
    },
    statIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },
    statIconWrapPrimary: {
      backgroundColor: colors.header,
    },
    statIconWrapGold: {
      backgroundColor: colors.accent,
    },
    statIconWrapSoft: {
      backgroundColor: colors.cardMuted,
    },
    statNumber: {
      color: colors.text,
      fontSize: 26,
      fontWeight: '800',
      marginBottom: 4,
    },
    statLabel: {
      color: colors.mutedText,
      fontSize: 12,
      fontWeight: '600',
      textAlign: 'center',
    },
    calendarCard: {
      backgroundColor: colors.card,
      borderRadius: 24,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.shadow,
      shadowOpacity: 0.08,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
      elevation: 2,
    },
    selectedDayCard: {
      backgroundColor: colors.card,
      borderRadius: 18,
      padding: 14,
      marginTop: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    selectedDayHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 10,
    },
    selectedDayTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '800',
      textAlign: 'left',
    },
    selectedDayDate: {
      color: colors.mutedText,
      fontSize: 12,
      marginTop: 4,
      textAlign: 'left',
    },
    selectedDayStatus: {
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
      backgroundColor: colors.cardMuted,
    },
    selectedDayStatusDone: { backgroundColor: successSoft },
    selectedDayStatusPending: { backgroundColor: missedSoft },
    selectedDayStatusText: {
      color: colors.mutedText,
      fontSize: 11,
      fontWeight: '800',
    },
    selectedDayStatusTextDone: { color: successText },
    selectedDayStatusTextPending: { color: missedText },
    selectedDayReading: {
      color: colors.mutedText,
      fontSize: 13,
      lineHeight: 20,
      marginTop: 12,
      textAlign: 'left',
    },
    recordDevotionButton: {
      minHeight: 42,
      borderRadius: 12,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 12,
      paddingHorizontal: 14,
    },
    recordDevotionButtonText: {
      color: '#FFF',
      fontSize: 14,
      fontWeight: '800',
      textAlign: 'center',
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '800',
      marginBottom: 4,
    },
    sectionCaption: {
      color: colors.mutedText,
      fontSize: 13,
    },
    sectionIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 14,
      backgroundColor: colors.cardMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    monthHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
      backgroundColor: colors.cardMuted,
      borderRadius: 18,
      paddingHorizontal: 10,
      paddingVertical: 10,
    },
    monthNavBtn: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    monthTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '800',
    },
    legendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
      paddingHorizontal: 2,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    legendSwatch: {
      width: 14,
      height: 14,
      borderRadius: 4,
      alignItems: 'center',
      justifyContent: 'center',
    },
    legendSwatchCompleted: {
      backgroundColor: isLight ? completedBadgeBg : successSoft,
      borderWidth: 1,
      borderColor: isLight ? completedBadgeBg : successBorder,
    },
    legendSwatchToday: {
      backgroundColor: accentFaint,
      borderWidth: 1.5,
      borderColor: colors.accent,
    },
    legendSwatchMissed: {
      backgroundColor: missedSoft,
      borderWidth: 1,
      borderColor: missedBorder,
    },
    legendSwatchDefault: {
      backgroundColor: colors.cardMuted,
      borderWidth: 1,
      borderColor: colors.border,
    },
    legendText: {
      color: colors.mutedText,
      fontSize: 12,
      fontWeight: '600',
    },
    weekRow: {
      flexDirection: 'row',
      marginBottom: 10,
    },
    weekDay: {
      flex: 1,
      textAlign: 'center',
      color: colors.mutedText,
      fontSize: 12,
      fontWeight: '700',
    },
    grid: {
      gap: 9,
    },
    gridRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    dayCell: {
      width: '13.2%',
      minHeight: 54,
      borderRadius: 12,
      backgroundColor: colors.cardMuted,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 6,
      paddingHorizontal: 2,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isLight ? 0.04 : 0.06,
      shadowRadius: 6,
      elevation: 1,
    },
    dayCellCompleted: {
      backgroundColor: successSoft,
      borderColor: successBorder,
      borderWidth: 1,
    },
    dayCellMissed: {
      backgroundColor: missedSoft,
      borderColor: missedBorder,
      borderWidth: 1,
    },
    dayCellToday: {
      backgroundColor: isLight ? '#F0F6FF' : accentFaint,
      borderColor: colors.accent,
      borderWidth: 1.5,
    },
    dayCellSelected: {
      borderColor: colors.accent,
      borderWidth: 2,
      transform: [{ translateY: -1 }],
      shadowColor: colors.accent,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isLight ? 0.14 : 0.22,
      shadowRadius: 8,
      elevation: 2,
    },
    dayCellSelectedCompleted: {
      borderColor: palette.success,
      borderWidth: 2,
      shadowColor: palette.success,
      shadowOpacity: isLight ? 0.12 : 0.18,
    },
    dayCellEmpty: {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      shadowOpacity: 0,
      elevation: 0,
    },
    dayText: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '800',
    },
    dayTextCompleted: {
      color: isLight ? colors.text : successText,
    },
    dayTextMissed: {
      color: missedText,
    },
    dayTextToday: {
      fontWeight: '800',
    },
    dayMetaWrap: {
      minHeight: 12,
      marginTop: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    completedMark: {
      width: isLight ? 17 : 16,
      height: isLight ? 17 : 16,
      borderRadius: isLight ? 9 : 8,
      backgroundColor: completedBadgeBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'flex-end',
    },
    modalBackdrop: {
      flex: 1,
    },
    editorCard: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 16,
      paddingBottom: 20,
      maxHeight: '86%',
    },
    editorHandle: {
      alignSelf: 'center',
      width: 44,
      height: 5,
      borderRadius: 999,
      backgroundColor: colors.border,
      marginBottom: 14,
    },
    editorTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '800',
      marginBottom: 4,
    },
    editorSubtitle: {
      color: colors.mutedText,
      fontSize: 13,
      marginBottom: 8,
    },
    selectedDateText: {
      color: colors.text,
      fontWeight: '700',
      marginBottom: 10,
    },
    fieldTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
      marginBottom: 8,
      marginTop: 8,
    },
    rangeHint: {
      color: colors.mutedText,
      fontSize: 12,
      lineHeight: 18,
      marginTop: -2,
      marginBottom: 8,
      textAlign: 'left',
    },
    binaryRow: {
      flexDirection: 'row',
      gap: 8,
    },
    binaryBtn: {
      flex: 1,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.cardMuted,
      paddingVertical: 12,
      alignItems: 'center',
    },
    binaryBtnSelected: {
      backgroundColor: colors.header,
      borderColor: colors.header,
    },
    binaryText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
    },
    binaryTextSelected: {
      color: '#FFF',
    },
    editorScrollContent: {
      paddingBottom: 8,
    },
    multiReadingHint: {
      color: colors.mutedText,
      fontSize: 12,
      lineHeight: 18,
      marginTop: 12,
      marginBottom: 8,
      textAlign: 'left',
    },
    readingEntriesBox: {
      gap: 8,
      marginTop: 10,
      marginBottom: 10,
    },
    readingEntryRow: {
      backgroundColor: colors.cardMuted,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    readingEntryText: {
      flex: 1,
      color: colors.text,
      fontSize: 13,
      fontWeight: '800',
      lineHeight: 18,
      textAlign: 'left',
    },
    readingEntryRemove: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: 'rgba(255,59,48,0.14)',
    },
    readingEntryRemoveText: {
      color: palette.danger,
      fontSize: 11,
      fontWeight: '900',
    },
    addReadingEntryBtn: {
      minHeight: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 10,
      backgroundColor: colors.accent,
    },
    addReadingEntryBtnDisabled: {
      opacity: 0.55,
    },
    addReadingEntryText: {
      color: '#FFF',
      fontSize: 13,
      fontWeight: '900',
    },
    testamentTabs: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 12,
      backgroundColor: colors.cardMuted,
      borderRadius: 18,
      padding: 6,
    },
    testamentTab: {
      flex: 1,
      borderRadius: 14,
      paddingVertical: 10,
      paddingHorizontal: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
    },
    testamentTabActive: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 1,
    },
    testamentTabIcon: {
      marginBottom: 4,
    },
    testamentTabText: {
      color: colors.mutedText,
      fontSize: 13,
      fontWeight: '700',
    },
    testamentTabTextActive: {
      color: colors.text,
    },
    bookPanel: {
      backgroundColor: colors.cardMuted,
      borderRadius: 18,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    bookPanelHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    bookPanelTitle: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '800',
    },
    bookPanelCount: {
      color: colors.mutedText,
      fontSize: 12,
      fontWeight: '700',
    },
    chipWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    horizontalChipWrap: {
      flexDirection: 'row',
      gap: 8,
      paddingRight: 2,
    },
    bookListScroll: {
      maxHeight: 60,
    },
    bookListContent: {
      flexDirection: 'row',
      gap: 8,
      paddingRight: 2,
    },
    choiceChip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 8,
      backgroundColor: colors.card,
    },
    bookChoiceChip: {
      minHeight: 44,
      justifyContent: 'center',
      borderRadius: 14,
    },
    bookChoiceChipText: {
      textAlign: 'center',
    },
    choiceChipSelected: {
      borderColor: colors.header,
      backgroundColor: colors.header,
    },
    choiceChipText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '600',
    },
    choiceChipTextSelected: {
      color: '#FFF',
    },
    modalActionsRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 16,
    },
    closeBtn: {
      flex: 1,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
    },
    closeBtnText: {
      color: colors.accent,
      fontSize: 15,
      fontWeight: '700',
    },
    saveBtn: {
      backgroundColor: colors.accent,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      flex: 1,
    },
    saveBtnDisabled: {
      opacity: 0.6,
    },
    saveBtnText: {
      color: '#FFF',
      fontSize: 15,
      fontWeight: '800',
    },
  });
};

export type DevotionCalendarStyles = ReturnType<
  typeof createDevotionCalendarStyles
>;
