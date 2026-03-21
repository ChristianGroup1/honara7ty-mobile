import React from 'react';
import {
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { ARTICLES, CARD_ACCENTS } from './data/devotionData';

const NAVY = '#0A1124';
const GOLD = '#C9A84C';
const BG = '#F2F4F8';

const hexToRgba = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

type Props = { navigation: any };

const DevotionGuideScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />

      {/* Add spacing for status bar */}
      <View style={{ height: insets.top, backgroundColor: NAVY }} />

      {/* ── Creative Header ── */}
      <View style={styles.header}>
        <View style={{ width: 40 }} /> {/* Space on left */}
        <View style={styles.headerCenter}>
          <View style={styles.headerIconContainer}>
            <View style={styles.iconBg}>
              <MaterialCommunityIcons
                name="book-open-page-variant"
                size={32}
                color={GOLD}
              />
            </View>
          </View>
          <Text style={styles.headerTitle}>شرح الخلوة</Text>
          <Text style={styles.headerSub}>مقالات لمساعدتك في وقتك مع الله</Text>
        </View>
        {/* Back button on RIGHT side */}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* ── Rest of screen ── */}
      <View style={styles.wave} />

      {/* ── Articles List ── */}
      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {ARTICLES.map((article, idx) => {
          const accent = CARD_ACCENTS[idx % CARD_ACCENTS.length];
          return (
            <TouchableOpacity
              key={article.id}
              style={[styles.articleCard, { borderRightColor: accent }]}
              activeOpacity={0.82}
              onPress={() =>
                navigation.navigate('DevotionDetail', { articleId: article.id })
              }
            >
              {/* Icon circle */}
              <View
                style={[
                  styles.articleIconCircle,
                  { backgroundColor: hexToRgba(accent, 0.12) },
                ]}
              >
                <MaterialCommunityIcons
                  name={article.icon}
                  size={26}
                  color={accent}
                />
              </View>

              {/* Text */}
              <View style={styles.articleCardBody}>
                <Text style={[styles.articleCardTitle, { color: NAVY }]}>
                  {article.title}
                </Text>
                <Text style={styles.articleCardSummary} numberOfLines={2}>
                  {article.summary}
                </Text>
              </View>

              <MaterialCommunityIcons
                name="chevron-left"
                size={20}
                color="#BCC0C8"
              />
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  /* ── Creative Header ── */
  header: {
    backgroundColor: NAVY,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerIconContainer: {
    marginBottom: 12,
  },
  iconBg: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(201, 168, 76, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(201, 168, 76, 0.3)',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  headerSub: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
  },

  /* ── Wave decoration ── */
  wave: {
    height: 22,
    backgroundColor: NAVY,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    marginBottom: 4,
  },

  /* ── List ── */
  listContent: { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 8 },

  articleCard: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderRightWidth: 4,
    elevation: 3,
    shadowColor: '#0A1124',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },

  articleIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  articleCardBody: { flex: 1, alignItems: 'flex-start', paddingLeft: 4 },
  articleCardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    textAlign: 'left',
    marginBottom: 5,
  },
  articleCardSummary: {
    fontSize: 12,
    color: '#888',
    textAlign: 'left',
    lineHeight: 19,
  },
  detailHeroTitle: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default DevotionGuideScreen;
