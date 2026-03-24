import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StatusBar,
  Text,
  View,
  Keyboard,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import supabase from '../../lib/supbase';
import CustomAlert, { AlertButton } from '../shared/CustomAlert';
import ReflectionCard from './ReflectionCard';
import ReflectionDetailModal from './ReflectionDetailModal';
import ReflectionEditorModal from './ReflectionEditorModal';
import SpiritualReflectionHeader from './SpiritualReflectionHeader';
import { spiritualReflectionStyles as styles, NAVY } from './styles';
import { Reflection } from './types';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const SpiritualReflectionScreen = ({ navigation }: any) => {
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
  const isCompactWidth = windowWidth < 380;
  const isNarrowWidth = windowWidth < 360;

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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />
      <SpiritualReflectionHeader
        topInsetHeight={insets.top}
        onBack={() => navigation.goBack()}
        onAdd={openNew}
      />

      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" color={NAVY} />
      ) : (
        <FlatList
          data={reflections}
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
          const { error } = await supabase
            .from('reflections')
            .delete()
            .eq('id', item.id);
          if (!error) {
            setReflections(prev => prev.filter(r => r.id !== item.id));
          }
        }}
      />

      <CustomAlert {...alertConfig} onDismiss={hideAlert} />
    </SafeAreaView>
  );
};

export default SpiritualReflectionScreen;
