import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';

type RootStackParamList = {
  Welcome: undefined;
  SignupStep1: undefined;
  Login: undefined;
  // Add other screens here
};

type WelcomeScreenProps = {
  navigation: StackNavigationProp<RootStackParamList, 'Welcome'>;
};

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ navigation }) => {
  const { width, height } = useWindowDimensions();
  const isCompactHeight = height < 720;
  const isCompactWidth = width < 360;

  const handleLogin = () => {
    navigation.navigate('Login');
  };

  const handleCreateAccount = () => {
    navigation.navigate('SignupStep1');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      <ImageBackground
        source={require('../../assets/images/bibleBackground.png')}
        style={[styles.backgroundImage, { width, minHeight: height }]}
        resizeMode="cover"
      >
        {/* Dark overlay */}
        <View style={styles.overlay} />

        {/* Content */}
        <ScrollView
          contentContainerStyle={[
            styles.content,
            isCompactHeight ? styles.contentCompactHeight : null,
          ]}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Welcome text */}
          <View
            style={[
              styles.textContainer,
              isCompactHeight ? styles.textContainerCompactHeight : null,
            ]}
          >
            <Text
              style={[
                styles.welcomeTitle,
                isCompactWidth ? styles.welcomeTitleCompactWidth : null,
              ]}
            >
              أهلاً بيك في هنا راحتي
            </Text>

            <Text
              style={[
                styles.description,
                isCompactWidth ? styles.descriptionCompactWidth : null,
              ]}
            >
              إحنا فرحانين إنك معانا. التطبيق ده معمول عشان
            </Text>
            <Text
              style={[
                styles.description,
                isCompactWidth ? styles.descriptionCompactWidth : null,
              ]}
            >
              يكون مكانك الخاص تتواصل فيه مع يسوع
            </Text>
            <Text
              style={[
                styles.description,
                isCompactWidth ? styles.descriptionCompactWidth : null,
              ]}
            >
              وتلاقي السلام والراحة اللي نفسك فيها.
            </Text>
          </View>

          {/* Buttons */}
          <View
            style={[
              styles.buttonContainer,
              isCompactWidth ? styles.buttonContainerCompactWidth : null,
            ]}
          >
            <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
              <Text style={styles.loginButtonText}>تسجيل الدخول</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.createAccountButton}
              onPress={handleCreateAccount}
            >
              <Text style={styles.createAccountButtonText}>
                إنشاء حساب جديد
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </ImageBackground>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(12, 17, 33, 0.7)',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 56,
    minHeight: '100%',
  },
  contentCompactHeight: {
    paddingTop: 36,
    paddingBottom: 32,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
  },
  textContainerCompactHeight: {
    justifyContent: 'center',
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'left',
  },
  welcomeTitleCompactWidth: {
    fontSize: 24,
  },
  description: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'left',
    lineHeight: 24,
    marginBottom: 4,
    fontFamily: 'System',
  },
  descriptionCompactWidth: {
    fontSize: 15,
    lineHeight: 22,
  },
  buttonContainer: {
    width: '100%',
    paddingHorizontal: 20,
  },
  buttonContainerCompactWidth: {
    paddingHorizontal: 8,
  },
  loginButton: {
    backgroundColor: '#0C1121',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'System',
  },
  createAccountButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.27)',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  createAccountButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    fontFamily: 'System',
  },
});

export default WelcomeScreen;
