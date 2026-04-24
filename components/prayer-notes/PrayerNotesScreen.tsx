import React, { useCallback, useEffect, useState } from 'react';
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
import PrayerDetailModal from './PrayerDetailModal';
import PrayerEditorModal from './PrayerEditorModal';
import PrayerNotesHeader from './PrayerNotesHeader';
import PrayerNoteCard from './PrayerNoteCard';
import { prayerNotesStyles as styles } from './styles';
import { PrayerNote } from './types';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { getStrings } from '../../localization';

import {
  deletePrayerNote,
  getPrayerNotesCache,
  refreshPrayerNotes,
  savePrayerNote,
  togglePrayerNoteAnswered,
} from '../../lib/offlineSync';

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
  const [showModal, setShowModal] = useState(false);
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
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) {
      setLoading(false);
      return;
    }
    const cached = await getPrayerNotesCache(userId);
    if (cached.length > 0) {
      setNotes(cached);
      setLoading(false);
    }
    const { data } = await refreshPrayerNotes(userId);
    setNotes(data);
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

    const showSub = Keyboard.addListener(showEvent, () => {
      setKeyboardVisible(true);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardVisible(false);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const resetComposer = () => {
    setEditItem(null);
    setNewNote('');
    setShowModal(false);
  };

  const openNew = () => {
    setEditItem(null);
    setNewNote('');
    setShowModal(true);
  };

  const openEdit = (note: PrayerNote) => {
    setEditItem(note);
    setNewNote(note.content);
    setShowDetailModal(false);
    setShowModal(true);
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
      const result = await savePrayerNote({
        userId,
        note: editItem,
        content: trimmed,
      });
      setNotes(result.data);
    } else {
      const result = await savePrayerNote({
        userId,
        content: trimmed,
      });
      setNotes(result.data);
    }

    setSaving(false);
    resetComposer();
  };

  const toggleAnswered = async (note: PrayerNote) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) {
      return;
    }

    const result = await togglePrayerNoteAnswered({ userId, note });
    if (!note.is_answered) {
    }
    setNotes(result.data);
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
            const { data: sessionData } = await supabase.auth.getSession();
            const userId = sessionData?.session?.user?.id;
            if (!userId) {
              return;
            }

            const result = await deletePrayerNote({ userId, note });
            setNotes(result.data);
          },
        },
      ],
      'warning',
    );
  };

  const filtered = notes.filter(n =>
    n.content.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const answeredCount = notes.filter(note => note.is_answered).length;
  const shouldShowHero = query.trim().length === 0 && !keyboardVisible;
  const isCompactWidth = windowWidth < 380;
  const isNarrowWidth = windowWidth < 360;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />
      <PrayerNotesHeader
        topInsetHeight={insets.top}
        onBack={() => navigation.goBack()}
        onAdd={openNew}
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
        <>
          {shouldShowHero ? (
            <View style={styles.list}>
              <View style={styles.heroCard}>
                <View style={styles.heroGlow} />
                <View style={styles.heroTopRow}>
                  <View style={styles.heroIconWrap}>
                    <MaterialCommunityIcons
                      name="hand-heart"
                      size={24}
                      color="#FFF"
                    />
                  </View>
                  <View style={styles.heroBadge}>
                    <Text style={styles.heroBadgeText}>
                      {strings.heroBadge}
                    </Text>
                  </View>
                </View>

                <Text style={styles.heroEyebrow}>{strings.headerEyebrow}</Text>
                <Text style={styles.heroTitle}>{strings.heroTitle}</Text>
                <Text style={styles.heroText}>{strings.heroText}</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrap}>
              <MaterialCommunityIcons
                name="hand-heart"
                size={42}
                color="#C9A84C"
              />
            </View>
            <Text style={styles.emptyTitle}>{strings.emptyTitle}</Text>
            <Text style={styles.emptyTextSmall}>{strings.emptyMessage}</Text>
          </View>
        </>
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
          contentContainerStyle={[styles.list, { paddingBottom: 32 }]}
          ListHeaderComponent={
            shouldShowHero ? (
              <View style={styles.heroCard}>
                <View style={styles.heroGlow} />
                <View style={styles.heroTopRow}>
                  <View style={styles.heroIconWrap}>
                    <MaterialCommunityIcons
                      name="hand-heart"
                      size={24}
                      color="#FFF"
                    />
                  </View>
                  <View style={styles.heroBadge}>
                    <Text style={styles.heroBadgeText}>
                      {strings.heroBadge}
                    </Text>
                  </View>
                </View>

                <Text style={styles.heroEyebrow}>{strings.headerEyebrow}</Text>
                <Text style={styles.heroTitle}>{strings.heroTitle}</Text>
                <Text style={styles.heroText}>{strings.heroText}</Text>
              </View>
            ) : null
          }
        />
      )}

      <PrayerEditorModal
        visible={showModal}
        keyboardVisible={keyboardVisible}
        topInset={insets.top}
        editMode={Boolean(editItem)}
        text={newNote}
        saving={saving}
        onChangeText={setNewNote}
        onClose={resetComposer}
        onSave={handleComposerSubmit}
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
