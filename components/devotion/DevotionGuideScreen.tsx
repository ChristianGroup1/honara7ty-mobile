import React, { useCallback } from 'react';
import {
  FlatList,
  Platform,
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
import { ARTICLES, CARD_ACCENTS } from './devotionData';
import { getStrings } from '../../localization';
import AppHeader, { AppHeaderAction } from '../shared/AppHeader';

const NAVY = '#0A1124';
const BG = '#F2F4F8';

type Props = { navigation: any };

const DevotionGuideScreen: React.FC<Props> = ({ navigation }) => {
  const strings = getStrings().devotion;
  const insets = useSafeAreaInsets();


  const renderItem = useCallback(({ item, index }: { item: any; index: number }) => {
    const accent = CARD_ACCENTS[index % CARD_ACCENTS.length];
    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.articleCard, { borderRightColor: accent }]}
        activeOpacity={0.82}
        onPress={() =>
          navigation.navigate('DevotionDetail', { articleId: item.id })
        }
      >
        {/* Icon circle */}
        <View
          style={[
            styles.articleIconCircle,
            { backgroundColor: `${accent}1F` },
          ]}
        >
          <MaterialCommunityIcons
            name={item.icon}
            size={26}
            color={accent}
          />
        </View>

        {/* Text */}
        <View style={styles.articleCardBody}>
          <Text style={[styles.articleCardTitle, { color: NAVY }]}>
            {item.title}
          </Text>
          <Text style={styles.articleCardSummary} numberOfLines={2}>
            {item.summary}
          </Text>
        </View>

        <MaterialCommunityIcons
          name="chevron-left"
          size={20}
          color="#BCC0C8"
        />
      </TouchableOpacity>
    );
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />
      <AppHeader
        topInsetHeight={insets?.top ?? 0}
        title={strings.guide.title}
        leading={
          <AppHeaderAction
            icon="arrow-right"
            onPress={() => navigation.goBack()}
            size={24}
          />
        }
      />

      <FlatList
        data={ARTICLES}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },

  /* ── Creative Header ── */
  header: {
    backgroundColor: NAVY,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 12 : 8, // restored to common header spacing
    paddingBottom: 18,
  },
  backBtn: {
    width: 40, // match other screens
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 0,
  },
  headerIconContainer: {
    marginBottom: 6,
  },
  iconBg: {
    width: 56, // slightly larger to match other screens' header emblem
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(201, 168, 76, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(201, 168, 76, 0.25)',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 18, // match other screens
    fontWeight: '700',
    flex: 1,
    marginLeft: 20,
    textAlign: 'center',
  },
  headerSub: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  /* ── Wave decoration ── */
  wave: {
    height: 12,
    backgroundColor: NAVY,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    marginBottom: 4,
  },

  /* ── List ── */
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    paddingTop: 16,
  },

  articleCard: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    paddingVertical: 16,
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
    marginLeft: 12,
    flexShrink: 0,
  },
  articleCardBody: {
    flex: 1,
    marginHorizontal: 8,
  },
  articleCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'left',
    marginBottom: 6,
  },
  articleCardSummary: {
    fontSize: 12,
    color: '#888',
    textAlign: 'left',
    lineHeight: 20,
  },
});

export default DevotionGuideScreen;
