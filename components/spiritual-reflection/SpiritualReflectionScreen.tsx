import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
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
import ReflectionCard from './ReflectionCard';
import ReflectionDetailModal from './ReflectionDetailModal';
import ReflectionEditorModal from './ReflectionEditorModal';
import SpiritualReflectionHeader from './SpiritualReflectionHeader';
import { spiritualReflectionStyles as styles, GOLD, NAVY } from './styles';
import { Reflection } from './types';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { getStrings } from '../../localization';
import {
  deleteReflection as removeReflection,
  refreshReflections,
  saveReflection,
} from '../../lib/offlineSync';

const SpiritualReflectionScreen = ({ navigation }: any) => {
  const strings = getStrings().spiritualReflection;
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
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
  const [query, setQuery] = useState('');
  const isCompactWidth = windowWidth < 380;
  const isNarrowWidth = windowWidth < 360;
  const latestReflection = reflections[0] ?? null;
  const filteredReflections = reflections.filter(reflection =>
    reflection.content.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const shouldShowHero = query.trim().length === 0 && !keyboardVisible;

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
    const { data } = await refreshReflections(userId);
    setReflections(data);
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

    const result = await saveReflection({
      userId,
      reflection: editItem,
      content: trimmed,
      date: editItem?.date ?? new Date().toISOString().split('T')[0],
    });

    setSaving(false);
    setShowModal(false);
    setReflections(result.data);
  };

  const deleteReflection = (item: Reflection) => {
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

            const result = await removeReflection({ userId, reflection: item });
            setReflections(result.data);
          },
        },
      ],
      'warning',
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />
      <SpiritualReflectionHeader
        topInsetHeight={insets.top}
        onBack={() => navigation.goBack()}
        onAdd={openNew}
      />

      <View style={styles.searchRow}>
        <MaterialCommunityIcons name="magnify" size={18} color="#8A94A6" />
        <TextInput
          placeholder={strings.searchPlaceholder}
          placeholderTextColor="#8A94A6"
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" color={NAVY} />
      ) : (
        <FlatList
          data={filteredReflections}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <ReflectionCard
              item={item}
              isNarrowWidth={isNarrowWidth}
              onOpenDetail={openDetail}
              onOpenEdit={openEdit}
              onDelete={deleteReflection}
            />
          )}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            shouldShowHero ? (
              <View style={styles.heroCard}>
                <View style={styles.heroGlow} />
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
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconWrap}>
                <MaterialCommunityIcons
                  name="book-open-variant"
                  size={42}
                  color={GOLD}
                />
              </View>
              <Text style={styles.emptyTitle}>{strings.emptyTitle}</Text>
              <Text style={styles.emptyTextSmall}>{strings.emptyMessage}</Text>
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
        saving={saving}
        onClose={() => setShowModal(false)}
        onChangeText={setText}
        onSave={handleSave}
      />

      <ReflectionDetailModal
        visible={showDetail}
        keyboardVisible={keyboardVisible}
        detailItem={detailItem}
        windowHeight={windowHeight}
        isCompactWidth={isCompactWidth}
        onClose={closeDetail}
        onEdit={openEdit}
        onDelete={async item => {
          const { data: sessionData } = await supabase.auth.getSession();
          const userId = sessionData?.session?.user?.id;
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
