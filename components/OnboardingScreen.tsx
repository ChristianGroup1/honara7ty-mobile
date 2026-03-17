import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import supabase from '../lib/supbase';

// ─── Responsive helpers ──────────────────────────────────────────────────────
const { width: W, height: H } = Dimensions.get('window');
const TOP_RATIO = 0.52;   // illustration panel = 52% of screen height
const BOT_RATIO = 0.48;   // text panel        = 48% of screen height

const NAVY = '#0A1124';

// Icon background colours
const LIGHT_ICON_BG = 'rgba(255,255,255,0.12)';
const DARK_ICON_BG  = 'rgba(10,17,36,0.08)';

// Icon wrap sizing multipliers
const ICON_WRAP_SIZE_FACTOR   = 1.6;   // wrapper diameter relative to icon size
const ICON_WRAP_RADIUS_FACTOR = 0.8;   // border-radius = half the wrapper = circle

// Card overlap: how many px the white card climbs over the top panel
const CARD_OVERLAP = W * 0.07;
const CARD_RADIUS  = W * 0.07;   // rounded top corners of the white card
const BTN_RADIUS   = W * 0.12;   // pill-shaped button

// ─── Slide definitions ───────────────────────────────────────────────────────
interface Slide {
  key: string;
  /** MaterialCommunityIcons name shown in the top illustration panel */
  icon: string;
  iconColor: string;
  iconBg: string;
  /** Whether the top panel is dark (navy) or light */
  darkTop: boolean;
  title?: string;
  body?: string;
  verse?: string;
  verseRef?: string;
  /** Text shown below the illustration on the last slide */
  cta?: string;
}

const SLIDES: Slide[] = [
  {
    key: '1',
    icon: 'account-group',
    iconColor: NAVY,
    iconBg: DARK_ICON_BG,
    darkTop: false,
    body: 'اقرأ كتابك كل يوم، فيه قوة ليومك ونور لطريقك.',
    verse: 'وُجِدَ كَلاَمُكَ فَأَكَلْتُهُ، فَكَانَ كَلاَمُكَ لِي\nلِلسُّرُورِ وَلِفَرَحِ قَلْبِي',
    verseRef: 'إرميا 15 : 16',
  },
  {
    key: '2',
    icon: 'book-open-page-variant',
    iconColor: NAVY,
    iconBg: DARK_ICON_BG,
    darkTop: false,
    title: 'مرحباً بك في تطبيق حفظ الآيات',
    body: '"هنا نساعدك تفتح كتابك المقدس وتقرأ فيه كل يوم بانتظام، وفي وقت محدد يناسبك علشان تفضل ثابت في علاقتك مع كلمة الله."',
  },
  {
    key: '3',
    icon: 'book-open-variant',
    iconColor: '#FFFFFF',
    iconBg: LIGHT_ICON_BG,
    darkTop: true,
    body: 'خلّي البداية اليوم',
    cta: 'ابدأ معنا!',
  },
];

type Props = { navigation: any };

const OnboardingScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const listRef = useRef<FlatList<Slide>>(null);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setCurrentIndex(viewableItems[0].index);
      }
    },
  ).current;

  const goTo = (idx: number) => {
    listRef.current?.scrollToIndex({ index: idx, animated: true });
  };

  const goPrev = () => {
    if (currentIndex > 0) { goTo(currentIndex - 1); }
  };
  const goNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      goTo(currentIndex + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = async () => {
    setFinishing(true);
    try {
      await supabase.auth.updateUser({ data: { onboarding_completed: true } });
    } catch (err) {
      console.warn('[Onboarding] updateUser error:', err); // non-critical – proceed regardless
    } finally {
      setFinishing(false);
      navigation.reset({ index: 0, routes: [{ name: 'HomeScreen' }] });
    }
  };

  const isFirst = currentIndex === 0;
  const isLast  = currentIndex === SLIDES.length - 1;

  // Heights – clamp so nothing breaks on very small screens
  const topH = Math.max(H * TOP_RATIO, 200);
  const botH = Math.max(H * BOT_RATIO, 220);

  const renderSlide = ({ item }: { item: Slide }) => {
    const topBg  = item.darkTop ? NAVY : '#F0F2F5';
    const iconSz = Math.round(W * 0.28);   // ~28 % of screen width

    return (
      <View style={{ width: W }}>
        {/* ── Top illustration panel ── */}
        <View style={[styles.topPanel, { height: topH, backgroundColor: topBg }]}>
          <View style={[styles.iconWrap, {
            width: iconSz * ICON_WRAP_SIZE_FACTOR,
            height: iconSz * ICON_WRAP_SIZE_FACTOR,
            borderRadius: iconSz * ICON_WRAP_RADIUS_FACTOR,
            backgroundColor: item.iconBg,
          }]}>
            <MaterialCommunityIcons name={item.icon} size={iconSz} color={item.iconColor} />
          </View>
        </View>

        {/* ── Bottom text card ── */}
        <View style={[styles.card, { minHeight: botH }]}>
          {/* Title (optional) */}
          {item.title ? (
            <Text style={styles.slideTitle}>{item.title}</Text>
          ) : null}

          {/* Body */}
          {item.body ? (
            <Text style={[
              styles.slideBody,
              !item.title && !item.verse && styles.slideBodyLarge,
            ]}>
              {item.body}
            </Text>
          ) : null}

          {/* Verse block */}
          {item.verse ? (
            <View style={styles.verseBlock}>
              <Text style={styles.verseText}>{item.verse}</Text>
              <Text style={styles.verseRef}>{item.verseRef}</Text>
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── Horizontal slides ── */}
      <FlatList
        ref={listRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={item => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        scrollEventThrottle={16}
        scrollEnabled={!finishing}
      />

      {/* ── Footer (dots + buttons) ── */}
      <View style={[styles.footer, {
        paddingBottom: Math.max(insets.bottom, 16),
        backgroundColor: '#FFFFFF',
      }]}>
        {/* Dots */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === currentIndex && styles.dotActive]} />
          ))}
        </View>

        {/* Buttons */}
        {isLast ? (
          // Last slide: single full-width start button
          <TouchableOpacity
            style={[styles.startBtn, finishing && styles.btnDisabled]}
            onPress={handleFinish}
            activeOpacity={0.85}
            disabled={finishing}
          >
            {finishing
              ? <ActivityIndicator color="#FFF" />
              : <Text style={styles.startBtnText}>ابدأ معنا!</Text>}
          </TouchableOpacity>
        ) : (
          // Other slides: Previous (right) + Next (left) — RTL
          <View style={styles.navRow}>
            {/* Previous — right side in RTL */}
            <TouchableOpacity
              style={[styles.navBtn, isFirst && styles.navBtnHidden]}
              onPress={goPrev}
              disabled={isFirst}
            >
              <Text style={styles.navBtnText}>← سابق</Text>
            </TouchableOpacity>

            {/* Next — left side in RTL */}
            <TouchableOpacity style={styles.navBtn} onPress={goNext}>
              <Text style={styles.navBtnText}>لاحق →</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },

  /* top illustration */
  topPanel: {
    width: W,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* white card */
  card: {
    width: W,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: CARD_RADIUS,
    borderTopRightRadius: CARD_RADIUS,
    marginTop: -CARD_OVERLAP,   // overlap the top panel slightly
    paddingHorizontal: W * 0.06,
    paddingTop: W * 0.07,
    paddingBottom: 8,
    alignItems: 'center',
  },

  slideTitle: {
    fontSize: Math.max(W * 0.055, 20),
    fontWeight: 'bold',
    color: '#111',
    textAlign: 'center',
    marginBottom: W * 0.04,
  },
  slideBody: {
    fontSize: Math.max(W * 0.042, 15),
    color: '#333',
    textAlign: 'center',
    lineHeight: Math.max(W * 0.07, 26),
  },
  slideBodyLarge: {
    fontSize: Math.max(W * 0.05, 18),
    color: '#888',
    fontWeight: '500',
  },

  verseBlock: {
    marginTop: W * 0.05,
    alignItems: 'center',
  },
  verseText: {
    fontSize: Math.max(W * 0.048, 17),
    fontWeight: 'bold',
    color: '#111',
    textAlign: 'center',
    lineHeight: Math.max(W * 0.075, 28),
  },
  verseRef: {
    marginTop: 8,
    fontSize: Math.max(W * 0.038, 14),
    color: '#777',
    textAlign: 'center',
  },

  /* footer */
  footer: {
    backgroundColor: '#FFF',
    paddingTop: 12,
    paddingHorizontal: W * 0.05,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D0D0D0',
  },
  dotActive: {
    width: 24,
    height: 8,
    borderRadius: 4,
    backgroundColor: NAVY,
  },

  /* two-button nav row */
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  navBtn: {
    backgroundColor: NAVY,
    borderRadius: BTN_RADIUS,
    paddingVertical: Math.max(H * 0.018, 13),
    paddingHorizontal: W * 0.1,
    minWidth: W * 0.35,
    alignItems: 'center',
  },
  navBtnHidden: { opacity: 0 },
  navBtnText: {
    color: '#FFF',
    fontSize: Math.max(W * 0.04, 15),
    fontWeight: '600',
  },

  /* last slide — full width start button */
  startBtn: {
    backgroundColor: NAVY,
    borderRadius: BTN_RADIUS,
    paddingVertical: Math.max(H * 0.02, 14),
    alignItems: 'center',
    marginBottom: 4,
  },
  startBtnText: {
    color: '#FFF',
    fontSize: Math.max(W * 0.045, 16),
    fontWeight: 'bold',
  },
  btnDisabled: { opacity: 0.6 },
});

export default OnboardingScreen;
