import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  I18nManager,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import supabase from '../../lib/supbase';
import { hasSeenNotificationPermissionPrompt } from '../../lib/notificationPermissionFlow';

import { getStrings } from '../../localization';
import type { OnboardingSlide } from '../../localization/modules/onboarding';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type Slide = OnboardingSlide;

const WHITE = '#FFFFFF';
const PAPER = '#FBFBFA';
const TEXT = '#4F5562';
const TITLE = '#3F4653';
const SHADOW = '#9197A3';
const MIST = '#D5DCE6';
const NAVY = '#0A1124';
const SHEET_HEIGHT = Math.max(SCREEN_HEIGHT * 0.34, 290);
const VIEWABILITY_CONFIG = { viewAreaCoveragePercentThreshold: 60 };

const THEMES = [
  {
    background: '#0C1121',
    accent: '#C9A84C',
    secondary: 'rgba(255,255,255,0.16)',
    icon: 'book-open-page-variant',
    label: 'بداية هادئة',
    intro: true,
  },
  {
    background: '#0C1121',
    accent: '#76A9FA',
    secondary: 'rgba(255,255,255,0.16)',
    icon: 'headphones',
    label: 'رسالة يومية',
    intro: false,
  },
  {
    background: '#0C1121',
    accent: '#7FD6B3',
    secondary: 'rgba(255,255,255,0.16)',
    icon: 'calendar',
    label: 'ثبات عملي',
    intro: false,
  },
] as const;

const HeroArtwork = ({
  icon,
  accent,
  label,
  index,
}: {
  icon: string;
  accent: string;
  label: string;
  index: number;
}) => {
  const badgeRotation = index % 2 === 0 ? '10deg' : '-10deg';

  return (
    <View style={styles.heroArtwork}>
      <View style={styles.heroGlowLarge} />
      <View
        style={[styles.heroGlowSmall, { backgroundColor: accent + '33' }]}
      />
      <View style={styles.dotClusterTop} />
      <View style={styles.ringTopRight} />
      <View style={styles.ringBottomLeft} />
      <View style={styles.heroPill}>
        <MaterialCommunityIcons name={icon} size={16} color={accent} />
        <Text style={styles.heroPillText}>{label}</Text>
      </View>

      <View style={styles.photoShadow} />

      <View style={[styles.photoCard]}>
        <Image
          source={require('../../assets/images/logo.png')}
          style={styles.heroLogo}
          resizeMode="contain"
        />
      </View>

      <View
        style={[
          styles.heroBadge,
          {
            backgroundColor: accent,
            transform: [{ rotate: badgeRotation }],
          },
        ]}
      >
        <MaterialCommunityIcons name={icon} size={26} color="#FFFFFF" />
      </View>
    </View>
  );
};

type Props = {
  navigation: any;
  route?: {
    params?: {
      inApp?: boolean;
    };
  };
};

