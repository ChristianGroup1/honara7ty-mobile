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
} from 'react-native';
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

const SpiritualReflectionScreen = ({ navigation }: any) => {
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Reflection | null>(null);
  const [text, setText] = useState('');
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message?: string;
    type?: 'error' | 'warning' | 'success' | 'info';
    buttons?: AlertButton[];
  }>({ visible: false, title: '' });

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
    if (!userId) { setLoading(false); return; }
    const { data, error } = await supabase
      .from('reflections')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });
    if (!error && data) { setReflections(data as Reflection[]); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchReflections(); }, [fetchReflections]);

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

  const handleSave = async () => {
    const trimmed = text.trim();
    if (!trimmed) { return; }
    setSaving(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) { setSaving(false); return; }

    if (editItem) {
      const { error } = await supabase
        .from('reflections')
        .update({ content: trimmed })
        .eq('id', editItem.id);
      if (error) { showAlert('خطأ', error.message); }
    } else {
      const { error } = await supabase
        .from('reflections')
        .insert({
          user_id: userId,
          content: trimmed,
          date: new Date().toISOString().split('T')[0],
        });
      if (error) { showAlert('خطأ', error.message); }
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

  const renderItem = ({ item }: { item: Reflection }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardActions}>
          <TouchableOpacity onPress={() => deleteReflection(item)} style={styles.actionBtn}>
            <MaterialCommunityIcons name="trash-can-outline" size={18} color="#FF3B30" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => openEdit(item)} style={styles.actionBtn}>
            <MaterialCommunityIcons name="pencil-outline" size={18} color={NAVY} />
          </TouchableOpacity>
        </View>
        <View style={styles.dateRow}>
          <MaterialCommunityIcons name="calendar-outline" size={14} color={GOLD} />
          <Text style={styles.dateText}>{formatDate(item.date)}</Text>
        </View>
      </View>
      <Text style={styles.cardContent}>{item.content}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-right" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>التأمل الروحي</Text>
        <TouchableOpacity onPress={openNew} style={styles.addHeaderBtn}>
          <MaterialCommunityIcons name="plus" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={NAVY} />
      ) : (
        <FlatList
          data={reflections}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="notebook-heart-outline" size={64} color="#DDD" />
              <Text style={styles.emptyText}>
                لم تكتب أي تأمل بعد.{'\n'}اضغط "+" لتبدأ رحلتك الروحية!
              </Text>
            </View>
          }
        />
      )}

      {/* ─── Write / Edit Modal ─── */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>
              {editItem ? 'تعديل التأمل' : 'تأمل جديد'}
            </Text>
            <Text style={styles.modalHint}>ماذا كلّمك الله اليوم؟</Text>
            <TextInput
              style={styles.modalInput}
              multiline
              placeholder="اكتب هنا..."
              placeholderTextColor="#AAA"
              value={text}
              onChangeText={setText}
              textAlign="left"
              autoFocus
            />
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
                {saving
                  ? <ActivityIndicator color="#FFF" size="small" />
                  : <Text style={styles.saveBtnText}>حفظ</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <CustomAlert {...alertConfig} onDismiss={hideAlert} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F4F8' },
  header: {
    backgroundColor: NAVY,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 12 : 8,
    paddingBottom: 16,
  },
  backBtn: { padding: 4 },
  addHeaderBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: 8,
    borderRadius: 20,
  },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },

  list: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateText: { color: '#888', fontSize: 12 },
  cardActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { padding: 4 },
  cardContent: { fontSize: 15, color: '#333', lineHeight: 24, textAlign: 'left' },

  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyText: {
    color: '#AAA',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 26,
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
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: NAVY, textAlign: 'left' },
  modalHint: { color: '#888', fontSize: 13, marginTop: 4, textAlign: 'left' },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#333',
    minHeight: 140,
    marginTop: 16,
    textAlignVertical: 'top',
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 16 },
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
    backgroundColor: NAVY,
    minWidth: 80,
    alignItems: 'center',
  },
  saveBtnText: { color: '#FFF', fontWeight: 'bold' },
});

export default SpiritualReflectionScreen;
