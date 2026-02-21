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
} from 'react-native';
import {
  TextInput,
  Provider as PaperProvider,
  DefaultTheme,
} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#0A1124',
    outline: '#EEE',
  },
};

// مكون الإدخال الموحد (نفس الستايل للشاشة الأولى)
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
        // إضافة سهم لأسفل في حالة اختيار "النوع"
        right={
          icon === 'gender-male-female' ? (
            <TextInput.Icon icon="chevron-down" color="#666" />
          ) : null
        }
      />
    </TouchableOpacity>
  </View>
);

const ProfileCompletionUI: React.FC<any> = ({ navigation }) => {
  const [profileData, setProfileData] = useState({
    church: '',
    sect: '',
    birthDate: '',
    gender: '',
  });

  return (
    <PaperProvider theme={theme}>
      <SafeAreaView style={styles.container}>
        <StatusBar
          barStyle="light-content"
          translucent
          backgroundColor="transparent"
        />

        <View style={styles.darkHeaderLayer} />

        {/* الهيدر مع زر الرجوع */}
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

          {/* شريط الخطوات - الحالة الثانية */}
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
            showsVerticalScrollIndicator={false}
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

              <CustomInput
                label="تاريخ الميلاد (dd/mm/yy)"
                icon="calendar-blank-outline"
                value={profileData.birthDate}
                // هنا يمكن ربط الـ DatePicker مستقبلاً
                onPress={() => console.log('Open Date Picker')}
              />

              <CustomInput
                label="النوع"
                icon="gender-male-female"
                value={profileData.gender}
                // هنا يمكن فتح Modal للاختيار
                onPress={() => console.log('Open Gender Selector')}
              />

              <TouchableOpacity style={styles.submitBtn} activeOpacity={0.8}>
                <Text style={styles.submitText}>إنشاء حساب</Text>
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
});

export default ProfileCompletionUI;
