import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Keyboard,
  ScrollView,
  Dimensions,
  Pressable,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import supabase from '../lib/supbase';
import CustomAlert, { AlertButton } from './CustomAlert';

const NAVY = '#0A1124';
const GOLD = '#C9A84C';
const BG = '#F6F7F9';
const CARD = '#FFFFFF';
const MUTED = '#8B8B8B';
const DANGER = '#FF3B30';
const PREVIEW_CHARS = 120;

interface PrayerNote {
  id: string;
  content: string;
  created_at: string;
  is_answered: boolean;
}

const PrayerNotesScreen: React.FC<any> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [notes, setNotes] = useState<PrayerNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editItem, setEditItem] = useState<PrayerNote | null>(null);
  const [text, setText] = useState('');
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [detailItem, setDetailItem] = useState<PrayerNote | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [alertConfig, setAlertConfig] = useState<any>({
    visible: false,
    title: '',
  });
  const [query, setQuery] = useState('');

  const showAlert = (
    title: string,
    message?: string,
    buttons?: AlertButton[],
    type: any = 'info',
  ) => setAlertConfig({ visible: true, title, message, buttons, type });
  const hideAlert = () =>
    setAlertConfig((p: any) => ({ ...p, visible: false }));

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) {
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('prayer_notes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (!error && data) setNotes(data as PrayerNote[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e: any) => {
      setKeyboardVisible(true);
      setKeyboardHeight(e.endCoordinates?.height || 0);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardVisible(false);
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const addQuick = async () => {
    const trimmed = newNote.trim();
    if (!trimmed) return;
    setSaving(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) {
      setSaving(false);
      return;
    }
    const { error } = await supabase
      .from('prayer_notes')
      .insert({ user_id: userId, content: trimmed, is_answered: false });
    if (error) showAlert('خطأ', error.message);
    else {
      setNewNote('');
      await fetchNotes();
    }
    setSaving(false);
  };

  const openEdit = (note?: PrayerNote) => {
    if (note) {
      setEditItem(note);
      setText(note.content);
    } else {
      setEditItem(null);
      setText('');
    }
    setShowEditModal(true);
  };

  const openDetail = (note: PrayerNote) => {
    setDetailItem(note);
    setShowDetailModal(true);
  };
  const closeDetail = () => {
    setShowDetailModal(false);
    setDetailItem(null);
  };

  const handleSave = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setSaving(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) {
      setSaving(false);
      return;
    }

    if (editItem) {
      const { error } = await supabase
        .from('prayer_notes')
        .update({ content: trimmed })
        .eq('id', editItem.id);
      if (error) showAlert('خطأ', error.message);
      else
        setNotes(prev =>
          prev.map(n =>
            n.id === editItem.id ? { ...n, content: trimmed } : n,
          ),
        );
    } else {
      const { error } = await supabase
        .from('prayer_notes')
        .insert({ user_id: userId, content: trimmed, is_answered: false });
      if (error) showAlert('خطأ', error.message);
      else await fetchNotes();
    }

    setSaving(false);
    setShowEditModal(false);
  };

  const toggleAnswered = async (note: PrayerNote) => {
    const { error } = await supabase
      .from('prayer_notes')
      .update({ is_answered: !note.is_answered })
      .eq('id', note.id);
    if (!error)
      setNotes(prev =>
        prev.map(n =>
          n.id === note.id ? { ...n, is_answered: !n.is_answered } : n,
        ),
      );
  };

  const deleteNote = (note: PrayerNote) => {
    showAlert(
      'حذف الملاحظة',
      'هل تريد حذف هذه الملاحظة؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('prayer_notes')
              .delete()
              .eq('id', note.id);
            if (!error) setNotes(prev => prev.filter(n => n.id !== note.id));
            else showAlert('خطأ', error.message);
          },
        },
      ],
      'warning',
    );
  };

  const filtered = notes.filter(n =>
    n.content.toLowerCase().includes(query.trim().toLowerCase()),
  );

  // ensure last list item not hidden by quick add or keyboard
  const listBottomPadding = keyboardVisible
    ? keyboardHeight + 130 // space above keyboard when open
    : insets.bottom
    ? insets.bottom + 90
    : 140; // when closed, leave room for quickAdd

  const renderItem = ({ item }: { item: PrayerNote }) => {
    const preview =
      item.content.length > PREVIEW_CHARS
        ? item.content.slice(0, PREVIEW_CHARS).trimEnd() + '…'
        : item.content;
    return (
      <View style={[styles.card, item.is_answered && styles.answeredCard]}>
        <View style={styles.cardLeft}>
          <TouchableOpacity
            onPress={() => toggleAnswered(item)}
            style={styles.checkWrap}
          >
            <MaterialCommunityIcons
              name={
                item.is_answered
                  ? 'check-circle'
                  : 'checkbox-blank-circle-outline'
              }
              size={22}
              color={item.is_answered ? GOLD : MUTED}
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.cardBody}
          activeOpacity={0.95}
          onPress={() => openDetail(item)} // open view-only detail
        >
          <Text style={styles.cardText} numberOfLines={4}>
            {preview}
          </Text>
        </TouchableOpacity>

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[
              styles.iconBtn,
              {
                borderColor: item.is_answered ? '#fff' : 'rgba(10,17,36,0.06)',
                backgroundColor: item.is_answered ? '#fff' : '#0A1124',
              },
            ]}
            onPress={() => openEdit(item)}
          >
            <MaterialCommunityIcons
              name="pencil"
              size={16}
              color={item.is_answered ? NAVY : '#fff'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.iconBtn,
              {
                borderColor: item.is_answered ? '#fff' : 'rgba(10,17,36,0.06)',
                backgroundColor: item.is_answered ? '#fff' : '#FF3B30',
              },
            ]}
            onPress={() => deleteNote(item)}
          >
            <MaterialCommunityIcons
              name="trash-can-outline"
              size={16}
              color={item.is_answered ? DANGER : '#fff'}
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const windowHeight = Dimensions.get('window').height;
  // reserve header + modal paddings + actions height
  const reservedModalSpace = insets.top + 140; // عدّل حسب الـ header والـ actions
  const modalMaxHeight = Math.max(
    windowHeight - reservedModalSpace,
    windowHeight * 0.45,
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />
      <View style={{ height: insets.top, backgroundColor: NAVY }} />

      <View style={styles.header}>
        <View style={styles.headerCenter}>
          <Text style={styles.title}> طلبات الصلاة</Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerIcon}
        >
          <MaterialCommunityIcons name="arrow-left" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <MaterialCommunityIcons name="magnify" size={18} color={MUTED} />
        <TextInput
          placeholder="ابحث في طلبات الصلاة..."
          placeholderTextColor={MUTED}
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      {loading ? (
        <ActivityIndicator
          style={{ marginTop: 36 }}
          size="large"
          color={NAVY}
        />
      ) : filtered.length === 0 ? (
        <View style={styles.emptyWrap}>
          <MaterialCommunityIcons
            name="heart-plus-outline"
            size={56}
            color="#E6E6E6"
          />
          <Text style={styles.emptyTitle}>لا توجد طلبات صلاة</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={i => i.id}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: listBottomPadding },
          ]}
        />
      )}

      {/* Floating quick add */}
      <View
        style={[
          styles.quickAddWrap,
          {
            // when keyboard open push the quick add above it, otherwise use safe area
            bottom: keyboardVisible
              ? keyboardHeight + 60
              : insets.bottom
              ? insets.bottom + 16
              : 24,
          },
        ]}
      >
        <View style={styles.quickInputWrap}>
          <TextInput
            placeholder="أضف طلب سريعاً..."
            placeholderTextColor={MUTED}
            style={styles.quickInput}
            value={newNote}
            onChangeText={setNewNote}
            multiline
            textAlign="right"
          />
        </View>
        <TouchableOpacity
          style={[styles.fab, saving && { opacity: 0.6 }]}
          onPress={addQuick}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <MaterialCommunityIcons
              name="send"
              size={18}
              color="#FFF"
              style={{ transform: [{ rotate: '180deg' }] }}
            />
          )}
        </TouchableOpacity>
      </View>

      {/* Detail / View modal (scrollable content, actions fixed) */}
      <Modal visible={showDetailModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeDetail} />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={insets.top + 8}
            style={{ flex: 1, justifyContent: 'flex-end' }}
            pointerEvents="box-none"
          >
            <View
              style={[
                styles.modalBox,
                { height: modalMaxHeight, paddingBottom: 0 },
              ]}
            >
                  <Text style={styles.modalTitle}>تفاصيل طلبة الصلاة</Text>
                  <Text style={styles.modalHint}>
                    {detailItem
                      ? new Date(detailItem.created_at).toLocaleString()
                      : ''}
                  </Text>

                  <ScrollView
                    keyboardShouldPersistTaps="handled"
                    nestedScrollEnabled
                    showsVerticalScrollIndicator
                    style={{ flex: 1, marginTop: 12 }}
                    contentContainerStyle={{
                      paddingHorizontal: 12,
                      paddingBottom:
                        24 + (keyboardVisible ? keyboardHeight : 0),
                    }}
                  >
                    <Text style={[styles.cardText, { textAlign: 'right' }]}>
                      {detailItem?.content ?? ''}
                    </Text>
                  </ScrollView>

                  <View style={{ paddingHorizontal: 12, paddingVertical: 10 }}>
                    <View style={styles.detailActions}>
                      <TouchableOpacity
                        style={styles.cancelBtn}
                        onPress={closeDetail}
                      >
                        <Text style={styles.cancelBtnText}>إغلاق</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.saveBtn, { backgroundColor: NAVY }]}
                        onPress={() => {
                          if (detailItem) {
                            closeDetail();
                            openEdit(detailItem);
                          }
                        }}
                      >
                        <Text style={[styles.saveBtnText, { color: '#FFF' }]}>
                          تعديل
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.cancelBtn,
                          { backgroundColor: DANGER, marginLeft: 8 },
                        ]}
                        onPress={() => {
                          if (detailItem) {
                            deleteNote(detailItem);
                            closeDetail();
                          }
                        }}
                      >
                        <Text style={{ color: '#FFF', fontWeight: '700' }}>
                          حذف
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <CustomAlert {...alertConfig} onDismiss={hideAlert} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: {
    backgroundColor: NAVY,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 12 : 8,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAdd: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(201,168,76,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  title: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  subtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 4 },

  searchRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: CARD,
    margin: 16,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    elevation: 1,
  },
  searchInput: { flex: 1, marginRight: 8, fontSize: 14, color: '#222' },

  list: { paddingHorizontal: 16, paddingBottom: 120 },

  card: {
    backgroundColor: CARD,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  answeredCard: { opacity: 0.7 },
  cardLeft: { width: 44, alignItems: 'center', justifyContent: 'center' },
  checkWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1, paddingHorizontal: 8 },
  cardDate: { color: MUTED, fontSize: 12, marginBottom: 6, textAlign: 'right' },
  cardText: {
    fontSize: 15,
    color: '#111',
    textAlign: 'left',
    alignItems: 'center',
    justifyContent: 'center',
  },

  cardActions: {
    width: 72,
    display: 'flex',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginLeft: 8,
    marginRight: 8,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 0,
  },

  quickAddWrap: {
    position: 'absolute',
    left: 16,
    right: 16,

    flexDirection: 'row', // put FAB on the left
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 14,
    padding: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  quickInputWrap: { flex: 1, marginLeft: 4, marginRight: 8 }, // swapped margins for row-reverse
  quickInput: { maxHeight: 90, fontSize: 14, color: '#222' },
  fab: {
    width: 42,
    height: 42,
    borderRadius: 26,
    backgroundColor: NAVY,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyWrap: { alignItems: 'center', marginTop: 60 },
  emptyTitle: { color: MUTED, fontSize: 16, marginTop: 12, fontWeight: '700' },
  emptyText: { color: MUTED, marginTop: 8 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 12,
    width: '100%',
    maxHeight: '86%',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: NAVY,
    textAlign: 'left',
  },
  modalHint: { color: MUTED, marginTop: 6, textAlign: 'left' },
  modalScroll: { paddingVertical: 12, flexGrow: 1 },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E7E7E7',
    borderRadius: 12,
    padding: 12,
    minHeight: 140,
    fontSize: 15,
    color: '#222',
    textAlignVertical: 'top',
    textAlign: 'right',
  },
  detailActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 12 : 16,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#F0F0F0',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  cancelBtnText: {
    color: '#555',
    fontWeight: '500',
  },
  saveBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontWeight: '500',
  },
});

export default PrayerNotesScreen;