const OnboardingScreen: React.FC<Props> = ({ navigation, route }) => {
  const strings = getStrings().onboarding;
  const slides = strings.slides;
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<Slide>>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const inApp = route?.params?.inApp === true;

  useEffect(() => {
    const currentSlide = slides[currentIndex];
    if (!currentSlide) {
      return;
    }
  }, [currentIndex, slides]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const nextIndex = viewableItems[0]?.index;
      if (typeof nextIndex === 'number') {
        setCurrentIndex(nextIndex);
      }
    },
  ).current;

  const goTo = (index: number) => {
    setCurrentIndex(index);
    listRef.current?.scrollToIndex({ index, animated: true });
  };

  const getItemLayout = (
    _data: ArrayLike<Slide> | null | undefined,
    index: number,
  ) => ({
    length: SCREEN_WIDTH,
    offset: SCREEN_WIDTH * index,
    index,
  });

  const handleFinish = async () => {
    if (inApp) {
      navigation.goBack();
      return;
    }

    setFinishing(true);

    const { data } = await supabase.auth.getSession();
    const userId = data?.session?.user?.id;
    const seenPermissionPrompt = await hasSeenNotificationPermissionPrompt(
      userId,
    );
    const nextRoute = seenPermissionPrompt
      ? 'MainTabs'
      : 'NotificationPermission';

    if (__DEV__) {
      console.warn('[Onboarding] finish routing', {
        userId: userId ?? null,
        seenPermissionPrompt,
        nextRoute,
      });
    }

    setFinishing(false);
    navigation.reset({
      index: 0,
      routes: [{ name: nextRoute }],
    });
  };

  const goNext = () => {
    if (currentIndex < slides.length - 1) {
      goTo(currentIndex + 1);
      return;
    }
    handleFinish();
  };

  const skipToLast = () => {
    if (currentIndex === slides.length - 1) {
      handleFinish();
      return;
    }
    goTo(slides.length - 1);
  };

  const renderSlide = ({ item, index }: { item: Slide; index: number }) => {
    const theme = THEMES[index % THEMES.length];

    return (
      <View style={[styles.slide, { backgroundColor: theme.background }]}>
        <View
          style={[
            styles.topArea,
            {
              paddingTop: (insets?.top ?? 0) + 10,
              paddingBottom: SHEET_HEIGHT - 26,
            },
          ]}
        >
          <HeroArtwork
            icon={theme.icon}
            accent={theme.accent}
            label={theme.label}
            index={index}
          />
        </View>

        <View
          style={[
            styles.bottomCard,
            {
              paddingBottom: Math.max(insets.bottom, 18) + 10,
            },
          ]}
        >
          <View style={styles.contentBlock}>
            <View style={styles.dotsRow}>
              {slides.map((_, dotIndex) => (
                <View
                  key={dotIndex}
                  style={[
                    styles.dot,
                    dotIndex === currentIndex
                      ? [styles.dotActive, { backgroundColor: theme.accent }]
                      : null,
                  ]}
                />
              ))}
            </View>

            {item.title ? <Text style={styles.title}>{item.title}</Text> : null}

            {item.body ? (
              <Text style={[styles.body, !item.title ? styles.bodyLead : null]}>
                {item.body}
              </Text>
            ) : null}

            {item.verse ? (
              <View style={styles.verseWrap}>
                <Text style={styles.verseText}>{item.verse}</Text>
                <Text style={styles.verseRef}>{item.verseRef}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              onPress={skipToLast}
              disabled={finishing}
              activeOpacity={0.8}
            >
              <Text style={styles.skipText}>{strings.skip}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.nextButton, { backgroundColor: theme.accent }]}
              onPress={goNext}
              disabled={finishing}
              activeOpacity={0.88}
            >
              {finishing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <MaterialCommunityIcons
                  name={
                    currentIndex === slides.length - 1 ? 'check' : 'arrow-left'
                  }
                  size={22}
                  color="#FFFFFF"
                />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const backButtonWrapStyle = React.useMemo(
    () =>
      StyleSheet.compose(styles.backButtonWrap, {
        top: (insets?.top ?? 0) + 18,
      }),
    [insets.top],
  );

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle={'light-content'}
        translucent
        backgroundColor="transparent"
      />

      <FlatList
        ref={listRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={item => item.key}
        getItemLayout={getItemLayout}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={VIEWABILITY_CONFIG}
        initialNumToRender={1}
        maxToRenderPerBatch={2}
        windowSize={3}
        scrollEnabled={!finishing}
      />

      {inApp ? (
        <View style={backButtonWrapStyle}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons
              name={I18nManager.isRTL ? 'arrow-right' : 'arrow-left'}
              size={22}
              color={'#fff'}
            />
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: PAPER,
  },
  backButtonWrap: {
    position: 'absolute',
    zIndex: 120,
    elevation: 30,
    left: 16,
  },
  backButton: {
    width: 40,
    height: 40,

    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slide: {
    width: SCREEN_WIDTH,
    minHeight: SCREEN_HEIGHT,
    overflow: 'hidden',
  },
  topArea: {
    flex: 1,
    paddingHorizontal: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeText: {
    color: '#111111',
    fontSize: 16,
    fontWeight: '800',
  },
  statusIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  introArtwork: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  introLogo: {
    width: SCREEN_WIDTH * 0.46,
    height: SCREEN_WIDTH * 0.46,
  },
  heroArtwork: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroGlowLarge: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.08,
    alignSelf: 'center',
    width: SCREEN_WIDTH * 0.62,
    height: SCREEN_WIDTH * 0.62,
    borderRadius: SCREEN_WIDTH * 0.31,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroGlowSmall: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.2,
    right: SCREEN_WIDTH * 0.16,
    width: 110,
    height: 110,
    borderRadius: 55,
  },
  dotClusterTop: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.12,
    left: SCREEN_WIDTH * 0.14,
    width: 64,
    height: 64,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  ringTopRight: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.06,
    right: -SCREEN_WIDTH * 0.08,
    width: SCREEN_WIDTH * 0.26,
    height: SCREEN_WIDTH * 0.26,
    borderRadius: SCREEN_WIDTH * 0.13,
    borderWidth: 14,
    borderColor: WHITE,
    backgroundColor: 'transparent',
  },
  ringBottomLeft: {
    position: 'absolute',
    bottom: SCREEN_HEIGHT * 0.04,
    left: -SCREEN_WIDTH * 0.09,
    width: SCREEN_WIDTH * 0.24,
    height: SCREEN_WIDTH * 0.24,
    borderRadius: SCREEN_WIDTH * 0.12,
    borderWidth: 12,
    borderColor: WHITE,
    backgroundColor: 'transparent',
  },
  photoShadow: {
    position: 'absolute',
    bottom: SCREEN_HEIGHT * 0.09,
    width: SCREEN_WIDTH * 0.42,
    height: 28,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  photoCard: {
    width: SCREEN_WIDTH * 0.44,
    height: SCREEN_WIDTH * 0.44,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.24,
    shadowRadius: 20,
    elevation: 10,
  },
  photoCardInner: {
    position: 'absolute',
    inset: 14,
    borderRadius: 22,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  heroLogo: {
    width: SCREEN_WIDTH * 0.3,
    height: SCREEN_WIDTH * 0.3,
  },
  heroPill: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.12,
    left: SCREEN_WIDTH * 0.05,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.94)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 6,
  },
  heroPillText: {
    color: NAVY,
    fontSize: 13,
    fontWeight: '800',
  },
  heroBadge: {
    position: 'absolute',
    right: SCREEN_WIDTH * 0.11,
    top: SCREEN_HEIGHT * 0.46,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 7,
  },
  heroBadgeTop: {
    position: 'absolute',
    right: SCREEN_WIDTH * 0.65,
    top: SCREEN_HEIGHT * 0.12,
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 7,
  },
  bottomCard: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: SHEET_HEIGHT,
    backgroundColor: WHITE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 26,
    paddingTop: 18,
    paddingBottom: 22,
    justifyContent: 'space-between',
    shadowColor: SHADOW,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  contentBlock: {
    flexShrink: 1,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 18,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: MIST,
  },
  dotActive: {
    width: 28,
  },
  title: {
    color: TITLE,
    textAlign: 'center',
    fontSize: 22,
    lineHeight: 29,
    fontWeight: '900',
    marginBottom: 10,
  },
  body: {
    color: TEXT,
    textAlign: 'left',
    fontSize: 17,
    lineHeight: 27,
    fontWeight: '600',
  },
  bodyLead: {
    textAlign: 'center',
    fontSize: 20,
    lineHeight: 31,
    color: TITLE,
    fontWeight: '800',
  },
  verseWrap: {
    marginTop: 16,
  },
  verseText: {
    color: TITLE,
    textAlign: 'left',
    fontSize: 16,
    lineHeight: 26,
    fontWeight: '700',
  },
  verseRef: {
    marginTop: 8,
    color: TEXT,
    fontSize: 13,
    fontWeight: '700',
  },
  actionRow: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skipText: {
    color: TITLE,
    fontSize: 16,
    fontWeight: '700',
  },
  nextButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 7,
  },
});

export default OnboardingScreen;
