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
  RefreshControl,
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
import { useFocusEffect } from '@react-navigation/native';
import supabase from '../../lib/supbase';
import CustomAlert, { AlertButton } from '../shared/CustomAlert';
import ReflectionCard from './ReflectionCard';
import ReflectionDetailModal from './ReflectionDetailModal';
import ReflectionEditorModal from './ReflectionEditorModal';
import SpiritualReflectionHeader from './SpiritualReflectionHeader';
import {
  createThemedSpiritualReflectionStyles,
  spiritualReflectionStyles as styles,
  GOLD,
} from './styles';
import HeroBackground from '../shared/HeroBackground';
import { Reflection } from './types';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { getStrings } from '../../localization';
import { useNightMode } from '../../lib/nightMode';
import {
  deleteReflection as removeReflection,
  readCachedReflections,
  refreshReflections,
  saveReflection,
} from '../../lib/offlineSync';

const SpiritualReflectionScreen = ({ navigation, route }: any) => {
  const strings = getStrings().spiritualReflection;
  const insets = useSafeAreaInsets();
  const { colors } = useNightMode();
  const themedStyles = useMemo(
    () => createThemedSpiritualReflectionStyles(colors),
    [colors],
  );
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const sessionUserRef = useRef<any>(null);
  const hasLoadedReflectionsRef = useRef(false);
  const lastInitialReflectionTextRef = useRef<string | null>(null);
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Reflection | null>(null);
  const [text, setText] = useState('');
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [audioDurationMs, setAudioDurationMs] = useState<number | null>(null);
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
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const isCompactWidth = windowWidth < 380;
  const isNarrowWidth = windowWidth < 360;
  const filteredReflections = useMemo(
    () =>
      reflections.filter(reflection =>
        reflection.content
          .toLowerCase()
          .includes(deferredQuery.trim().toLowerCase()),
      ),
    [deferredQuery, reflections],
  );
  const shouldShowHero = query.trim().length === 0 && !keyboardVisible;

  const showAlert = useCallback(
    (
      title: string,
      message?: string,
      buttons?: AlertButton[],
      type: 'error' | 'warning' | 'success' | 'info' = 'error',
    ) => setAlertConfig({ visible: true, title, message, buttons, type }),
    [],
  );

  const hideAlert = useCallback(
    () => setAlertConfig(prev => ({ ...prev, visible: false })),
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

  const fetchReflections = useCallback(
    async ({
      showLoader = false,
      showRefreshing = false,
    }: { showLoader?: boolean; showRefreshing?: boolean } = {}) => {
      if (showLoader) {
        setLoading(true);
      }
      if (showRefreshing) {
        setRefreshing(true);
      }

      try {
        const userId = await getCurrentUserId();
        if (!userId) {
          return;
        }

        const cached = await readCachedReflections(userId);
        setReflections(cached);
        setLoading(false);

        const { data } = await refreshReflections(userId);
        setReflections(data);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [getCurrentUserId],
  );

  useFocusEffect(
    useCallback(() => {
      const shouldShowLoader = !hasLoadedReflectionsRef.current;
      hasLoadedReflectionsRef.current = true;
      fetchReflections({ showLoader: shouldShowLoader });
    }, [fetchReflections]),
  );

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

  const openNew = useCallback(() => {
    setEditItem(null);
    setText('');
    setAudioUri(null);
    setAudioDurationMs(null);
    setShowModal(true);
  }, []);

  useEffect(() => {
    const initialReflectionText = route?.params?.initialReflectionText;
    if (
      typeof initialReflectionText !== 'string' ||
      !initialReflectionText.trim() ||
      lastInitialReflectionTextRef.current === initialReflectionText
    ) {
      return;
    }

    lastInitialReflectionTextRef.current = initialReflectionText;
    setEditItem(null);
    setText(initialReflectionText);
    setAudioUri(null);
    setAudioDurationMs(null);
    setShowModal(true);
  }, [route?.params?.initialReflectionText]);

  const openEdit = useCallback((item: Reflection) => {
    setEditItem(item);
    setText(item.content);
    setAudioUri(item.audio_uri ?? null);
    setAudioDurationMs(item.audio_duration_ms ?? null);
    setShowModal(true);
  }, []);

  const openDetail = useCallback((item: Reflection) => {
    setDetailItem(item);
    setShowDetail(true);
  }, []);

  const closeDetail = useCallback(() => {
    setShowDetail(false);
    setDetailItem(null);
  }, []);

  const handleSave = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed && !audioUri) {
      return;
    }
    setSaving(true);
    const userId = await getCurrentUserId();
    if (!userId) {
      setSaving(false);
      return;
    }

    const result = await saveReflection({
      userId,
      reflection: editItem,
      content: trimmed,
      audioUri,
      audioDurationMs,
      date: editItem?.date ?? new Date().toISOString().split('T')[0],
    });

    setSaving(false);
    setShowModal(false);
    setReflections(result.data);
  }, [audioDurationMs, audioUri, editItem, getCurrentUserId, text]);

  const deleteReflection = useCallback(
    (item: Reflection) => {
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

              const result = await removeReflection({
                userId,
                reflection: item,
              });
              setReflections(result.data);
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

  const keyExtractor = useCallback((item: Reflection) => item.id, []);
  const renderReflection = useCallback(
    ({ item }: { item: Reflection }) => (
      <ReflectionCard
        item={item}
        isNarrowWidth={isNarrowWidth}
        onOpenDetail={openDetail}
        onOpenEdit={openEdit}
        onDelete={deleteReflection}
        themedStyles={themedStyles}
      />
    ),
    [deleteReflection, isNarrowWidth, openDetail, openEdit, themedStyles],
  );

  return (
    <SafeAreaView style={[styles.container, themedStyles.container]} edges={[]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.header} />
      <SpiritualReflectionHeader
        topInsetHeight={insets?.top ?? 0}
        onBack={() => navigation.goBack()}
        onAdd={openNew}
      />

      <View style={[styles.searchRow, themedStyles.searchRow]}>
        <MaterialCommunityIcons
          name="magnify"
          size={18}
          color={colors.mutedText}
        />
        <TextInput
          placeholder={strings.searchPlaceholder}
          placeholderTextColor={colors.mutedText}
          style={[styles.searchInput, themedStyles.searchInput]}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      {loading && reflections.length === 0 ? (
        <ActivityIndicator
          style={styles.loader}
          size="large"
          color={colors.accent}
        />
      ) : (
        <FlatList
          data={filteredReflections}
          keyExtractor={keyExtractor}
          renderItem={renderReflection}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          removeClippedSubviews={Platform.OS === 'android'}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          updateCellsBatchingPeriod={40}
          windowSize={7}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchReflections({ showRefreshing: true })}
              colors={[colors.accent]}
              tintColor={colors.accent}
            />
          }
          ListHeaderComponent={
            shouldShowHero ? (
              <View style={styles.heroCard}>
                <HeroBackground />
                <View style={styles.heroTopRow}>
                  <View style={styles.heroIconWrap}>
                    <MaterialCommunityIcons
                      name="book-open-variant"
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
          ListEmptyComponent={
            <View style={[styles.emptyContainer, themedStyles.emptyContainer]}>
              <View style={[styles.emptyIconWrap, themedStyles.emptyIconWrap]}>
                <MaterialCommunityIcons
                  name="book-open-variant"
                  size={42}
                  color={GOLD}
                />
              </View>
              <Text style={[styles.emptyTitle, themedStyles.emptyTitle]}>
                {strings.emptyTitle}
              </Text>
              <Text style={[styles.emptyTextSmall, themedStyles.emptyTextSmall]}>
                {strings.emptyMessage}
              </Text>
            </View>
          }
        />
      )}

      <ReflectionEditorModal
        visible={showModal}
        keyboardVisible={keyboardVisible}
        topInset={insets.top}
        editMode={Boolean(editItem)}
        text={text}
        audioUri={audioUri}
        audioDurationMs={audioDurationMs}
        saving={saving}
        onClose={() => setShowModal(false)}
        onChangeText={setText}
        onChangeAudio={(nextAudioUri, nextDurationMs) => {
          setAudioUri(nextAudioUri);
          setAudioDurationMs(nextDurationMs);
        }}
        onSave={handleSave}
        themedStyles={themedStyles}
        placeholderTextColor={colors.mutedText}
      />

      <ReflectionDetailModal
        visible={showDetail}
        keyboardVisible={keyboardVisible}
        detailItem={detailItem}
        windowHeight={windowHeight}
        isCompactWidth={isCompactWidth}
        onClose={closeDetail}
        onEdit={openEdit}
        themedStyles={themedStyles}
        onDelete={async item => {
          const userId = await getCurrentUserId();
          if (!userId) {
            return;
          }

          const result = await removeReflection({ userId, reflection: item });
          setReflections(result.data);
          closeDetail();
        }}
      />

      <CustomAlert {...alertConfig} onDismiss={hideAlert} />
    </SafeAreaView>
  );
};

export default SpiritualReflectionScreen;
