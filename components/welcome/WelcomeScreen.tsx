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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { NAVY } from '../bible-memorization/utils';
import { getStrings } from '../../localization';

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
  const strings = getStrings().welcome;
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isCompactHeight = height < 720;
  const isCompactWidth = width < 360;
  const isShortScreen = height < 640;
  const horizontalPadding = Math.max(20, Math.min(width * 0.06, 32));
  const contentTopPadding = Math.max(20, Math.min(height * 0.05, 40));
  const contentBottomPadding = Math.max(
    (insets?.bottom ?? 0) + 38,
    isShortScreen ? 20 : 32,
  );
  const heroSpacerHeight = Math.max(48, Math.min(height * 0.22, 180));
  const panelPadding = isShortScreen ? 20 : 24;
  const titleFontSize = isCompactWidth ? 24 : width < 420 ? 28 : 32;
  const bodyFontSize = isCompactWidth ? 15 : 16;
  const bodyLineHeight = isCompactWidth ? 22 : 24;
  const buttonTextSize = isCompactWidth ? 18 : 20;
  const maxContentWidth = Math.min(width - horizontalPadding * 2, 440);

  const handleLogin = () => {
    navigation.navigate('Login');
  };

  const handleCreateAccount = () => {
    navigation.navigate('SignupStep1');
  };
  const topInsetStyle = { height: insets?.top ?? 0, backgroundColor: NAVY };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />
      <View style={topInsetStyle} />
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
            {
              paddingHorizontal: horizontalPadding,
              paddingTop: contentTopPadding,
              paddingBottom: contentBottomPadding,
            },
          ]}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={{ height: heroSpacerHeight }} />

          <View
            style={[
              styles.contentPanel,
              {
                maxWidth: maxContentWidth,
                padding: panelPadding,
              },
              isCompactHeight ? styles.contentPanelCompactHeight : null,
            ]}
          >
            {/* Welcome text */}
            <View style={styles.textContainer}>
              <Text style={[styles.welcomeTitle, { fontSize: titleFontSize }]}>
                {strings.title}
              </Text>

              {strings.description.map(line => (
                <Text
                  key={line}
                  style={[
                    styles.description,
                    { fontSize: bodyFontSize, lineHeight: bodyLineHeight },
                  ]}
                >
                  {line}
                </Text>
              ))}
            </View>

            {/* Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.loginButton}
                onPress={handleLogin}
              >
                <Text
                  style={[styles.loginButtonText, { fontSize: buttonTextSize }]}
                >
                  {strings.login}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.createAccountButton}
                onPress={handleCreateAccount}
              >
                <Text
                  style={[
                    styles.createAccountButtonText,
                    { fontSize: buttonTextSize },
                  ]}
                >
                  {strings.createAccount}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </ImageBackground>
    </>
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
    flexGrow: 1,
    justifyContent: 'flex-end',
    minHeight: '100%',
  },
  contentPanel: {
    width: '100%',
    alignSelf: 'center',
    backgroundColor: 'rgba(12, 17, 33, 0.58)',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  contentPanelCompactHeight: {
    borderRadius: 22,
  },
  textContainer: {
    width: '100%',
    marginBottom: 24,
  },
  welcomeTitle: {
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'left',
    marginBottom: 12,
  },
  description: {
    color: '#FFFFFF',
    textAlign: 'left',
    marginBottom: 4,
    fontFamily: 'System',
  },
  buttonContainer: {
    width: '100%',
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
    fontWeight: '600',
    fontFamily: 'System',
  },
});

export default WelcomeScreen;
