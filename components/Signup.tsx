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
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'; // ← Use this import
// Remove Icon from react-native-paper usage, use IconButton below if you want.
type Props = { navigation: any };

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#0A1124',
    outline: '#EEE',
  },
};

// 1. المكون خارج الـ SignupUI لضمان عدم اختفاء الكيبورد
const CustomInput = ({
  label,
  value,
  onChangeText,
  icon,
  isPassword = false,
  secureText,
  setSecureText,
}: any) => (
  <View style={styles.inputWrapper}>
    <TextInput
      value={value}
      onChangeText={onChangeText}
      mode="outlined"
      placeholder={label}
      secureTextEntry={isPassword ? secureText : false}
      textAlign="right"
      style={styles.inputStyle}
      outlineStyle={styles.inputOutline}
      contentStyle={{ writingDirection: 'rtl' }} // يضمن بداية المؤشر من اليمين
      // استخدم أيقونة مخصصة من vector-icons دائماً
      left={
        isPassword ? (
          <TextInput.Icon
            // use a custom icon node from vector-icons for password
            icon={() => (
              <MaterialCommunityIcons
                name={secureText ? 'eye-off-outline' : 'eye-outline'}
                size={24}
                color="#666"
              />
            )}
            onPress={() => setSecureText(!secureText)}
          />
        ) : (
          <TextInput.Icon
            icon={() => (
              <MaterialCommunityIcons name={icon} size={24} color="#666" />
            )}
          />
        )
      }
    />
  </View>
);

const SignupUI: React.FC<Props> = ({ navigation }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const [secureText, setSecureText] = useState(true);

  return (
    <PaperProvider theme={theme}>
      <SafeAreaView style={styles.container}>
        <StatusBar
          barStyle="light-content"
          translucent
          backgroundColor="transparent"
        />

        {/* الجزء الخلفي الداكن للهيدر */}
        <View style={styles.darkHeaderLayer} />

        {/* الهيدر الثابت */}
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
          <Text style={styles.title}>معلومات الحساب</Text>
          <Text style={styles.headerSubtitle}>
            يرجى ملء المعلومات التالية لإنشاء حسابك بسهولة.
          </Text>

          <View style={styles.stepContainer}>
            <View style={[styles.step, { backgroundColor: '#333' }]} />
            <View style={[styles.step, { backgroundColor: '#FFF' }]} />
          </View>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 40}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
            bounces={false}
            showsVerticalScrollIndicator={false}
          >
            {/* حاوية الفورم البيضاء ذات الحواف المستديرة */}
            <View style={styles.formContainer}>
              <CustomInput
                label="الأسم"
                icon="account-outline"
                value={formData.name}
                onChangeText={(t: string) =>
                  setFormData({ ...formData, name: t })
                }
              />

              <CustomInput
                label="البريد الإلكتروني"
                icon="email-outline"
                value={formData.email}
                onChangeText={(t: string) =>
                  setFormData({ ...formData, email: t })
                }
              />

              <CustomInput
                label="رقم التليفون"
                icon="phone-outline"
                value={formData.phone}
                onChangeText={(t: string) =>
                  setFormData({ ...formData, phone: t })
                }
              />

              <CustomInput
                label="كلمة المرور"
                isPassword={true}
                secureText={secureText}
                setSecureText={setSecureText}
                value={formData.password}
                onChangeText={(t: string) =>
                  setFormData({ ...formData, password: t })
                }
              />

              <CustomInput
                label="تأكيد كلمة المرور"
                isPassword={true}
                secureText={secureText}
                setSecureText={setSecureText}
                value={formData.confirmPassword}
                onChangeText={(t: string) =>
                  setFormData({ ...formData, confirmPassword: t })
                }
              />

              <TouchableOpacity
                style={styles.submitBtn}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('ProfileCompletion')}
              >
                <Text style={styles.submitText}>التالى</Text>
              </TouchableOpacity>

              {/* زر جوجل الإضافي */}
              <TouchableOpacity style={styles.googleButton}>
                <Image
                  source={{ uri: 'https://i.imgur.com/w9vX99X.png' }}
                  style={styles.googleIcon}
                />
                <Text style={styles.googleText}>إنشاء حساب باستخدام جوجل</Text>
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
  stepContainer: { flexDirection: 'row', marginTop: 15 },
  step: { height: 4, width: 45, borderRadius: 2, marginHorizontal: 4 },
  headerSubtitle: {
    color: '#DDD',
    fontSize: 14,
    marginTop: 5,
    textAlign: 'center',
    paddingHorizontal: 30,
  },

  scrollContainer: { flexGrow: 1 },
  formContainer: {
    flex: 1,
    backgroundColor: '#F9F9F9',
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    paddingHorizontal: 25,
    paddingTop: 30,
    paddingBottom: 40, // مساحة إضافية في الأسفل للسكرول
  },
  inputWrapper: { marginBottom: 15 },
  labelRight: {
    textAlign: 'right',
    color: '#666',
    marginBottom: 5,
    fontWeight: '600',
    fontSize: 14,
  },
  inputStyle: { backgroundColor: '#FFF', height: 55, textAlign: 'right' },
  inputOutline: { borderRadius: 12 },
  submitBtn: {
    backgroundColor: '#0A1124',
    height: 55,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    elevation: 2,
  },
  submitText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  googleButton: {
    flexDirection: 'row-reverse',
    height: 55,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DDD',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
    backgroundColor: '#FFF',
  },
  googleIcon: { width: 20, height: 20, marginLeft: 12 },
  googleText: { fontSize: 15, color: '#444' },
});

export default SignupUI;
