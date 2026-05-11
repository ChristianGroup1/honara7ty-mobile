import React from 'react';
import {
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { AUTH_GOLD, AUTH_NAVY } from './theme';
import { getAuthChromeMetrics } from './layout';

type HeaderVisual =
  | { type: 'logo' }
  | { type: 'icon'; name: string; color?: string };

type AuthScreenShellProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onBack?: () => void;
  showBackButton?: boolean;
  headerVisual?: HeaderVisual;
  headerExtras?: React.ReactNode;
  formBackgroundColor?: string;
  containerBackgroundColor?: string;
  formPointerEvents?: 'auto' | 'none' | 'box-none' | 'box-only';
  scrollProps?: React.ComponentProps<typeof KeyboardAwareScrollView>;
};

const AuthScreenShell: React.FC<AuthScreenShellProps> = ({
  title,
  subtitle,
  children,
  onBack,
  showBackButton = true,
  headerVisual = { type: 'logo' },
  headerExtras,
  formBackgroundColor = '#fff',
  containerBackgroundColor = '#0A1124',
  formPointerEvents,
  scrollProps,
}) => {
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const authChrome = getAuthChromeMetrics({
    height,
    width,
    topInset: insets?.top ?? 0,
  });

  const {
    contentContainerStyle,
    children: scrollChildren,
    ...restScrollProps
  } = scrollProps ?? {};

  return (
    <View
      style={[styles.container, { backgroundColor: containerBackgroundColor }]}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor={containerBackgroundColor}
      />

      <View
        style={[
          styles.darkHeaderLayer,
          {
            height: authChrome.headerHeight,
            backgroundColor: containerBackgroundColor,
          },
        ]}
      />

      <View
        style={[
          styles.headerContent,
          {
            paddingTop: authChrome.headerPaddingTop,
            paddingBottom: authChrome.headerPaddingBottom,
          },
        ]}
      >
        <View style={styles.headerTopRow}>
          {showBackButton && onBack ? (
            <TouchableOpacity
              style={[
                styles.backBtn,
                { marginRight: authChrome.backButtonOffset },
              ]}
              onPress={onBack}
            >
              <View style={styles.backBtnCircle}>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={24}
                  color={'#fff'}
                />
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.backBtnSpacer} />
          )}
        </View>

        <View style={styles.headerCard}>
          {headerVisual.type === 'logo' ? (
            <View>
              <Image
                source={require('../../assets/images/logo.png')}
                style={[
                  styles.logo,
                  { width: authChrome.logoSize, height: authChrome.logoSize },
                ]}
                resizeMode="contain"
              />
            </View>
          ) : (
            <View
              style={[
                styles.iconCircleHeader,
                {
                  width: authChrome.heroIconSize,
                  height: authChrome.heroIconSize,
                  borderRadius: authChrome.heroIconSize / 2,
                },
              ]}
            >
              <MaterialCommunityIcons
                name={headerVisual.name}
                size={authChrome.heroIconGlyphSize}
                color={headerVisual.color ?? '#F4EFE3'}
              />
            </View>
          )}

          <Text style={[styles.title, { fontSize: authChrome.titleFontSize }]}>
            {title}
          </Text>
          {subtitle ? (
            <Text
              style={[
                styles.headerSubtitle,
                { paddingHorizontal: authChrome.subtitleHorizontalPadding },
              ]}
            >
              {subtitle}
            </Text>
          ) : null}
          {headerExtras}
        </View>
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={[styles.scrollContainer, contentContainerStyle]}
        keyboardShouldPersistTaps="handled"
        bounces={false}
        showsVerticalScrollIndicator={false}
        overScrollMode="never"
        decelerationRate="normal"
        enableOnAndroid
        extraScrollHeight={80}
        extraHeight={18}
        keyboardOpeningTime={0}
        {...restScrollProps}
      >
        {scrollChildren}
        <View
          style={[
            styles.formContainer,
            {
              backgroundColor: formBackgroundColor,
              borderTopLeftRadius: authChrome.formRadius,
              borderTopRightRadius: authChrome.formRadius,
              paddingHorizontal: authChrome.formHorizontalPadding,
              paddingTop: authChrome.formTopPadding,
              paddingBottom: authChrome.formBottomPadding,
            },
            styles.formFill,
          ]}
          pointerEvents={formPointerEvents}
        >
          {children}
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  darkHeaderLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  headerContent: {
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 18,
  },
  headerTopRow: {
    width: '100%',
    minHeight: 0,
  },
  backBtn: {
    alignSelf: 'flex-start',
  },
  backBtnCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnSpacer: {
    height: 42,
    width: 42,
    alignSelf: 'flex-end',
  },
  headerCard: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 4,
    borderRadius: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderColor: 'transparent',
  },
  visualBadge: {
    width: 78,
    height: 78,
    borderRadius: 22,
    backgroundColor: AUTH_NAVY,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#D7C6A0',
  },
  logo: {
    marginTop: 0,
  },
  iconCircleHeader: {
    backgroundColor: AUTH_NAVY,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#D7C6A0',
  },
  title: {
    color: '#fff',
    fontWeight: '800',
    marginTop: 0,
    letterSpacing: 0.5,
    textAlign: 'center',
    paddingTop: 16,
  },
  titleAccent: {
    width: 52,
    height: 5,
    borderRadius: 999,
    backgroundColor: AUTH_GOLD,
    marginTop: 6,
  },
  headerSubtitle: {
    color: '#5E6472',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  formContainer: {
    marginTop: 2,
    shadowColor: '#A69B85',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#ECE3D6',
  },
  formFill: {
    height: '100%',
  },
});

export default AuthScreenShell;
