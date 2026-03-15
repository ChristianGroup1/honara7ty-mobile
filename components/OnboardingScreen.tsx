import React, { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import supabase from '../lib/supbase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const NAVY = '#0A1124';
const GOLD = '#C9A84C';

// ─── Slide definitions ───────────────────────────────────────────────────────
const SLIDES = [
  {
    key: '1',
    icon: 'cross',
    title: 'مرحباً في هنا راحتي',
    subtitle: 'تطبيقك الروحي اليومي',
    body:
      'التطبيق ده مصمم خصيصاً عشان يساعدك تقرب من الله كل يوم.\n' +
      'هتلاقي قراءة يومية من الكتاب المقدس، مكان تسجّل فيه أفكارك، وتتابع رحلتك الروحية.',
    color: '#1A2A4A',
  },
  {
    key: '2',
    icon: 'book-open-page-variant',
    title: 'قراءة الكتاب المقدس يومياً',
    subtitle: 'استمع لصوت الله من خلال كلمته',
    body:
      'اقرأ الكتاب المقدس بالعربي بأسلوب سهل ومنظم.\n' +
      'سجّل ملاحظات الصلاة، واحفظ آيات تبني إيمانك وتثبّتك في الحق.',
    color: '#1E3555',
  },
  {
    key: '3',
    icon: 'medal-outline',
    title: 'الاستمرارية والنمو',
    subtitle: 'واظب واكسب شارات الإنجاز',
    body:
      'كل ما اتعبّدت يوم بعد يوم، اكتسبت شارات أسبوعية وشهرية وسنوية.\n' +
      'شارك شهادتك مع الآخرين وكن مصدر تشجيع لمجتمعك المسيحي.',
    color: '#0F2240',
  },
];

type Props = { navigation: any };

const OnboardingScreen: React.FC<Props> = ({ navigation }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const listRef = useRef<FlatList<typeof SLIDES[0]>>(null);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setCurrentIndex(viewableItems[0].index);
      }
    },
  ).current;

  const goNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      listRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      handleFinish();
    }
  };

  const handleFinish = async () => {
    setFinishing(true);
    try {
      // Mark onboarding as completed in Supabase user metadata
      await supabase.auth.updateUser({
        data: { onboarding_completed: true },
      });
    } catch (_) {
      // Non-critical – proceed regardless
    } finally {
      setFinishing(false);
      navigation.reset({ index: 0, routes: [{ name: 'HomeScreen' }] });
    }
  };

  const handleSkip = () => handleFinish();

  const renderSlide = ({ item }: { item: typeof SLIDES[0] }) => (
    <View style={[styles.slide, { backgroundColor: item.color }]}>
      {/* Icon circle */}
      <View style={styles.iconCircle}>
        <MaterialCommunityIcons name={item.icon} size={72} color={GOLD} />
      </View>

      {/* Text */}
      <Text style={styles.slideTitle}>{item.title}</Text>
      <View style={styles.titleAccent} />
      <Text style={styles.slideSubtitle}>{item.subtitle}</Text>
      <Text style={styles.slideBody}>{item.body}</Text>
    </View>
  );

  const isLast = currentIndex === SLIDES.length - 1;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      {/* Skip button (hidden on last slide) */}
      {!isLast && (
        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
          <Text style={styles.skipText}>تخطى</Text>
        </TouchableOpacity>
      )}

      {/* Slides */}
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
        style={styles.list}
      />

      {/* Bottom bar */}
      <View style={styles.bottomBar}>
        {/* Dot indicators */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === currentIndex && styles.dotActive]}
            />
          ))}
        </View>

        {/* Next / Start button */}
        <TouchableOpacity
          style={[styles.nextBtn, isLast && styles.nextBtnLast]}
          onPress={goNext}
          activeOpacity={0.85}
          disabled={finishing}
        >
          {finishing ? (
            <MaterialCommunityIcons name="loading" size={24} color="#FFF" />
          ) : isLast ? (
            <View style={styles.btnRow}>
              <MaterialCommunityIcons
                name="check-bold"
                size={20}
                color="#FFF"
                style={styles.btnIcon}
              />
              <Text style={styles.nextBtnText}>ابدأ رحلتك</Text>
            </View>
          ) : (
            <View style={styles.btnRow}>
              <Text style={styles.nextBtnText}>التالي</Text>
              <MaterialCommunityIcons
                name="chevron-left"
                size={22}
                color="#FFF"
                style={styles.btnIconRight}
              />
            </View>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NAVY },
  list: { flex: 1 },

  /* ── Slides ── */
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: Platform.OS === 'android' ? 48 : 20,
    paddingBottom: 16,
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(201,168,76,0.12)',
    borderWidth: 2,
    borderColor: 'rgba(201,168,76,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  slideTitle: {
    color: '#FFF',
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  titleAccent: {
    width: 48,
    height: 3,
    borderRadius: 2,
    backgroundColor: GOLD,
    marginVertical: 12,
  },
  slideSubtitle: {
    color: GOLD,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  slideBody: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 26,
  },

  /* ── Skip button ── */
  skipBtn: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 48 : 16,
    left: 20,
    zIndex: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  skipText: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },

  /* ── Bottom bar ── */
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: NAVY,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  dotsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  dotActive: {
    width: 24,
    backgroundColor: GOLD,
  },

  /* ── Next / Start button ── */
  nextBtn: {
    backgroundColor: GOLD,
    height: 50,
    borderRadius: 25,
    paddingHorizontal: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  nextBtnLast: {
    backgroundColor: '#2A7A2A',
    paddingHorizontal: 36,
  },
  btnRow: { flexDirection: 'row', alignItems: 'center' },
  btnIcon: { marginLeft: 8 },
  btnIconRight: { marginRight: 4 },
  nextBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});

export default OnboardingScreen;
