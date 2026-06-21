import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { AppTheme, useNightMode } from '../../lib/nightMode';
import AppHeader, { AppHeaderAction } from '../shared/AppHeader';
import { palette, radius, shadow, spacing } from '../shared/designTokens';

const MY_SERVICES_KEY = 'honara7ty:my-services';

interface ServiceDraft {
  id: string;
  title: string;
  content: string;
  versesText?: string;
  versesReference?: string;
  createdAt: string;
  updatedAt: string;
}

interface IncomingServiceVerse {
  text: string;
  reference: string;
}

const createEmptyService = (
  initialVerse?: IncomingServiceVerse,
): ServiceDraft => {
  const now = new Date().toISOString();
  return {
    id: `local-${Date.now()}`,
    title: '',
    content: '',
    versesText: initialVerse?.text,
    versesReference: initialVerse?.reference,
    createdAt: now,
    updatedAt: now,
  };
};

const MyServicesScreen = ({ navigation, route }: any) => {
  const insets = useSafeAreaInsets();
  const { colors } = useNightMode();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const lastInitialVerseRef = useRef<string | null>(null);
  const [services, setServices] = useState<ServiceDraft[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<ServiceDraft>(() => createEmptyService());

  const saveServices = useCallback(async (nextServices: ServiceDraft[]) => {
    setServices(nextServices);
    await AsyncStorage.setItem(MY_SERVICES_KEY, JSON.stringify(nextServices));
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(MY_SERVICES_KEY)
      .then(raw => {
        if (raw) {
          setServices(JSON.parse(raw));
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const initialVerse = route?.params?.initialServiceVerse as
      | IncomingServiceVerse
      | undefined;
    const signature = initialVerse
      ? `${initialVerse.reference}\n${initialVerse.text}`
      : null;

    if (
      !initialVerse ||
      !signature ||
      lastInitialVerseRef.current === signature
    ) {
      return;
    }

    lastInitialVerseRef.current = signature;
    setDraft(createEmptyService(initialVerse));
    setEditorOpen(true);
  }, [route?.params?.initialServiceVerse]);

  const openNew = () => {
    setDraft(createEmptyService());
    setEditorOpen(true);
  };

  const openEdit = (item: ServiceDraft) => {
    setDraft(item);
    setEditorOpen(true);
  };

  const updateDraft = (patch: Partial<ServiceDraft>) => {
    setDraft(current => ({ ...current, ...patch }));
  };

  const applyFormatting = (kind: 'heading' | 'bold' | 'bullet') => {
    setDraft(current => {
      const content = current.content.trimEnd();
      const prefix = content ? `${content}\n` : '';
      const nextText =
        kind === 'heading'
          ? `${prefix}# عنوان الفكرة\n`
          : kind === 'bold'
          ? `${prefix}**نقطة مهمة** `
          : `${prefix}- نقطة\n`;
      return { ...current, content: nextText };
    });
  };

  const saveDraft = async () => {
    const title = draft.title.trim() || 'خدمة بدون عنوان';
    const content = draft.content.trim();
    if (!content && !draft.versesText) {
      return;
    }

    const nextDraft = {
      ...draft,
      title,
      content,
      updatedAt: new Date().toISOString(),
    };
    const exists = services.some(item => item.id === nextDraft.id);
    const nextServices = exists
      ? services.map(item => (item.id === nextDraft.id ? nextDraft : item))
      : [nextDraft, ...services];

    await saveServices(nextServices);
    setEditorOpen(false);
  };

  const deleteService = async (serviceId: string) => {
    await saveServices(services.filter(item => item.id !== serviceId));
  };

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.header} />
      <AppHeader
        topInsetHeight={insets.top}
        title="خدماتي"
        leading={
          <AppHeaderAction
            icon="chevron-right"
            onPress={() => navigation.goBack()}
          />
        }
        trailing={<AppHeaderAction icon="plus" onPress={openNew} />}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {services.length ? (
          services.map(item => (
            <TouchableOpacity
              key={item.id}
              style={styles.serviceCard}
              activeOpacity={0.86}
              onPress={() => openEdit(item)}
            >
              <View style={styles.serviceHeader}>
                <Text style={styles.serviceTitle}>{item.title}</Text>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => deleteService(item.id)}
                >
                  <MaterialCommunityIcons
                    name="trash-can-outline"
                    size={18}
                    color={colors.mutedText}
                  />
                </TouchableOpacity>
              </View>
              {item.versesReference ? (
                <Text style={styles.serviceReference}>
                  {item.versesReference}
                </Text>
              ) : null}
              <Text style={styles.servicePreview} numberOfLines={3}>
                {item.content || item.versesText}
              </Text>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name="notebook-edit-outline"
              size={46}
              color={colors.accent}
            />
            <Text style={styles.emptyTitle}>ابدأ كتابة خدمتك</Text>
            <Text style={styles.emptyText}>
              اختار آيات من القارئ أو ابدأ خدمة جديدة واكتب أفكارك.
            </Text>
          </View>
        )}
      </ScrollView>

      <Modal visible={editorOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.editorBox}>
            <Text style={styles.modalTitle}>كتابة خدمة</Text>
            <TextInput
              value={draft.title}
              onChangeText={value => updateDraft({ title: value })}
              placeholder="عنوان الخدمة"
              placeholderTextColor={colors.mutedText}
              style={styles.titleInput}
              textAlign="right"
            />
            {draft.versesReference ? (
              <View style={styles.versesBox}>
                <Text style={styles.serviceReference}>
                  {draft.versesReference}
                </Text>
                <Text style={styles.versesText}>{draft.versesText}</Text>
              </View>
            ) : null}
            <View style={styles.formatToolbar}>
              <TouchableOpacity
                style={styles.formatButton}
                onPress={() => applyFormatting('heading')}
              >
                <Text style={styles.formatButtonText}>عنوان</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.formatButton}
                onPress={() => applyFormatting('bold')}
              >
                <Text style={styles.formatButtonText}>غامق</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.formatButton}
                onPress={() => applyFormatting('bullet')}
              >
                <Text style={styles.formatButtonText}>نقطة</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              value={draft.content}
              onChangeText={value => updateDraft({ content: value })}
              placeholder="اكتب أفكار الخدمة هنا..."
              placeholderTextColor={colors.mutedText}
              multiline
              style={styles.contentInput}
              textAlign="right"
              textAlignVertical="top"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setEditorOpen(false)}
              >
                <Text style={styles.cancelButtonText}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={saveDraft}>
                <Text style={styles.saveButtonText}>حفظ الخدمة</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const createStyles = (colors: AppTheme['colors']) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.lg, paddingBottom: 120, gap: spacing.md },
    serviceCard: {
      ...shadow.card,
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      gap: spacing.sm,
    },
    serviceHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    serviceTitle: {
      flex: 1,
      color: colors.text,
      fontSize: 17,
      fontWeight: '900',
      textAlign: 'left',
      writingDirection: 'rtl',
    },
    deleteButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.cardMuted,
    },
    serviceReference: {
      color: colors.accent,
      fontSize: 12,
      fontWeight: '900',
      textAlign: 'left',
      writingDirection: 'rtl',
    },
    servicePreview: {
      color: colors.mutedText,
      fontSize: 14,
      lineHeight: 22,
      fontWeight: '700',
      textAlign: 'left',
      writingDirection: 'rtl',
    },
    emptyState: {
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.xxxl,
    },
    emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '900' },
    emptyText: {
      color: colors.mutedText,
      fontSize: 14,
      lineHeight: 22,
      textAlign: 'center',
      writingDirection: 'rtl',
    },
    modalOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(10,17,36,0.42)',
    },
    editorBox: {
      maxHeight: '90%',
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: spacing.lg,
      gap: spacing.md,
    },
    modalTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '900',
      textAlign: 'left',
      writingDirection: 'rtl',
    },
    titleInput: {
      minHeight: 48,
      borderRadius: 16,
      backgroundColor: colors.cardMuted,
      color: colors.text,
      paddingHorizontal: spacing.md,
      fontSize: 15,
      fontWeight: '800',
      writingDirection: 'rtl',
    },
    versesBox: {
      borderRadius: 16,
      backgroundColor: `${palette.accent}14`,
      padding: spacing.md,
      gap: spacing.xs,
    },
    versesText: {
      color: colors.text,
      fontSize: 14,
      lineHeight: 23,
      fontWeight: '700',
      textAlign: 'left',
      writingDirection: 'rtl',
    },
    formatToolbar: { flexDirection: 'row', gap: spacing.sm },
    formatButton: {
      borderRadius: 14,
      backgroundColor: colors.cardMuted,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    formatButtonText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '900',
    },
    contentInput: {
      minHeight: 180,
      borderRadius: 16,
      backgroundColor: colors.cardMuted,
      color: colors.text,
      padding: spacing.md,
      fontSize: 15,
      lineHeight: 24,
      fontWeight: '700',
      writingDirection: 'rtl',
    },
    modalActions: { flexDirection: 'row', gap: spacing.sm },
    cancelButton: {
      flex: 1,
      minHeight: 48,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.cardMuted,
    },
    cancelButtonText: { color: colors.text, fontWeight: '900' },
    saveButton: {
      flex: 1,
      minHeight: 48,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.header,
    },
    saveButtonText: { color: '#FFF', fontWeight: '900' },
  });

export default MyServicesScreen;
