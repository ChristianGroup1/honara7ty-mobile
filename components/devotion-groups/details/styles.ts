import { StyleSheet } from 'react-native';
import { BG, GOLD, NAVY } from './constants';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  content: { padding: 16, paddingBottom: 36 },
  permissionCard: {
    backgroundColor: '#FFF8E5', borderRadius: 16, padding: 14, marginBottom: 12,
    flexDirection: 'row', alignItems: 'center', borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.32)',
  },
  permissionIcon: {
    width: 42, height: 42, borderRadius: 13, backgroundColor: '#FFF',
    alignItems: 'center', justifyContent: 'center',
  },
  permissionBody: { flex: 1, marginHorizontal: 10 },
  permissionTitle: { color: NAVY, fontSize: 14, fontWeight: '900', textAlign: 'left' },
  permissionText: {
    color: '#6D7480', fontSize: 12, lineHeight: 18, marginTop: 4, textAlign: 'left',
  },
  inviteCard: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 14, marginBottom: 12,
    gap: 12,
  },
  inviteContent: { gap: 8 },
  metaLabel: { color: '#7A818B', fontSize: 14, marginBottom: 2 },
  inviteCode: { color: NAVY, fontSize: 14, fontWeight: '900', flex: 1 },
  inviteValueRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    gap: 8,
  },
  inviteLinkLabel: {
    color: '#7A818B', fontSize: 14, marginTop: 8, marginBottom: 2,
  },
  inviteLinkPressable: { flex: 1, minWidth: 0 },
  inviteLinkText: {
    color: '#2563EB', fontSize: 14, lineHeight: 20, fontWeight: '800',
    textDecorationLine: 'underline', textAlign: 'left',
  },
  inviteLinkActionsRow: { flexDirection: 'row', gap: 8 },
  iconButton: {
    width: 42, height: 42, borderRadius: 12, backgroundColor: '#F3F6FA',
    alignItems: 'center', justifyContent: 'center',
  },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  summaryCard: {
    flex: 1, backgroundColor: '#FFF', borderRadius: 16, padding: 14,
    alignItems: 'center',
  },
  summaryNumber: { color: NAVY, fontSize: 28, fontWeight: '900' },
  summaryLabel: { color: '#7A818B', fontSize: 12, fontWeight: '700' },
  personalStatsCard: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 14, marginBottom: 14,
    borderWidth: 1, borderColor: 'rgba(10,17,36,0.06)',
  },
  personalStatsHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  personalStatsIcon: {
    width: 38, height: 38, borderRadius: 13, backgroundColor: '#FFF8E5',
    alignItems: 'center', justifyContent: 'center',
  },
  personalStatsTitle: {
    flex: 1, color: NAVY, fontSize: 15, fontWeight: '900',
    marginHorizontal: 10, textAlign: 'left',
  },
  personalStatsRow: { flexDirection: 'row', gap: 8 },
  personalStatItem: {
    flex: 1, backgroundColor: '#F6F8FC', borderRadius: 13, paddingVertical: 12,
    paddingHorizontal: 6, alignItems: 'center',
  },
  personalStatNumber: { color: NAVY, fontSize: 20, fontWeight: '900' },
  personalStatLabel: {
    color: '#7A818B', fontSize: 11, fontWeight: '800', marginTop: 4,
    textAlign: 'center',
  },
  todayDevotionCard: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 14, marginBottom: 14,
    borderWidth: 1, borderColor: 'rgba(10,17,36,0.06)',
  },
  todayDevotionHeader: { flexDirection: 'row', alignItems: 'center' },
  todayDevotionIcon: {
    width: 42, height: 42, borderRadius: 14, backgroundColor: '#FFF8E5',
    alignItems: 'center', justifyContent: 'center',
  },
  todayDevotionBody: { flex: 1, marginHorizontal: 10 },
  todayDevotionTitle: {
    color: NAVY, fontSize: 15, fontWeight: '900', textAlign: 'left',
  },
  todayDevotionText: {
    color: '#5F6874', fontSize: 13, lineHeight: 20, marginTop: 4,
    textAlign: 'left',
  },
  todayDevotionButton: {
    minHeight: 42, borderRadius: 12, backgroundColor: '#FFF4D6',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10,
    marginTop: 12,
  },
  todayDevotionButtonText: {
    color: NAVY, fontSize: 13, fontWeight: '900', lineHeight: 18,
    textAlign: 'center',
  },
  sharedReadingCard: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 14, marginBottom: 14,
    borderWidth: 1, borderColor: 'rgba(10,17,36,0.06)',
  },
  sharedReadingHeader: { flexDirection: 'row', alignItems: 'center' },
  sharedReadingIcon: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: '#FFF8E5',
    alignItems: 'center', justifyContent: 'center',
  },
  sharedReadingBody: { flex: 1, marginHorizontal: 10 },
  sharedReadingTitle: { color: NAVY, fontSize: 15, fontWeight: '900', textAlign: 'left' },
  sharedReadingText: {
    color: '#5F6874', fontSize: 13, lineHeight: 20, marginTop: 4, textAlign: 'left',
  },
  sharedTargetText: {
    color: '#7A818B', fontSize: 12, lineHeight: 18, marginTop: 4, textAlign: 'left',
  },
  sharedReadingButton: {
    minHeight: 40, borderRadius: 12, marginTop: 12, backgroundColor: '#FFF4D6',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingHorizontal: 12,
  },
  sharedReadingButtonText: {
    flexShrink: 1, color: NAVY, fontSize: 13, lineHeight: 18,
    fontWeight: '900', textAlign: 'center',
  },
  pendingReminderButton: {
    minHeight: 46, borderRadius: 14, backgroundColor: NAVY, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 14,
    width: '100%', paddingHorizontal: 14,
  },
  pendingReminderButtonText: {
    flexShrink: 1, color: '#FFF', fontSize: 14, fontWeight: '900',
    lineHeight: 20, textAlign: 'center',
  },
  leaveGroupButton: {
    minHeight: 46, borderRadius: 14, backgroundColor: 'rgba(255,59,48,0.10)',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginBottom: 14, width: '100%', paddingHorizontal: 14,
    borderWidth: 1, borderColor: 'rgba(255,59,48,0.16)',
  },
  leaveGroupButtonText: {
    flexShrink: 1, color: '#B42318', fontSize: 14, fontWeight: '900',
    lineHeight: 20, textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionTitle: {
    color: NAVY, fontSize: 17, fontWeight: '900', marginBottom: 8, textAlign: 'left',
  },
  sectionCaption: { color: '#7A818B', fontSize: 12, fontWeight: '700' },
  memberCard: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: 'rgba(10,17,36,0.06)',
  },
  memberTopRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 42, height: 42, borderRadius: 14, backgroundColor: '#EEF2F8',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: NAVY, fontSize: 18, fontWeight: '900' },
  memberBody: { flex: 1, marginHorizontal: 10 },
  memberName: { color: NAVY, fontSize: 15, fontWeight: '800', textAlign: 'left' },
  memberRole: { color: '#7A818B', fontSize: 12, marginTop: 3 },
  statusPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  statusPillDone: { backgroundColor: 'rgba(46,139,87,0.12)' },
  statusPillPending: { backgroundColor: 'rgba(217,123,41,0.12)' },
  statusPillText: { fontSize: 11, fontWeight: '800' },
  statusPillTextDone: { color: '#2E8B57' },
  statusPillTextPending: { color: '#B45B12' },
  readingText: {
    color: '#5F6874', fontSize: 13, lineHeight: 20, marginTop: 10, textAlign: 'left',
  },
  memberActionsRow: {
    flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: 'rgba(10,17,36,0.08)',
  },
  memberAdminButton: {
    flex: 1, minHeight: 38, borderRadius: 12, backgroundColor: '#FFF4D6',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingHorizontal: 10,
  },
  memberAdminButtonText: {
    flexShrink: 1, color: NAVY, fontSize: 12, fontWeight: '900',
    lineHeight: 17, textAlign: 'center',
  },
  memberRemoveButton: {
    flex: 1, minHeight: 38, borderRadius: 12, backgroundColor: 'rgba(255,59,48,0.10)',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingHorizontal: 10,
  },
  memberRemoveButtonText: {
    flexShrink: 1, color: '#B42318', fontSize: 12, fontWeight: '900',
    lineHeight: 17, textAlign: 'center',
  },
  emptyText: {
    color: '#7A818B', fontSize: 13, lineHeight: 20, textAlign: 'center',
    marginVertical: 12,
  },
  loadingBlock: { paddingVertical: 36, alignItems: 'center' },
  savingOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10,17,36,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end',
  },
  modalBackdrop: { flex: 1 },
  editorCard: {
    backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 16, paddingBottom: 20, maxHeight: '86%',
  },
  editorHandle: {
    alignSelf: 'center', width: 42, height: 4, borderRadius: 999,
    backgroundColor: '#D8DEE8', marginBottom: 14,
  },
  editorTitle: { color: NAVY, fontSize: 18, fontWeight: '900', textAlign: 'left' },
  editorSubtitle: {
    color: '#6F7782', fontSize: 13, lineHeight: 20, marginTop: 5,
    marginBottom: 12, textAlign: 'left',
  },
  editorScrollContent: { paddingBottom: 10 },
  fieldTitle: {
    color: NAVY, fontSize: 14, fontWeight: '900', marginTop: 12,
    marginBottom: 8, textAlign: 'left',
  },
  testamentTabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  testamentTab: {
    flex: 1, minHeight: 42, borderRadius: 12, backgroundColor: '#F4F6FA',
    alignItems: 'center', justifyContent: 'center',
  },
  testamentTabActive: { backgroundColor: NAVY },
  testamentTabText: { color: NAVY, fontSize: 13, fontWeight: '900' },
  testamentTabTextActive: { color: '#FFF' },
  bookPanel: {
    backgroundColor: '#F6F8FC', borderRadius: 14, padding: 12, borderWidth: 1,
    borderColor: 'rgba(10,17,36,0.06)',
  },
  bookPanelHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 10,
  },
  bookPanelTitle: { color: NAVY, fontSize: 13, fontWeight: '900' },
  bookPanelCount: { color: '#7A818B', fontSize: 12, fontWeight: '700' },
  choiceRow: { gap: 8, paddingVertical: 2 },
  choiceChip: {
    minHeight: 38, minWidth: 42, borderRadius: 12, paddingHorizontal: 13,
    backgroundColor: '#FFF', borderWidth: 1, borderColor: 'rgba(10,17,36,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  bookChoiceChip: { maxWidth: 180 },
  choiceChipSelected: { backgroundColor: NAVY, borderColor: NAVY },
  choiceChipText: { color: NAVY, fontSize: 13, fontWeight: '800' },
  bookChoiceChipText: { maxWidth: 150 },
  choiceChipTextSelected: { color: '#FFF' },
  rangeHint: {
    color: '#7A818B', fontSize: 12, lineHeight: 18, marginBottom: 8, textAlign: 'left',
  },
  selectAllButton: {
    alignSelf: 'flex-start', minHeight: 36, borderRadius: 12,
    backgroundColor: '#FFF4D6', flexDirection: 'row', alignItems: 'center',
    gap: 6, paddingHorizontal: 12, marginBottom: 8,
  },
  selectAllButtonText: { color: NAVY, fontSize: 13, fontWeight: '900' },
  targetOptionsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  targetOption: {
    minHeight: 38, borderRadius: 12, paddingHorizontal: 12, backgroundColor: '#F6F8FC',
    borderWidth: 1, borderColor: 'rgba(10,17,36,0.08)', alignItems: 'center',
    justifyContent: 'center',
  },
  targetOptionSelected: { backgroundColor: NAVY, borderColor: NAVY },
  targetOptionText: { color: NAVY, fontSize: 13, fontWeight: '800' },
  targetOptionTextSelected: { color: '#FFF' },
  targetInput: {
    backgroundColor: '#F6F8FC', borderRadius: 12, paddingHorizontal: 12,
    minHeight: 44, color: NAVY, marginTop: 8, marginBottom: 4, borderWidth: 1,
    borderColor: 'rgba(10,17,36,0.08)', fontSize: 14, fontWeight: '900',
  },
  modalActionsRow: {
    flexDirection: 'row', gap: 10, paddingTop: 12, borderTopWidth: 1,
    borderTopColor: 'rgba(10,17,36,0.08)',
  },
  closeBtn: {
    flex: 1, minHeight: 46, borderRadius: 13, backgroundColor: '#EEF2F8',
    alignItems: 'center', justifyContent: 'center',
  },
  closeBtnText: { color: NAVY, fontSize: 14, fontWeight: '900' },
  clearBtn: {
    flex: 1, minHeight: 46, borderRadius: 13, backgroundColor: 'rgba(255,59,48,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  clearBtnText: { color: '#B42318', fontSize: 14, fontWeight: '900' },
  saveBtn: {
    flex: 1.25, minHeight: 46, borderRadius: 13, backgroundColor: NAVY,
    alignItems: 'center', justifyContent: 'center',
  },
  saveBtnDisabled: { opacity: 0.45 },
  saveBtnText: { color: '#FFF', fontSize: 14, fontWeight: '900' },
});

export { BG, GOLD, NAVY };
