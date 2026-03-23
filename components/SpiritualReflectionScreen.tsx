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
  TouchableWithoutFeedback,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import supabase from '../lib/supbase';
import CustomAlert, { AlertButton } from './CustomAlert';

const NAVY = '#0A1124';
const GOLD = '#C9A84C';

interface Reflection {
  id: string;
  content: string;
  date: string;
  created_at: string;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

const PREVIEW_LIMIT = 150; // عدد الحروف المعروض في المعاينة

const SpiritualReflectionScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Reflection | null>(null);
  const [text, setText] = useState('');
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message?: string;
    type?: 'error' | 'warning' | 'success' | 'info';
    buttons?: AlertButton[];
  }>({ visible: false, title: '' });
  const [detailItem, setDetailItem] = useState<Reflection | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const showAlert = (
    title: string,
    message?: string,
    buttons?: AlertButton[],
    type: 'error' | 'warning' | 'success' | 'info' = 'error',
  ) => setAlertConfig({ visible: true, title, message, buttons, type });

  const hideAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));

  const fetchReflections = useCallback(async () => {
    setLoading(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) {
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('reflections')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });
    if (!error && data) {
      setReflections(data as Reflection[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchReflections();
  }, [fetchReflections]);

  // hide dim overlay when keyboard is open (prevents dark strip under buttons)
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () =>
      setKeyboardVisible(true),
    );
    const hideSub = Keyboard.addListener('keyboardDidHide', () =>
      setKeyboardVisible(false),
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const openNew = () => {
    setEditItem(null);
    setText('');
    setShowModal(true);
  };

  const openEdit = (item: Reflection) => {
    setEditItem(item);
    setText(item.content);
    setShowModal(true);
  };

  const openDetail = (item: Reflection) => {
    setDetailItem(item);
    setShowDetail(true);
  };

  const closeDetail = () => {
    setShowDetail(false);
    setDetailItem(null);
  };

  const handleSave = async () => {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }
    setSaving(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) {
      setSaving(false);
      return;
    }

    if (editItem) {
      const { error } = await supabase
        .from('reflections')
        .update({ content: trimmed })
        .eq('id', editItem.id);
      if (error) {
        showAlert('خطأ', error.message);
      }
    } else {
      const { error } = await supabase.from('reflections').insert({
        user_id: userId,
        content: trimmed,
        date: new Date().toISOString().split('T')[0],
      });
      if (error) {
        showAlert('خطأ', error.message);
      }
    }

    setSaving(false);
    setShowModal(false);
    await fetchReflections();
  };

  const deleteReflection = (item: Reflection) => {
    showAlert(
      'حذف التأمل',
      'هل تريد حذف هذا التأمل؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('reflections')
              .delete()
              .eq('id', item.id);
            if (!error) {
              setReflections(prev => prev.filter(r => r.id !== item.id));
            } else {
              showAlert('خطأ', error.message);
            }
          },
        },
      ],
      'warning',
    );
  };

  const renderItem = ({ item }: { item: Reflection }) => {
    const preview =
      item.content.length > PREVIEW_LIMIT
        ? item.content.slice(0, PREVIEW_LIMIT).trimEnd() + '…'
        : item.content;

    return (
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={() => openDetail(item)}
        style={styles.card}
      >
        <View style={styles.cardBody}>
          <View style={styles.cardHeader}>
            <View style={styles.dateRow}>
              <MaterialCommunityIcons
                name="calendar-outline"
                size={14}
                color={GOLD}
              />
              <Text style={styles.dateText}>{formatDate(item.date)}</Text>
            </View>
          </View>

          <Text style={styles.cardContent}>{preview}</Text>
        </View>

        {/* actions column (edit + delete) */}
        <View style={styles.actionGroup}>
          <TouchableOpacity
            onPress={() => openEdit(item)}
            style={[styles.actionBtnCircle, styles.editBtn]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="pencil" size={16} color={'#fff'} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => deleteReflection(item)}
            style={[styles.actionBtnCircle, styles.trashBtn]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons
              name="trash-can-outline"
              size={16}
              color="#fff"
            />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />
      <View style={{ height: insets.top, backgroundColor: NAVY }} />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.75}
        >
          <MaterialCommunityIcons name="arrow-left" size={20} color="#FFF" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>التأمل الروحي</Text>

        <TouchableOpacity
          onPress={openNew}
          style={styles.addHeaderBtn}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="plus" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator
          style={{ marginTop: 36 }}
          size="large"
          color={NAVY}
        />
      ) : (
        <FlatList
          data={reflections}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconWrap}>
                <MaterialCommunityIcons
                  name="notebook-heart-outline"
                  size={48}
                  color="#EEE"
                />
              </View>
              <Text style={styles.emptyTitle}>لا يوجد تأملات بعد</Text>
              <Text style={styles.emptyTextSmall}>
                اضغط + لإنشاء أول تأملك وتوثيق ما كلمك الله به اليوم.
              </Text>
            </View>
          }
        />
      )}

      {/* ─── Write / Edit Modal (keyboard-aware + scrollable; buttons fixed) ─── */}
      <Modal visible={showModal} animationType="slide" transparent>
        <TouchableWithoutFeedback
          onPress={() => {
            if (keyboardVisible) {
              Keyboard.dismiss();
            } else {
              setShowModal(false);
            }
          }}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={insets.top}
            style={{ flex: 1 }}
          >
            <View
              style={[
                styles.modalOverlay,
                keyboardVisible ? { backgroundColor: 'transparent' } : null,
              ]}
            >
              <View style={styles.modalBox}>
                <Text style={styles.modalTitle}>
                  {editItem ? 'تعديل التأمل' : 'تأمل جديد'}
                </Text>
                <Text style={styles.modalHint}>ماذا كلّمك الله اليوم؟</Text>

                <ScrollView
                  contentContainerStyle={styles.modalScroll}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  <TextInput
                    style={styles.modalInput}
                    multiline
                    placeholder="اكتب هنا..."
                    placeholderTextColor="#AAA"
                    value={text}
                    onChangeText={setText}
                    textAlign="right"
                    textAlignVertical="top"
                  />
                </ScrollView>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => setShowModal(false)}
                  >
                    <Text style={styles.cancelBtnText}>إلغاء</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                    onPress={handleSave}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                      <Text
                        style={styles.saveBtnText}
                        accessibilityLabel={
                          editItem ? 'حفظ التعديل' : 'إضافة التأمل'
                        }
                      >
                        {editItem ? 'حفظ التعديل' : 'إضافة'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ─── Detail modal: tap outside to close ─── */}
      <Modal visible={showDetail} animationType="slide" transparent>
        <TouchableWithoutFeedback onPress={closeDetail}>
          <View
            style={[
              styles.modalOverlay,
              keyboardVisible ? { backgroundColor: 'transparent' } : null,
            ]}
          >
            {/* inner touchable prevents outside-tap from closing when tapping inside box */}
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={[styles.modalBox, { paddingBottom: 8 }]}>
                <Text style={styles.modalTitle}>تفاصيل التأمل</Text>
                <Text style={styles.modalHint}>
                  {detailItem ? formatDate(detailItem.date) : ''}
                </Text>

                <ScrollView
                  style={{
                    maxHeight: Dimensions.get('window').height * 0.6,
                    marginTop: 8,
                  }}
                  contentContainerStyle={{ paddingBottom: 20 }}
                  showsVerticalScrollIndicator
                  keyboardShouldPersistTaps="handled"
                >
                  <Text style={[styles.cardContent]}>
                    {detailItem?.content ?? ''}
                  </Text>
                </ScrollView>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={closeDetail}
                  >
                    <Text style={styles.cancelBtnText}>إغلاق</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.saveBtn]}
                    onPress={() => {
                      if (detailItem) {
                        closeDetail();
                        openEdit(detailItem);
                      }
                    }}
                  >
                    <Text style={styles.saveBtnText}>تعديل</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={async () => {
                      if (!detailItem) return;
                      const { error } = await supabase
                        .from('reflections')
                        .delete()
                        .eq('id', detailItem.id);
                      if (!error) {
                        setReflections(prev =>
                          prev.filter(r => r.id !== detailItem.id),
                        );
                      }
                      closeDetail();
                    }}
                  >
                    <Text style={styles.deleteBtnText}>حذف</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <CustomAlert {...alertConfig} onDismiss={hideAlert} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F4F8' },
  header: {
    backgroundColor: NAVY,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 12 : 8,
    paddingBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addHeaderBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(201,168,76,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },

  list: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    justifyContent: 'space-between',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  cardBody: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'column', // RTL header row
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateText: { color: '#888', fontSize: 12 },
  cardActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { padding: 4 },
  iconSmallBtn: {
    padding: 8,
    borderRadius: 8,
  },
  cardContent: {
    fontSize: 15,
    color: '#333',
    lineHeight: 24,
    textAlign: 'left', // RTL
  },
  actionGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    alignItems: 'center',
    marginLeft: 10,
  },
  actionBtnCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    marginVertical: 6,
  },
  editBtn: {
    borderWidth: 1,
    borderColor: 'rgba(10,17,36,0.06)',
    backgroundColor: '#0A1124',
  },
  trashBtn: {
    borderWidth: 1,
    borderColor: 'rgba(10,17,36,0.06)',
    backgroundColor: '#FF3B30',
  },

  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(201,168,76,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyTextSmall: {
    color: '#AAA',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },

  /* modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    width: '100%',
    maxHeight: '90%',
    flexDirection: 'column',
    justifyContent: 'space-between', // keeps actions visible
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: NAVY,
    textAlign: 'left',
  },
  modalHint: { color: '#888', fontSize: 13, marginTop: 4, textAlign: 'left' },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#333',
    minHeight: 160,
    marginTop: 12,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row', // keep order: [إلغاء | حفظ]
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    // ensure buttons visible above keyboard on Android too
    paddingBottom: Platform.OS === 'ios' ? 8 : 16,
  },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    backgroundColor: '#F0F0F0',
  },
  cancelBtnText: { color: '#555', fontWeight: '600' },
  saveBtn: {
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 10,
    backgroundColor: '#0A1124',
    minWidth: 80,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  modalScroll: {
    flexGrow: 1,
    paddingBottom: 12,
  },

  /* detail modal */
  deleteBtn: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: '#FF3B30',
    marginLeft: 8,
  },
  deleteBtnText: { color: '#FFF', fontWeight: '700' },
  detailScroll: {
    marginTop: 8,
    flex: 1, // expand so ScrollView can actually scroll
  },
  detailScrollContent: {
    paddingBottom: 18,
  },
});

export default SpiritualReflectionScreen;
