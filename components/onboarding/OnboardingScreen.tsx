import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
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
const SHEET_HEIGHT = Math.max(SCREEN_HEIGHT * 0.31, 260);

const THEMES = [
  {
    background: '#F3A354',
    accent: '#F3A354',
    secondary: '#69A8E8',
    icon: 'book-open-page-variant',
    intro: true,
  },
  {
    background: '#F3CF57',
    accent: '#F3CF57',
    secondary: '#FFFFFF',
    icon: 'headphones',
    intro: false,
  },
  {
    background: '#5AA0E2',
    accent: '#5AA0E2',
    secondary: '#FFFFFF',
    icon: 'account-group-outline',
    intro: false,
  },
] as const;

const IntroArtwork = () => (
  <View style={styles.introArtwork}>
    <Image
      source={require('../../assets/images/logo.png')}
      style={styles.introLogo}
      resizeMode="contain"
    />
  </View>
);

const HeroArtwork = ({
  icon,
  accent,
  index,
}: {
  icon: string;
  accent: string;
  index: number;
}) => {
  const cardRotation = index % 2 === 0 ? '-8deg' : '8deg';
  const badgeRotation = index % 2 === 0 ? '10deg' : '-10deg';

  return (
    <View style={styles.heroArtwork}>
      <View style={styles.ringTopRight} />
      <View style={styles.ringBottomLeft} />
      <View style={styles.photoShadow} />

      <View
        style={[
          styles.photoCard,
          {
            transform: [{ rotate: cardRotation }],
          },
        ]}
      >
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

type Props = { navigation: any };

const OnboardingScreen: React.FC<Props> = ({ navigation }) => {
  const strings = getStrings().onboarding;
  const slides = strings.slides;
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<Slide>>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [finishing, setFinishing] = useState(false);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const nextIndex = viewableItems[0]?.index;
      if (typeof nextIndex === 'number') {
        setCurrentIndex(nextIndex);
      }
    },
  ).current;

  const goTo = (index: number) => {
    listRef.current?.scrollToIndex({ index, animated: true });
  };

  const handleFinish = async () => {
    setFinishing(true);
    try {
      await supabase.auth.updateUser({ data: { onboarding_completed: true } });
    } catch (err) {
      if (__DEV__) {
        console.warn('[Onboarding] updateUser error:', err);
      }
    } finally {
      setFinishing(false);
      navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
    }
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
    const isIntro = theme.intro === true;

    return (
      <View style={[styles.slide, { backgroundColor: theme.background }]}>
        <View
          style={[
            styles.topArea,
            {
              paddingTop: insets.top + 10,
              paddingBottom: SHEET_HEIGHT - 26,
            },
          ]}
        >
          {isIntro ? (
            <IntroArtwork />
          ) : (
            <HeroArtwork
              icon={theme.icon}
              accent={theme.accent}
              index={index}
            />
          )}
        </View>

        <View
          style={[
            styles.bottomCard,
            {
              paddingBottom: Math.max(insets.bottom, 18) + 10,
            },
          ]}
        >
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

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle="dark-content"
        translucent
        backgroundColor="transparent"
      />

      <FlatList
        ref={listRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={item => item.key}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 60 }}
        scrollEnabled={!finishing}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: PAPER,
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
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroLogo: {
    width: SCREEN_WIDTH * 0.3,
    height: SCREEN_WIDTH * 0.3,
  },
  heroBadge: {
    position: 'absolute',
    right: SCREEN_WIDTH * 0.21,
    top: SCREEN_HEIGHT * 0.16,
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
  bottomCard: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: SHEET_HEIGHT,
    backgroundColor: WHITE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 26,
    paddingTop: 18,
    paddingBottom: 22,
    shadowColor: SHADOW,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
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
    textAlign: 'left',
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
