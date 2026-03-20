import React, { useState } from 'react';
import {
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const NAVY = '#0A1124';
const GOLD = '#C9A84C';
const BG   = '#F2F4F8';

// ─── Article data ─────────────────────────────────────────────────────────────

interface Section {
  heading?: string;
  items?: string[];
  body?: string;
}

interface Article {
  id: string;
  title: string;
  summary: string;
  icon: string;
  sections: Section[];
}

const ARTICLES: Article[] = [
  {
    id: '1',
    title: 'كيف تدرس الكتاب المقدس',
    summary: 'من المهم ألا نكتفى بقراءة كلمة الله فقط بل نهتم بدراستها حتى نستطيع أن نعرف بتدقيق أكثر ما يريد الله أن يوصله لنا.',
    icon: 'book-open-page-variant',
    sections: [
      {
        body: 'من المهم ألا نكتفى بقراءة كلمة الله فقط بل نهتم بدراستها (راجع مقالة الخلوة - فى عددنا السابق مايو1993 لتوضيح الفرق) حتى نستطيع أن نعرف بتدقيق أكثر مايريد الله أن يوصله لنا.\n\nومع بداية أجازتك الصيفية ستكون الفرصة مواتية لك لدراسة بعض أسفار الكتاب، مُستفيداً أفضل فائدة من وقتك. وبمقالنا هذا نحاول أن نساعدك على ذلك.\n\nهناك عدة طرق لدراسة الكتاب تختلف من شخص إلى آخر، وسنقترح عليك طريقتين أساسيتين للدراسة هما طريقة دراسة سفر، وطريقة دراسة موضوع. وقبل أن نوضحهما دعنى أتكلم معك أولاً عن:',
      },
      {
        heading: 'مبادئ عامة لدراسة الكتاب',
        items: [
          'إدرس الكتاب لفائدتك الشخصية، ليس لكى تزداد علماً بل لتتعرف على أفكار الله.',
          'إدرس الكتاب مُصلياً طالباً من الرب أن يكشف عن عينيك فترى عجائب من شريعته (مزمور١١٩: ١٨)',
          'إقرأ بتأنٍ وانتبه إلى تشكيل الكلمات باللغة العربية (فكثيراً مايختلف معنى العبارة تماماً باختلاف التشكيل) وكذلك لاحظ الفواصل بين العبارات.',
          'من الجميل أن تستعين بترجمة دقيقة للكتاب بلغة أجنبية إن أمكنك ذلك، فسيكون هذا ذا نفع كبير.',
        ],
      },
      {
        heading: 'دراسة سفر',
        body: '(١) إقرأ السفر كله مرة واحدة قراءة متتالية وحاول خلال قراءتك الآتى:\n\nأ - تقسيم السفر: سواء إلى أفكار رئيسية أو تقسيم تاريخى (مثلاً يمكن تقسيم سفر التكوين إلى: من الخلق إلى ابراهيم - حياة ابراهيم - حياة اسحق - حياة يعقوب - حياة يوسف).\n\nب - حاول أن تستنتج الغرض الرئيسى من السفر.\n\nج - استخرج الكلمات التى تتكرر كثيراً فى السفر، تلك الكلمات تعطيك فكرة واضحة عن مغزى السفر ككل (مثلاً حين تجد كلمات مثل بر، تبرير، إيمان تتكرر فى رسالة رومية ستستطيع أن تستنج بسهولة أن تلك الرسالة تتحدث عن التبرير بالإيمان).\n\nد - استخرج الآيات التى تراها هامة واكتبها وحاول حفظها.\n\nهـ - حدد كاتب السفر وزمن كتابته ولمن كُتب - إن أمكن ذلك.\n\n(٢) إبدأ من جديد على ضوء المعلومات التى استخرجتها فى دراسة السفر حسب الأجزاء التى قسمتها، وقُم بتدوين ملاحظات واستنتاجات خاصة بك.\n\n(٣) لا مانع الآن بعد إتمام الخطوات السابقة من الاستعانة ببعض الشروحات القيّمة المتوفرة لديك (كتب أو شرائط).\n\n(٤) اكتب لنفسك ملخصاً عن السفر وثق أنه مهما كان هذا الملخص بسيطاً فإنه سيكون ذا فائدة كبيرة لك.',
      },
      {
        heading: 'دراسة موضوع',
        body: 'لابد فى هذه الطريقة من الاستعانة بمصدر خارجي لتحديد الأماكن التى ذُكر فيها الموضوع الذى تدرسه (مثل فهرس الكتاب المقدس أو الكتاب المقدس ذى الشواهد - أو بعض الدراسات المُعدة خصيصاً لذلك) - استخرج تلك الشواهد وقُم بالآتى:',
        items: [
          'حدد أول مرة يرد ذكر هذا الموضوع فيها، فهذا الأمر فى غاية الأهمية إذ أنه يعطيك فكرة هامة تتعلق بهذا الموضوع (مثال: حاول أن تكتشف لماذا تُذكر أول ترنيمة فى الكتاب فى خروج ١٥ وليس قبل ذلك؟).',
          'قسِّم الشواهد إلى عناوين فرعية (مثال: عناوين مقترحة بالنسبة لموضوع الصلاة: أهمية الصلاة، قوة الصلاة، استجابة الصلاة، نماذج الصلاة، معوقات الصلاة ... إلخ).',
          'افهم كل قسم على حده وقُم بكتابة ملخصاً بأسلوبك لما فهمته، ستتكون عندك بذلك فكرة متكاملة عن الموضوع الذى اخترته.',
        ],
      },
      {
        body: 'هل ترى الأمر يحتاج إلى مجهود؟ حسناً، أن تعرف أفكار الله وتدرس كلمته أمر يستحق بذل الجهد — حاول ولاتفشل.',
      },
    ],
  },
];

// ─── Component ─────────────────────────────────────────────────────────────────

type Props = { navigation: any };

const DevotionGuideScreen: React.FC<Props> = ({ navigation }) => {
  const [openArticleId, setOpenArticleId] = useState<string | null>(null);

  const openArticle = ARTICLES.find(a => a.id === openArticleId) ?? null;

  // ── Article detail view ────────────────────────────────────────────────────
  if (openArticle) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor={NAVY} />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => setOpenArticleId(null)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="arrow-right" size={22} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={2}>
              {openArticle.title}
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.articleContent}
          showsVerticalScrollIndicator={false}
        >
          {openArticle.sections.map((section, idx) => (
            <View key={idx} style={styles.sectionBlock}>
              {section.heading ? (
                <Text style={styles.sectionHeading}>{section.heading}</Text>
              ) : null}

              {section.body ? (
                <Text style={styles.sectionBody}>{section.body}</Text>
              ) : null}

              {section.items
                ? section.items.map((item, i) => (
                    <View key={i} style={styles.bulletRow}>
                      <Text style={styles.bulletNumber}>{i + 1}</Text>
                      <Text style={styles.bulletText}>{item}</Text>
                    </View>
                  ))
                : null}
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Articles list view ─────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="arrow-right" size={22} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>شرح الخلوة</Text>
          <Text style={styles.headerSub}>مقالات لمساعدتك في وقتك مع الله</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {ARTICLES.map(article => (
          <TouchableOpacity
            key={article.id}
            style={styles.articleCard}
            activeOpacity={0.82}
            onPress={() => setOpenArticleId(article.id)}
          >
            {/* Icon circle */}
            <View style={styles.articleIconCircle}>
              <MaterialCommunityIcons
                name={article.icon}
                size={26}
                color={NAVY}
              />
            </View>

            {/* Text */}
            <View style={styles.articleCardBody}>
              <Text style={styles.articleCardTitle}>{article.title}</Text>
              <Text style={styles.articleCardSummary} numberOfLines={2}>
                {article.summary}
              </Text>
            </View>

            <MaterialCommunityIcons name="chevron-left" size={22} color="#CCC" />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  /* ── Header ── */
  header: {
    backgroundColor: NAVY,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 12 : 8,
    paddingBottom: 20,
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
  headerCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  headerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  headerSub: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginTop: 3,
    textAlign: 'center',
  },

  /* ── Articles list ── */
  listContent: { padding: 16, paddingBottom: 36 },

  articleCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
  },
  articleIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(201,168,76,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  articleCardBody: { flex: 1, alignItems: 'flex-end' },
  articleCardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: NAVY,
    textAlign: 'right',
    marginBottom: 4,
  },
  articleCardSummary: {
    fontSize: 12,
    color: '#777',
    textAlign: 'right',
    lineHeight: 18,
  },

  /* ── Article detail ── */
  articleContent: {
    padding: 20,
    paddingBottom: 48,
  },
  sectionBlock: {
    marginBottom: 20,
  },
  sectionHeading: {
    fontSize: 17,
    fontWeight: 'bold',
    color: NAVY,
    textAlign: 'right',
    marginBottom: 10,
    borderRightWidth: 3,
    borderRightColor: GOLD,
    paddingRight: 10,
  },
  sectionBody: {
    fontSize: 15,
    color: '#333',
    textAlign: 'right',
    lineHeight: 26,
  },
  bulletRow: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    marginTop: 10,
    gap: 10,
  },
  bulletNumber: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: NAVY,
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 24,
    marginLeft: 4,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    textAlign: 'right',
    lineHeight: 22,
  },
});

export default DevotionGuideScreen;
