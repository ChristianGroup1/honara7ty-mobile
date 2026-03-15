import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
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

interface PrayerNote {
  id: string;
  content: string;
  created_at: string;
  is_answered: boolean;
}

const PrayerNotesScreen = ({ navigation }: any) => {
  const [notes, setNotes] = useState<PrayerNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newNote, setNewNote] = useState('');
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

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) { setLoading(false); return; }
    const { data, error } = await supabase
      .from('prayer_notes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (!error && data) { setNotes(data as PrayerNote[]); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  const addNote = async () => {
    const trimmed = newNote.trim();
    if (!trimmed) { return; }
    setSaving(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) { setSaving(false); return; }
    const { error } = await supabase
      .from('prayer_notes')
      .insert({ user_id: userId, content: trimmed, is_answered: false });
    if (error) {
      showAlert('خطأ', error.message);
    } else {
      setNewNote('');
      await fetchNotes();
    }
    setSaving(false);
  };

  const toggleAnswered = async (note: PrayerNote) => {
    const { error } = await supabase
      .from('prayer_notes')
      .update({ is_answered: !note.is_answered })
      .eq('id', note.id);
    if (!error) {
      setNotes(prev =>
        prev.map(n => n.id === note.id ? { ...n, is_answered: !n.is_answered } : n),
      );
    }
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
            if (!error) {
              setNotes(prev => prev.filter(n => n.id !== note.id));
            } else {
              showAlert('خطأ', error.message);
            }
          },
        },
      ],
      'warning',
    );
  };

  const renderItem = ({ item }: { item: PrayerNote }) => (
    <View style={[styles.noteCard, item.is_answered && styles.noteAnswered]}>
      <TouchableOpacity
        style={styles.checkBtn}
        onPress={() => toggleAnswered(item)}
      >
        <MaterialCommunityIcons
          name={item.is_answered ? 'check-circle' : 'circle-outline'}
          size={24}
          color={item.is_answered ? '#34C759' : '#AAAAAA'}
        />
      </TouchableOpacity>
      <Text style={[styles.noteText, item.is_answered && styles.noteTextAnswered]}>
        {item.content}
      </Text>
      <TouchableOpacity onPress={() => deleteNote(item)}>
        <MaterialCommunityIcons name="trash-can-outline" size={20} color="#FF3B30" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-right" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ملاحظات الصلاة</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Add note input */}
      <View style={styles.inputRow}>
        <TouchableOpacity
          style={[styles.addBtn, saving && { opacity: 0.5 }]}
          onPress={addNote}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#FFF" size="small" />
            : <MaterialCommunityIcons name="plus" size={22} color="#FFF" />}
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="أضف طلب صلاة..."
          placeholderTextColor="#AAA"
          value={newNote}
          onChangeText={setNewNote}
          multiline
          textAlign="right"
        />
      </View>

      {/* List */}
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={NAVY} />
      ) : (
        <FlatList
          data={notes}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>لا توجد طلبات صلاة بعد.\nأضف أولى طلباتك!</Text>
          }
        />
      )}

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
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    margin: 16,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  input: { flex: 1, fontSize: 15, color: '#333', maxHeight: 80, paddingRight: 8 },
  addBtn: {
    backgroundColor: NAVY,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },

  list: { paddingHorizontal: 16, paddingBottom: 32 },
  noteCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  noteAnswered: { opacity: 0.6 },
  checkBtn: { marginLeft: 10 },
  noteText: { flex: 1, fontSize: 15, color: '#333', textAlign: 'right', marginRight: 8 },
  noteTextAnswered: { textDecorationLine: 'line-through', color: '#999' },
  empty: {
    textAlign: 'center',
    color: '#AAA',
    marginTop: 60,
    fontSize: 15,
    lineHeight: 26,
  },
});

export default PrayerNotesScreen;
