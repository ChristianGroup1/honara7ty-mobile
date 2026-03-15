/**
 * TestimoniesScreen
 * Users write a testimony (answered prayer) and share it on social media.
 * Testimonies are stored in Supabase `testimonies` table.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  SafeAreaView,
  Share,
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

interface Testimony {
  id: string;
  content: string;
  created_at: string;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('ar-EG', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch { return iso; }
}

const TestimoniesScreen = ({ navigation }: any) => {
  const [testimonies, setTestimonies] = useState<Testimony[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [newText, setNewText] = useState('');
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean; title: string; message?: string;
    type?: 'error' | 'warning' | 'success' | 'info'; buttons?: AlertButton[];
  }>({ visible: false, title: '' });

  const showAlert = (title: string, message?: string, buttons?: AlertButton[],
    type: 'error' | 'warning' | 'success' | 'info' = 'error') =>
    setAlertConfig({ visible: true, title, message, buttons, type });
  const hideAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));

  const fetchTestimonies = useCallback(async () => {
    setLoading(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) { setLoading(false); return; }
    const { data, error } = await supabase
      .from('testimonies')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (!error && data) { setTestimonies(data as Testimony[]); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchTestimonies(); }, [fetchTestimonies]);

  const handleSave = async () => {
    const trimmed = newText.trim();
    if (!trimmed) { return; }
    setSaving(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) { setSaving(false); return; }
    const { error } = await supabase
      .from('testimonies')
      .insert({ user_id: userId, content: trimmed });
    if (error) {
      showAlert('خطأ', error.message);
    } else {
      setNewText('');
      setShowModal(false);
      await fetchTestimonies();
    }
    setSaving(false);
  };

  const handleShare = async (t: Testimony) => {
    try {
      await Share.share({
        message: `🙏 شهادة: ${t.content}\n\n#هنا_راحتي #الله_يسمع_الصلوات`,
      });
    } catch { /* user cancelled */ }
  };

  const handleDelete = (t: Testimony) => {
    showAlert(
      'حذف الشهادة',
      'هل تريد حذف هذه الشهادة؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف', style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('testimonies').delete().eq('id', t.id);
            if (!error) {
              setTestimonies(prev => prev.filter(x => x.id !== t.id));
            } else {
              showAlert('خطأ', error.message);
            }
          },
        },
      ],
      'warning',
    );
  };

  const renderItem = ({ item }: { item: Testimony }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardActions}>
          <TouchableOpacity onPress={() => handleDelete(item)} style={styles.actionBtn}>
            <MaterialCommunityIcons name="trash-can-outline" size={18} color="#FF3B30" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleShare(item)} style={styles.actionBtn}>
            <MaterialCommunityIcons name="share-variant-outline" size={18} color={NAVY} />
          </TouchableOpacity>
        </View>
        <View style={styles.dateRow}>
          <MaterialCommunityIcons name="calendar-heart" size={14} color={GOLD} />
          <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
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
        <Text style={styles.headerTitle}>الشهادات</Text>
        <TouchableOpacity
          onPress={() => { setNewText(''); setShowModal(true); }}
          style={styles.addHeaderBtn}
        >
          <MaterialCommunityIcons name="plus" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Banner */}
      <View style={styles.banner}>
        <MaterialCommunityIcons name="heart-circle-outline" size={28} color={GOLD} />
        <Text style={styles.bannerText}>
          شارك كيف أجاب الله صلاتك وكن مصدر تشجيع للآخرين.
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={NAVY} />
      ) : (
        <FlatList
          data={testimonies}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="hands-pray" size={64} color="#DDD" />
              <Text style={styles.emptyText}>
                لم تشارك أي شهادة بعد.{'\n'}اضغط "+" لتكتب أول شهاداتك!
              </Text>
            </View>
          }
        />
      )}

      {/* Write Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>شهادة جديدة</Text>
            <Text style={styles.modalHint}>كيف أجاب الله صلاتك؟</Text>
            <TextInput
              style={styles.modalInput}
              multiline
              placeholder="اكتب شهادتك هنا..."
              placeholderTextColor="#AAA"
              value={newText}
              onChangeText={setNewText}
              textAlign="right"
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.shareModalBtn}
                onPress={async () => {
                  const trimmed = newText.trim();
                  if (!trimmed) { return; }
                  // Capture the text before handleSave clears newText
                  const textToShare = trimmed;
                  await handleSave();
                  try {
                    await Share.share({
                      message: `🙏 شهادة: ${textToShare}\n\n#هنا_راحتي #الله_يسمع_الصلوات`,
                    });
                  } catch { /* user cancelled */ }
                }}
                disabled={saving}
              >
                <MaterialCommunityIcons name="share-variant" size={18} color="#FFF" />
                <Text style={styles.shareModalBtnText}>احفظ وشارك</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator color="#FFF" size="small" />
                  : <Text style={styles.saveBtnText}>حفظ فقط</Text>}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.cancelBtnText}>إلغاء</Text>
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

  banner: {
    backgroundColor: NAVY,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  bannerText: { flex: 1, color: 'rgba(255,255,255,0.75)', fontSize: 13, textAlign: 'right', lineHeight: 20 },

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
    borderRightWidth: 4,
    borderRightColor: GOLD,
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
  cardContent: { fontSize: 15, color: '#333', lineHeight: 26, textAlign: 'right' },

  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyText: {
    color: '#AAA', fontSize: 15, textAlign: 'center', marginTop: 16, lineHeight: 26,
  },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: NAVY, textAlign: 'right' },
  modalHint: { color: '#888', fontSize: 13, marginTop: 4, textAlign: 'right' },
  modalInput: {
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12,
    padding: 14, fontSize: 15, color: '#333', minHeight: 140,
    marginTop: 16, textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 16, flexWrap: 'wrap',
  },
  shareModalBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: GOLD, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16,
  },
  shareModalBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  saveBtn: {
    paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, backgroundColor: NAVY,
    minWidth: 80, alignItems: 'center',
  },
  saveBtnText: { color: '#FFF', fontWeight: 'bold' },
  cancelBtn: {
    paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, backgroundColor: '#F0F0F0',
  },
  cancelBtnText: { color: '#555', fontWeight: '600' },
});

export default TestimoniesScreen;
