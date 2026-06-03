import React, {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StatusBar,
  Text,
  TextInput,
  View,
  Keyboard,
  useWindowDimensions,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
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
  readCachedPrayerNotes,
  refreshPrayerNotes,
  savePrayerNote,
  togglePrayerNoteAnswered,
} from '../../lib/offlineSync';

const PrayerNotesScreen: React.FC<any> = ({ navigation }) => {
  const strings = getStrings().prayerNotes;
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const sessionUserRef = useRef<any>(null);
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
  const deferredQuery = useDeferredValue(query);

  const showAlert = useCallback(
    (
      title: string,
      message?: string,
      buttons?: AlertButton[],
      type: any = 'info',
    ) => setAlertConfig({ visible: true, title, message, buttons, type }),
    [],
  );
  const hideAlert = useCallback(
    () => setAlertConfig((p: any) => ({ ...p, visible: false })),
    [],
  );

  const getCurrentUserId = useCallback(async () => {
    let sessionUser = sessionUserRef.current;
    if (!sessionUser) {
      const { data: sessionData } = await supabase.auth.getSession();
      sessionUser = sessionData?.session?.user;
      sessionUserRef.current = sessionUser ?? null;
    }

    return sessionUser?.id as string | undefined;
  }, []);

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    const userId = await getCurrentUserId();
    if (!userId) {
      setLoading(false);
      return;
    }

    const cached = await readCachedPrayerNotes(userId);
    setNotes(cached);
    setLoading(false);

    const { data } = await refreshPrayerNotes(userId);
    setNotes(data);
    setLoading(false);
  }, [getCurrentUserId]);

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

  const resetComposer = useCallback(() => {
    setEditItem(null);
    setNewNote('');
    setShowModal(false);
  }, []);

  const openNew = useCallback(() => {
    setEditItem(null);
    setNewNote('');
    setShowModal(true);
  }, []);

  const openEdit = useCallback((note: PrayerNote) => {
    setEditItem(note);
    setNewNote(note.content);
    setShowDetailModal(false);
    setShowModal(true);
  }, []);

  const openDetail = useCallback((note: PrayerNote) => {
    setDetailItem(note);
    setShowDetailModal(true);
  }, []);
  const closeDetail = useCallback(() => {
    setShowDetailModal(false);
    setDetailItem(null);
  }, []);

  const handleComposerSubmit = useCallback(async () => {
    const trimmed = newNote.trim();
    if (!trimmed) return;
    setSaving(true);
    const userId = await getCurrentUserId();
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
  }, [editItem, getCurrentUserId, newNote, resetComposer]);

  const toggleAnswered = useCallback(
    async (note: PrayerNote) => {
      const userId = await getCurrentUserId();
      if (!userId) {
        return;
      }

      const result = await togglePrayerNoteAnswered({ userId, note });
      setNotes(result.data);
    },
    [getCurrentUserId],
  );

  const deleteNote = useCallback(
    (note: PrayerNote) => {
      showAlert(
        strings.deleteTitle,
        strings.deleteMessage,
        [
          { text: strings.cancel, style: 'cancel' },
          {
            text: strings.delete,
            style: 'destructive',
            onPress: async () => {
              const userId = await getCurrentUserId();
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
    },
    [
      showAlert,
      getCurrentUserId,
      strings.cancel,
      strings.delete,
      strings.deleteMessage,
      strings.deleteTitle,
    ],
  );

  const filtered = useMemo(
    () =>
      notes.filter(n =>
        n.content.toLowerCase().includes(deferredQuery.trim().toLowerCase()),
      ),
    [deferredQuery, notes],
  );
  const shouldShowHero = query.trim().length === 0 && !keyboardVisible;
  const isCompactWidth = windowWidth < 380;
  const isNarrowWidth = windowWidth < 360;
  const keyExtractor = useCallback((item: PrayerNote) => item.id, []);
  const renderNote = useCallback(
    ({ item }: { item: PrayerNote }) => (
      <PrayerNoteCard
        item={item}
        isNarrowWidth={isNarrowWidth}
        onToggleAnswered={toggleAnswered}
        onOpenDetail={openDetail}
        onOpenEdit={openEdit}
        onDelete={deleteNote}
      />
    ),
    [deleteNote, isNarrowWidth, openDetail, openEdit, toggleAnswered],
  );

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />
      <PrayerNotesHeader
        topInsetHeight={insets?.top ?? 0}
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

      {loading && notes.length === 0 ? (
        <View style={styles.fullScreenLoader}>
          <ActivityIndicator size="large" color={NAVY} />
        </View>
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
          keyExtractor={keyExtractor}
          renderItem={renderNote}
          contentContainerStyle={styles.listWithBottomPadding}
          keyboardShouldPersistTaps="handled"
          removeClippedSubviews={Platform.OS === 'android'}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          updateCellsBatchingPeriod={40}
          windowSize={7}
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
        topInset={insets?.top ?? 0}
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
