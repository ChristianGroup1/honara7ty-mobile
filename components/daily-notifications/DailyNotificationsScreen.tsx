import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import supabase from '../../lib/supbase';
import { scheduleDailyDevotionReminder } from '../../lib/notifications';
import CustomAlert, { AlertButton } from '../shared/CustomAlert';

const NAVY = '#0A1124';
const GOLD = '#C9A84C';

const TIPS = [
  { icon: 'weather-sunset-up', text: 'اختر وقتاً هادئاً في الصباح الباكر قبل بداية اليوم.' },
  { icon: 'map-marker-outline', text: 'اختر مكاناً هادئاً بعيداً عن الضوضاء والمشتتات.' },
  { icon: 'book-open-outline', text: 'ابدأ بقراءة الكتاب المقدس ثم الصلاة والتأمل.' },
  { icon: 'cellphone-off', text: 'أبعد هاتفك أثناء وقت التعبد وركّز على الحضور الإلهي.' },
  { icon: 'timer-outline', text: 'حتى 15 دقيقة يومياً كافية للبدء — الاستمرارية هي المفتاح.' },
];

const DailyNotificationsScreen = ({ navigation, route }: any) => {
  const insets = useSafeAreaInsets();
  /** When opened as a bottom tab there is no stack to go back to. */
  const isTab = route?.name === 'الإعدادات';
  const [devotionTime, setDevotionTime] = useState<Date>(() => {
    const d = new Date();
    d.setHours(7, 0, 0, 0);
    return d;
  });
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
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

  // Load saved devotion time from Supabase profiles table
  useEffect(() => {
    const load = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) { setLoading(false); return; }
      const { data } = await supabase
        .from('profiles')
        .select('devotion_time')
        .eq('id', userId)
        .single();
      if (data?.devotion_time) {
        const [h, m] = (data.devotion_time as string).split(':').map(Number);
        const d = new Date();
        d.setHours(h, m, 0, 0);
        setDevotionTime(d);
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleTimeChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    if (event.type === 'dismissed') { return; }
    if (selected) { setDevotionTime(selected); }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) { setSaving(false); return; }

    const hours = devotionTime.getHours();
    const minutes = devotionTime.getMinutes();
    const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

    // Upsert into profiles table
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: userId, devotion_time: timeString }, { onConflict: 'id' });

    if (error) {
      showAlert('خطأ في الحفظ', error.message);
    } else {
      // Schedule the daily reminder notification
      try {
        await scheduleDailyDevotionReminder(hours, minutes);
      } catch {
        // Notification scheduling is best-effort; don't block saving on failure.
      }

      setSaved(true);
      showAlert(
        'تم الحفظ ✅',
        `تم حفظ وقت تعبّدك: ${timeString}\nهنبعتلك تذكير كل يوم عشان ماتفوتش وقتك مع الله 🙏`,
        undefined,
        'success',
      );
    }
    setSaving(false);
  };

  const timeDisplay = devotionTime.toLocaleTimeString('ar-EG', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  const topInsetStyle = { height: insets.top };
  const saveButtonStyle = saving ? styles.saveBtnDisabled : null;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={NAVY} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />
      <View style={[styles.topInset, topInsetStyle]} />

      <View style={styles.header}>
        {!isTab && (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-right" size={24} color="#FFF" />
          </TouchableOpacity>
        )}
        {isTab && <View style={styles.headerSpacer} />}
        <Text style={styles.headerTitle}>وقت التعبد اليومي</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Time card */}
        <View style={styles.timeCard}>
          <Text style={styles.timeLabel}>وقت تعبّدك المحدد</Text>
          <TouchableOpacity
            style={styles.timePill}
            onPress={() => setShowPicker(true)}
          >
            <MaterialCommunityIcons name="clock-outline" size={24} color={GOLD} />
            <Text style={styles.timeText}>{timeDisplay}</Text>
            <MaterialCommunityIcons name="pencil-outline" size={18} color="#AAA" />
          </TouchableOpacity>
          <Text style={styles.tapHint}>اضغط لتغيير الوقت</Text>
        </View>

        {/* iOS inline picker */}
        {Platform.OS === 'ios' && (
          <DateTimePicker
            value={devotionTime}
            mode="time"
            display="spinner"
            onChange={handleTimeChange}
            locale="ar"
            style={styles.iosPicker}
          />
        )}

        {/* Android modal picker */}
        {showPicker && Platform.OS === 'android' && (
          <DateTimePicker
            value={devotionTime}
            mode="time"
            display="default"
            onChange={handleTimeChange}
          />
        )}

        {/* Save button */}
        <TouchableOpacity
          style={[styles.saveBtn, saveButtonStyle]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#FFF" />
            : <>
                <MaterialCommunityIcons
                  name={saved ? 'check-bold' : 'content-save-outline'}
                  size={20}
                  color="#FFF"
                />
                <Text style={styles.saveBtnText}>حفظ الوقت</Text>
              </>}
        </TouchableOpacity>

        {/* Tips */}
        <Text style={styles.sectionTitle}>نصائح للتعبد الفعّال</Text>
        {TIPS.map((tip, i) => (
          <View key={i} style={styles.tipCard}>
            <MaterialCommunityIcons name={tip.icon} size={28} color={NAVY} style={styles.tipIcon} />
            <Text style={styles.tipText}>{tip.text}</Text>
          </View>
        ))}
      </ScrollView>

      <CustomAlert {...alertConfig} onDismiss={hideAlert} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F4F8' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  topInset: { backgroundColor: NAVY },
  header: {
    backgroundColor: NAVY,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  backBtn: { padding: 4 },
  headerSpacer: { width: 40 },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },

  content: { padding: 20, paddingBottom: 40 },

  timeCard: {
    backgroundColor: NAVY,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  timeLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 14, marginBottom: 12 },
  timePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 50,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  timeText: { color: '#FFF', fontSize: 28, fontWeight: 'bold', letterSpacing: 1 },
  tapHint: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 10 },
  iosPicker: { alignSelf: 'center', marginBottom: 8 },

  saveBtn: {
    backgroundColor: GOLD,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 28,
    elevation: 3,
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },

  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: NAVY,
    textAlign: 'left',
    marginBottom: 12,
  },
  tipCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  tipIcon: { marginLeft: 12 },
  tipText: { flex: 1, fontSize: 14, color: '#444', textAlign: 'left', lineHeight: 22 },
});

export default DailyNotificationsScreen;
