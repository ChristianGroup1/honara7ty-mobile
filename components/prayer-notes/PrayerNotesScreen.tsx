import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  SafeAreaView,
  StatusBar,
  Text,
  TextInput,
  View,
  Keyboard,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import supabase from '../../lib/supbase';
import CustomAlert, { AlertButton } from '../shared/CustomAlert';
import { MUTED, NAVY } from './constants';
import PrayerComposer from './PrayerComposer';
import PrayerDetailModal from './PrayerDetailModal';
import PrayerNotesHeader from './PrayerNotesHeader';
import PrayerNoteCard from './PrayerNoteCard';
import { prayerNotesStyles as styles } from './styles';
import { PrayerNote } from './types';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { getStrings } from '../../localization';

const PrayerNotesScreen: React.FC<any> = ({ navigation }) => {
  const strings = getStrings().prayerNotes;
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [notes, setNotes] = useState<PrayerNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [editItem, setEditItem] = useState<PrayerNote | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [composerHeight, setComposerHeight] = useState(74);
  const [detailItem, setDetailItem] = useState<PrayerNote | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [alertConfig, setAlertConfig] = useState<any>({
    visible: false,
    title: '',
  });
  const [query, setQuery] = useState('');
  const quickInputRef = useRef<TextInput>(null);

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

  const resetComposer = () => {
    setEditItem(null);
    setNewNote('');
  };

  const openEdit = (note: PrayerNote) => {
    setEditItem(note);
    setNewNote(note.content);
    setShowDetailModal(false);
    requestAnimationFrame(() => quickInputRef.current?.focus());
  };

  const openDetail = (note: PrayerNote) => {
    setDetailItem(note);
    setShowDetailModal(true);
  };
  const closeDetail = () => {
    setShowDetailModal(false);
    setDetailItem(null);
  };

  const handleComposerSubmit = async () => {
    const trimmed = newNote.trim();
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
      if (error) showAlert(strings.errors.genericTitle, error.message);
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
      if (error) showAlert(strings.errors.genericTitle, error.message);
      else await fetchNotes();
    }

    setSaving(false);
    resetComposer();
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
      strings.deleteTitle,
      strings.deleteMessage,
      [
        { text: strings.cancel, style: 'cancel' },
        {
          text: strings.delete,
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('prayer_notes')
              .delete()
              .eq('id', note.id);
            if (!error) setNotes(prev => prev.filter(n => n.id !== note.id));
            else showAlert(strings.errors.genericTitle, error.message);
          },
        },
      ],
      'warning',
    );
  };

  const filtered = notes.filter(n =>
    n.content.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const composerBottomOffset = keyboardVisible
    ? keyboardHeight + 55
    : insets.bottom
    ? insets.bottom + 16
    : 24;

  // Keep the last list item scrollable above the floating composer.
  const listBottomPadding = composerHeight + composerBottomOffset + 16;
  const isCompactWidth = windowWidth < 380;
  const isNarrowWidth = windowWidth < 360;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />
      <PrayerNotesHeader
        topInsetHeight={insets.top}
        onBack={() => navigation.goBack()}
      />

      <View style={styles.searchRow}>
        <MaterialCommunityIcons name="magnify" size={18} color={MUTED} />
        <TextInput
          placeholder={strings.searchPlaceholder}
          placeholderTextColor={MUTED}
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" color={NAVY} />
      ) : filtered.length === 0 ? (
        <View style={styles.emptyWrap}>
          <MaterialCommunityIcons
            name="heart-plus-outline"
            size={56}
            color="#E6E6E6"
          />
          <Text style={styles.emptyTitle}>{strings.emptyTitle}</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={i => i.id}
          renderItem={({ item }) => (
            <PrayerNoteCard
              item={item}
              isNarrowWidth={isNarrowWidth}
              onToggleAnswered={toggleAnswered}
              onOpenDetail={openDetail}
              onOpenEdit={openEdit}
              onDelete={deleteNote}
            />
          )}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: listBottomPadding },
          ]}
        />
      )}
      <PrayerComposer
        bottomOffset={composerBottomOffset}
        composerHeight={composerHeight}
        editMode={Boolean(editItem)}
        newNote={newNote}
        saving={saving}
        inputRef={quickInputRef}
        onLayoutHeight={setComposerHeight}
        onChangeText={setNewNote}
        onReset={resetComposer}
        onSubmit={handleComposerSubmit}
      />

      <PrayerDetailModal
        visible={showDetailModal}
        keyboardVisible={keyboardVisible}
        detailItem={detailItem}
        windowHeight={windowHeight}
        isCompactWidth={isCompactWidth}
        onClose={closeDetail}
        onEdit={openEdit}
        onDelete={deleteNote}
      />

      <CustomAlert {...alertConfig} onDismiss={hideAlert} />
    </SafeAreaView>
  );
};

export default PrayerNotesScreen;
