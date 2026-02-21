import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  SafeAreaView,
  KeyboardAvoidingView,
  ScrollView,
  StatusBar,
  Platform,
  TouchableOpacity,
  Dimensions,
  Alert,
  Modal,
} from 'react-native';
import {
  TextInput,
  Provider as PaperProvider,
  DefaultTheme,
  ActivityIndicator,
} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import supabase from '../lib/supbase'; // ← استورد supabase

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, primary: '#0A1124', outline: '#EEE' },
};

const CustomInput = ({
  label,
  value,
  onChangeText,
  icon,
  editable = true,
  onPress,
}: any) => (
  <View style={styles.inputWrapper}>
    <TouchableOpacity activeOpacity={onPress ? 0.7 : 1} onPress={onPress}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        mode="outlined"
        placeholder={label}
        editable={editable && !onPress}
        textAlign="right"
        style={styles.inputStyle}
        outlineStyle={styles.inputOutline}
        contentStyle={{ writingDirection: 'rtl' }}
        left={
          <TextInput.Icon
            icon={() => (
              <MaterialCommunityIcons name={icon} size={24} color="#666" />
            )}
          />
        }
        right={
          icon === 'gender-male-female' ? (
            <TextInput.Icon icon="chevron-down" color="#666" />
          ) : null
        }
      />
    </TouchableOpacity>
  </View>
);

const ProfileCompletionUI: React.FC<any> = ({ navigation, route }) => {
  // ← استقبل userId من Signup
  const { userId } = route?.params || {};

  const [profileData, setProfileData] = useState({
    church: '',
    sect: '',
    birthDate: '',
    gender: '',
  });
  const [loading, setLoading] = useState(false);
  const [showGenderModal, setShowGenderModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // ✅ دالة حفظ البروفايل في Supabase
  const handleCreateAccount = async () => {
    setLoading(true);
    try {
      // ✅ تأكد إن اليوزر logged in فعلاً
      const { data: sessionData } = await supabase.auth.getSession();
      const currentUserId = sessionData?.session?.user?.id;

      console.log('userId from params:', userId);
      console.log('userId from session:', currentUserId);

      // استخدم الـ session userId دايماً أأمن
      const finalUserId = currentUserId || userId;

      if (!finalUserId) {
        Alert.alert('خطأ', 'لازم تسجل دخول الأول');
        return;
      }

      const { error } = await supabase.from('profiles').upsert({
        id: finalUserId, // ← من الـ session مش params
        church: profileData.church || null,
        sect: profileData.sect || null,
        birth_date: profileData.birthDate || null,
        gender: profileData.gender || null,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        console.log('Supabase error:', error);
        Alert.alert('خطأ', error.message);
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: 'HomeScreen' }],
        });
      }
    } catch (err: any) {
      Alert.alert('خطأ', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PaperProvider theme={theme}>
      <SafeAreaView style={styles.container}>
        <StatusBar
          barStyle="light-content"
          translucent
          backgroundColor="transparent"
        />
        <View style={styles.darkHeaderLayer} />

        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <MaterialCommunityIcons
              name="chevron-left"
              size={35}
              color="white"
            />
          </TouchableOpacity>
          <Image
            source={require('../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>إكمال الملف الشخصي</Text>
          <Text style={styles.headerSubtitle}>
            أهلاً وسهلاً في ملفك الشخصي! خلينا نتعرف عليك أكثر.
          </Text>
          <View style={styles.stepContainer}>
            <View style={[styles.step, { backgroundColor: '#FFF' }]} />
            <View style={[styles.step, { backgroundColor: '#FFF' }]} />
          </View>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            <View style={styles.formContainer}>
              <CustomInput
                label="الكنيسة (اختياري)"
                icon="home-variant-outline"
                value={profileData.church}
                onChangeText={(t: string) =>
                  setProfileData({ ...profileData, church: t })
                }
              />

              <CustomInput
                label="الطائفة (اختياري)"
                icon="home-outline"
                value={profileData.sect}
                onChangeText={(t: string) =>
                  setProfileData({ ...profileData, sect: t })
                }
              />

              {/* ✅ تاريخ الميلاد */}
              <CustomInput
                label="تاريخ الميلاد"
                icon="calendar-blank-outline"
                value={profileData.birthDate}
                onPress={() => setShowDatePicker(true)}
              />

              {showDatePicker && (
                <View style={styles.datePickerRow}>
                  {['اليوم', 'الشهر', 'السنة'].map((placeholder, i) => (
                    <TextInput
                      key={i}
                      mode="outlined"
                      placeholder={placeholder}
                      keyboardType="numeric"
                      style={styles.dateInput}
                      outlineStyle={{ borderRadius: 10 }}
                      onChangeText={t => {
                        const parts = profileData.birthDate.split('/');
                        parts[i] = t;
                        setProfileData({
                          ...profileData,
                          birthDate: parts.join('/'),
                        });
                      }}
                    />
                  ))}
                </View>
              )}

              {/* ✅ اختيار النوع */}
              <CustomInput
                label={profileData.gender || 'النوع'}
                icon="gender-male-female"
                value={profileData.gender}
                onPress={() => setShowGenderModal(true)}
              />

              {/* Modal اختيار النوع */}
              <Modal visible={showGenderModal} transparent animationType="fade">
                <TouchableOpacity
                  style={styles.modalOverlay}
                  onPress={() => setShowGenderModal(false)}
                >
                  <View style={styles.modalBox}>
                    {['ذكر', 'أنثى'].map(g => (
                      <TouchableOpacity
                        key={g}
                        style={styles.modalOption}
                        onPress={() => {
                          setProfileData({ ...profileData, gender: g });
                          setShowGenderModal(false);
                        }}
                      >
                        <Text style={styles.modalText}>{g}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </TouchableOpacity>
              </Modal>

              {/* ✅ زرار إنشاء الحساب */}
              <TouchableOpacity
                style={styles.submitBtn}
                activeOpacity={0.8}
                onPress={handleCreateAccount}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.submitText}>إنشاء حساب</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </PaperProvider>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F9F9' },
  darkHeaderLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.4,
    backgroundColor: '#0A1124',
  },
  headerContent: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 40 : 10,
    paddingBottom: 20,
  },
  backBtn: { alignSelf: 'flex-start', marginLeft: 20 },
  logo: { width: 90, height: 90 },
  title: { color: '#FFF', fontSize: 22, fontWeight: 'bold', marginTop: 10 },
  headerSubtitle: {
    color: '#DDD',
    fontSize: 14,
    marginTop: 5,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  stepContainer: { flexDirection: 'row', marginTop: 15 },
  step: { height: 4, width: 45, borderRadius: 2, marginHorizontal: 4 },
  scrollContainer: { flexGrow: 1 },
  formContainer: {
    flex: 1,
    backgroundColor: '#F9F9F9',
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    paddingHorizontal: 25,
    paddingTop: 40,
  },
  inputWrapper: { marginBottom: 15 },
  inputStyle: { backgroundColor: '#FFF', height: 55, textAlign: 'right' },
  inputOutline: { borderRadius: 12 },
  submitBtn: {
    backgroundColor: '#0A1124',
    height: 55,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
    elevation: 2,
  },
  submitText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  datePickerRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  dateInput: { width: '30%', backgroundColor: '#FFF', height: 50 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    paddingVertical: 10,
    width: 200,
  },
  modalOption: {
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  modalText: { fontSize: 18, color: '#0A1124', fontWeight: '600' },
});

export default ProfileCompletionUI;
