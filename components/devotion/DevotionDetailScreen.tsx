import React from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import YoutubePlayer from 'react-native-youtube-iframe';
import { ARTICLES, CARD_ACCENTS } from './devotionData';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getStrings } from '../../localization';
import AppHeader, { AppHeaderAction } from '../shared/AppHeader';

const GOLD = '#78A1BD';
const BG = '#F2F4F8';

type Props = { navigation: any; route: any };

const getYoutubeVideoId = (url?: string) => {
  if (!url) {
    return null;
  }

  const match = url.match(/[?&]v=([^&#]+)/);
  if (match?.[1]) {
    return match[1];
  }

  const shortMatch = url.match(/youtu\.be\/([^?&#/]+)/);
  return shortMatch?.[1] ?? null;
};

const DevotionDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const strings = getStrings().devotion;
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const { articleId } = route.params;
  const article = ARTICLES.find(a => a.id === articleId);
  const articleIdx = ARTICLES.findIndex(a => a.id === articleId);
  const accent = CARD_ACCENTS[articleIdx % CARD_ACCENTS.length];
  const quoteOpenStyle = { alignSelf: 'flex-start' as const, marginBottom: 4 };
  const quoteCloseStyle = { alignSelf: 'flex-end' as const, marginTop: 4 };
  const playerWidth = Math.max(windowWidth - 60, 200);
  const playerHeight = Math.round((playerWidth * 9) / 16);

  // ✅ تحقق من وجود المقالة قبل الاستخدام
  if (!article) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{strings.detail.articleMissing}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const youtubeVideoId = getYoutubeVideoId(article.youtubeUrl);

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <StatusBar barStyle="light-content" backgroundColor={accent} />
      <AppHeader
        topInsetHeight={insets.top}
        title={article.title}
        titleNumberOfLines={1}
        backgroundColor={accent}
        leading={
          <AppHeaderAction
            icon="arrow-right"
            onPress={() => navigation.goBack()}
            size={22}
          />
        }
      />

      <ScrollView
        contentContainerStyle={styles.articleContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.detailHero, { backgroundColor: accent }]}>
          <View style={styles.detailHeroIconRing}>
            <MaterialCommunityIcons
              name={article.icon}
              size={36}
              color={accent}
            />
          </View>
          <Text style={styles.detailHeroTitle}>{article.title}</Text>
          <Text style={styles.detailHeroSub}>{article.summary}</Text>
        </View>

        {!!youtubeVideoId && (
          <View style={styles.videoCard}>
            <View style={styles.videoHeaderRow}>
              <Text style={styles.videoEyebrow}>ملخص مرئي</Text>
              <MaterialCommunityIcons
                name="youtube"
                size={24}
                color="#D32F2F"
              />
            </View>
            <View style={styles.videoPlayerWrap}>
              <YoutubePlayer
                height={playerHeight}
                width={playerWidth}
                videoId={youtubeVideoId}
                initialPlayerParams={{
                  rel: false,
                  controls: true,
                }}
                viewContainerStyle={styles.videoPlayerContainer}
                webViewProps={{
                  allowsFullscreenVideo: true,
                }}
                webViewStyle={styles.videoPlayer}
              />
            </View>
          </View>
        )}

        {article.sections.map((section, idx) => {
          const isFirstAndNoHeading = Boolean(
            idx === 0 && !section.heading && section.body,
          );
          return (
            <View
              key={idx}
              style={
                isFirstAndNoHeading ? styles.quoteBlock : styles.sectionBlock
              }
            >
              {isFirstAndNoHeading ? (
                <>
                  <MaterialCommunityIcons
                    name="format-quote-open"
                    size={28}
                    color={GOLD}
                    style={quoteOpenStyle}
                  />
                  <Text style={styles.quoteText}>{section.body}</Text>
                  <MaterialCommunityIcons
                    name="format-quote-close"
                    size={28}
                    color={GOLD}
                    style={quoteCloseStyle}
                  />
                </>
              ) : (
                <>
                  {!!section.heading && (
                    <View
                      style={[
                        styles.sectionHeadingRow,
                        { borderLeftColor: accent },
                      ]}
                    >
                      <Text style={[styles.sectionHeading, { color: accent }]}>
                        {section.heading}
                      </Text>
                    </View>
                  )}

                  {!!section.body && (
                    <Text style={styles.sectionBody}>{section.body}</Text>
                  )}

                  {Array.isArray(section.items) &&
                    section.items.map((item, i) => (
                      <View key={i} style={styles.bulletRow}>
                        <View
                          style={[
                            styles.bulletDot,
                            { backgroundColor: accent },
                          ]}
                        >
                          <Text style={styles.bulletNumber}>{i + 1}</Text>
                        </View>
                        <Text style={styles.bulletText}>{item}</Text>
                      </View>
                    ))}
                </>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },

  /* ── Header ── */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    width: 40,
    height: 40,
  },
  headerTitle: {
    flex: 1,
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginHorizontal: 8,
  },

  /* ── Detail hero ── */
  detailHero: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 22,
  },
  detailHeroIconRing: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  detailHeroTitle: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  detailHeroSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic',
  },

  /* ── Article detail content ── */
  articleContent: {
    paddingHorizontal: 16,
    paddingBottom: 52,
  },

  videoCard: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  videoHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  videoEyebrow: {
    fontSize: 13,
    fontWeight: '700',
    color: '#D32F2F',
  },
  videoPlayerWrap: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#FFF',
  },
  videoPlayerContainer: {
    alignSelf: 'stretch',
  },
  videoPlayer: {
    backgroundColor: '#FFF',
  },
  videoTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
    textAlign: 'left',
  },
  videoHint: {
    marginTop: 4,
    fontSize: 13,
    color: '#666',
    textAlign: 'left',
  },

  quoteBlock: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(201, 168, 76, 0.25)',
    shadowColor: 'rgba(201, 168, 76, 0.8)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
    textAlign: 'left',
  },
  quoteText: {
    fontSize: 15,
    color: '#444',
    textAlign: 'left',
    lineHeight: 27,
    fontStyle: 'italic',
  },

  sectionBlock: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  sectionHeadingRow: {
    borderLeftWidth: 4,
    paddingLeft: 10,
    marginBottom: 10,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'left',
  },
  sectionBody: {
    fontSize: 14,
    color: '#444',
    textAlign: 'left',
    lineHeight: 26,
  },

  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
    gap: 10,
  },
  bulletDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
    flexShrink: 0,
  },
  bulletNumber: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    color: '#444',
    textAlign: 'left',
    lineHeight: 23,
  },

  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BG,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default DevotionDetailScreen;
