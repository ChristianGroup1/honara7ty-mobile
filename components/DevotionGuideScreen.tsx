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
  // ── Article 1 (formerly article 5): الخلوة ──────────────────────────────────
  {
    id: '1',
    title: 'الخلوة',
    summary: '"الرجال الذين يُظهرون المسيح بقوة فى حياتهم هم أولئك الذين قضوا وقتاً طويلاً مع الله."',
    icon: 'hands-pray',
    sections: [
      {
        body: '"إن الرجال الذين يُظهرون المسيح بقوة فى حياتهم والذين كان لهم أكبر التأثير فى العالم، هم أولئك الذين قضوا وقتاً طويلاً مع الله، بل جعلوا هذا علامة مميزة فى حياتهم. وهكذا نستطيع أن نقول أنك كلما مكثت قليلاً مع الله سوف تُستخدم قليلاً من أجل الله."',
      },
      {
        heading: 'ما هو وقت الخلوة؟',
        items: [
          'إنه الوقت الهادئ غير المستعجل لقراءة الكتاب والصلاة.',
          'إنه مركز وقلب شركتك مع الله.',
        ],
      },
      {
        heading: 'ضرورة وقت الخلوة',
        items: [
          'للنمو والتغذية: إن الطعام والتغذية السليمة ضروريان للنمو الصحى لأجسادنا. وبنفس الطريقة فإن التزوّد القوى من كلمة الله يقود إلى النمو الروحى والصحة الجيدة. (١بطرس ٢: ٢ – مزمور ١١٩: ١٣٠؛ إرميا ١٥: ١٦؛ عبرانيين ٥: ١٢-١٤)',
          'للعشرة الضرورية مع الرب يسوع المسيح: حتى نعوّد أنفسنا على حديث المحبة الخاص مع الرب بحرية وفى بساطة. إننا نحتاج أن نتعلم كيفية تمييز حضور الله معنا. (١كورنثوس ١: ٩؛ يوحنا ١٥: ٤)',
        ],
      },
      {
        heading: 'الكتاب المقدس ووقت الخلوة',
        body: 'هناك إختلافات كثيرة بين قراءة الكتاب خلال وقت الخلوة وقراءة الكتاب كجزء من برنامج منظم للدراسة.',
      },
      {
        heading: 'أ - القراءة وقت الخلوة',
        body: 'فى وقت الخلوة تقرأ أصحاح أو أصحاحين وتضع العلامات التى تراها فى كتابك بدون استعجال. تذكر أنك هنا لتتقابل مع شخص وليس لكى تنجز عملاً ما. توقع أن الله يؤثر فيك بشئ من الكلمة تحتاج أن تسمعه فى هذا اليوم بالذات.\n\nإنك هنا لن تنشغل بالتفاصيل الصغيرة كما يحدث فى الدراسة لكنك تركز فى الدرجة الأولى على الفكرة العامة للفقرة أو الأصحاح. إن القراءة سوف تعطيك فكرة أوضح عن شخصيات ومواضيع الكتاب المقدس.\n\nإننا يمكن أن نشبه القراءة بالطيران فوق مدينة بواسطة طائرة هليكوبتر. من الطائرة سوف نرى المنظر العام للمدينة ومعالمها الرئيسية من مبانٍ هامة وأنهار وحدائق. ولكن سوف نفتقد كثيراً من التفاصيل.\n\nوهكذا القراءة فى وقت خلوتك، أنت تقرأ، تضع العلامات، تكتب شيئاً فى مذكراتك، ثم تتجاوب بالصلاة مع ما أخذته لنفسك. إنها فترة لتجديد الذاكرة والانتعاش ورفع النفس.\n\nإن الفائدة الرئيسية من القراءة هى الحصول على الاستنارة بالكتاب وكلما قرأنا بقلب مفتوح فإن الله سوف ينقى أفكارنا ورغباتنا ودوافعنا. وعندها يتحقق قول الرسول «تغيروا .. بتجديد أذهانكم» (رومية ١٢: ٢).\n\nإن قراءة كلمة الله هى الأساس الهام لوقت الخلوة.',
      },
      {
        heading: 'ب - دراسة الكتاب',
        body: 'بينما تُعطينا القراءة نظرة عامة عن الكتاب فإن الدراسة تهتم بتفاصيل الفقرة وارتباطها بتعاليم الكتاب الأخرى. لقد شبهنا القراءة بالطيران فوق المدينة لأخذ نظرة عامة لها، أما الدراسة فيمكن تشبيهها بقيادة سيارة داخل شوارع المدينة. وهنا نتعرف على الكثير من التفاصيل ونتعلم كيف نصل إلى بيتنا وما هو أقصر الطرق التى توصلنا إليه.\n\nوهكذا فإننا بدراسة الكتاب نكتشف التعاليم المختلفة ونضعها جنباً إلى جنب حتى نحصل على صورة واضحة تفصيلية لها.\n\nإن دراسة الكتاب تحتاج وقتاً أكثر من القراءة. فبينما يمكن قراءة أصحاح بتركيز في خمس دقائق، تحتاج دراسة هذا الأصحاح ربما إلى أكثر من ساعة. وبالإجمال فإن قراءة الكتاب ودراسته تلعبان دوراً هاماً ومتميزاً فى تعميق وترسيخ حياتنا المسيحية.',
      },
    ],
  },

  // ── Article 2: كيف تقرأ؟ هل لديك كتاب مقدس؟ ──────────────────────────────
  {
    id: '2',
    title: 'كيف تقرأ؟ هل لديك كتاب مقدس؟',
    summary: 'أعظم شئ يمكن للإنسان أن يقرأه هو الكتاب المقدس — هل تمتلك نسخة شخصية؟',
    icon: 'book-open-variant',
    sections: [
      {
        body: 'من أهم سمات الشعوب المتحضرة هو ولعهم بالقراءة. ولاشك أن صناعة الكتاب وتوزيعه من أهم الأنشطة في عالمنا المعاصر. لذلك أريد أن تكون لديك ملكة القراءة، ومن جانبنا مستعدون لأن نشجعك بكل الطرق في هذا المجال. لكن يبقى السؤال المهم: ماذا تحب أن تقرأ؟\n\nهناك مثل ألمانى معناه إن الإنسان هو ما يأكله. وكثيراً ما يتردد هذا القول: أرنى مكتبتك، أقول لك من أنت.',
      },
      {
        body: 'أعظم شئ يمكن للإنسان أن يقرأه هو «الكتاب المقدس». قال العالم الكهربائى الشهير فاراداى «لماذا يضل الناس وعندهم هذا الكتاب المبارك يهديهم؟».\n\nولقد قال الرب ليشوع القائد الذى تَعيّن خَلَفاً لموسى «لا يبرح سفر هذه الشريعة من فمك، بل تلهج فيه نهاراً وليلاً لكى تتحفظ للعمل حسب كل ما هو مكتوب فيه. لأنك حيئذ تصلح طريقك وحيئذ تفلح» (يشوع ١: ٨).',
      },
      {
        heading: 'هل لديك كتاب مقدس؟',
        body: 'والآن: هل لديك كتاب مقدس؟ أنا لا أقول هل في منزلك كتاب مقدس، بل هل أنت تمتلك نسخة شخصية للكتاب المقدس بعهديه القديم والجديد؟\n\nهذه هى البداءة الصحيحة؛ أن يكون لك كتابك الشخصى الذى تحرص على القراءة فيه دائماً، وتدوِّن فيه ملاحظاتك، وتأخذه معك إلى الاجتماعات الروحية والندوات. وكما أن الجندى فى المعركة لا يترك سلاحه قط، هكذا المسيحى لا يترك الكتاب المقدس قط.',
      },
    ],
  },

  // ── Article 3: وقت القراءة ───────────────────────────────────────────────────
  {
    id: '3',
    title: 'وقت القراءة',
    summary: 'نصائح ثلاثية لمساعدتك على تخصيص وقت منتظم ويومى وصباحى لقراءة كلمة الله.',
    icon: 'clock-outline',
    sections: [
      {
        body: 'تُرى كيف تقرأ كتابك المقدس؟ ما هو الوقت الذى تصرفه فى هذه القراءة الممتعة والنافعة؟ نقدم لك فيما يلى نصائح ثلاثية:',
      },
      {
        heading: '١- اعكف على القراءة (١تيموثاوس ٤: ١٣)',
        body: 'وكلمة «اعكف» بمعنى داوم. فهناك خطورة من القراءة الموسمية، أو القراءة غير المنتظمة. ستجد بركة كبرى لو كرست وقتاً لقراءة الكتاب المقدس بصفة منتظمة وثابتة.',
      },
      {
        heading: '٢- القراءة اليومية',
        body: 'نتذكر هنا أهل بيريه الذين «قبلوا الكلمة بكل نشاط فاحصين الكتب كل يوم هل هذه الأمور هكذا» (أعمال ١٧: ١١). وإذا كان الإنسان كما يقولون هو ابن عادته، فسعيد هو الإنسان الذى تتملكه عادة قراءة الكتاب المقدس يومياً. إن وقتاً حوالى ٢٠ دقيقة يكفى لقراءة أصحاح بتركيز والتأمل فيه، وهذا سيعود عليك حتماً بالبركة العظمى.',
      },
      {
        heading: '٣- القراءة فى الصباح',
        body: 'مطلوب من المؤمن أن يلهج فى كلمة الله نهاراً وليلاً (مزمور ١: ٢). طبعاً لن يكون بوسع الشاب أن يقرأ الكتاب فى كل النهار وطول الليل، لكنه يقدر أن يقرأ فى وقت معين؛ ثم ينشغل به بقية اليوم. ومع أنه لا يوجد وقت محدد للقراءة، لكن بصفة عامة أفضل الأوقات هو وقت الصباح. هكذا كان المسيح «يوقظ كل صباح، يوقظ لى أذناً لأسمع كالمتعلمين» (إشعياء ٥٠: ٤). وكان التقاط المن قديماً فى البرية يتم قبل أن تحمى الشمس لئلا يذوب (خروج ١٦: ٢١) وهو ما ينطبق بلا شك على قراءة الكتاب المقدس.',
      },
    ],
  },

  // ── Article 4: القراءة المنتظمة ──────────────────────────────────────────────
  {
    id: '4',
    title: 'القراءة المنتظمة',
    summary: 'تحدثنا عن بركة القراءة اليومية، ونريد الآن أن ننبه إلى أهمية القراءة المنتظمة بالتتابع للوصول إلى أكبر فائدة.',
    icon: 'book-open-outline',
    sections: [
      {
        body: 'تحدثنا فى مرة سابقة عن بركة القراءة اليومية، ونريد الآن أن ننبه إلى أهمية القراءة المنتظمة (بالتتابع)، للوصول إلى أكبر فائدة من قراءة الكتاب المقدس؛ فلا يصح أن تقرأ الكتاب كيفما اتفق، بل يجب أن يكون لديك أسلوب معين وطريقة محددة للقراءة. وأعتقد أن أبسط طريقة وأكثرها نفعاً هى أن تبدأ بقراءة السفر أصحاحاً تلو أصحاح حتى تنتهى منه فى قراءة متتابعة.',
      },
      {
        heading: 'الكتاب المقدس فى عام واحد',
        body: 'يحتوى الكتاب المقدس على ١١٨٩ أصحاحاً. فإذا قرأنا بمعدل ٣ أو ٤ أصحاحات كل يوم (٣ أصحاحات كبيرة أو ٤ صغيرة) سيمكننا أن نُتم قراءة الكتاب المقدس كله فى عام واحد. وكثيرون وجدوا بركة عظمى فى إتمام قراءة الكتاب المقدس مرة كل سنة. وإن كانت الكمية ليست لها الأهمية الأولى، بل ينبغى أن نقرأ بتمعن وبتركيز وبفهم.',
      },
      {
        body: 'ستساعدنا القراءة المنتظمة جداً على الفهم؛ كيما نتابع قصد الروح القدس من هذا الجزء، ونفهم الجزء فى ضوء الكل، والنص فى ضوء القرينة. بهذا الأسلوب نضمن ألا ننسى جزءاً من كلمة الله لأن «كل الكتاب موحى به من الله، ونافع ... لكى يكون إنسان الله كاملاً» (٢تيموثاوس ٣: ١٦، ١٧).\n\nوكما فى الحياة الطبيعية قد يصاب الإنسان بسوء تغذية إذا أهمل تماماً أنواعاً من الأطعمة تحتوى على عناصر غذائية معينة، هكذا فى الحياة الروحية إذا أهملت باستمرار جزءاً ما من كلمة الله. ولقد كانت هذه هى الطريقة التى استخدمها المسيح مع تلميذى عمواس إذ ابتدأ من موسى (الأسفار الأولى فى الكتاب) ومن جميع الأنبياء يفسر لهما الأمور المختصة به فى جميع الكتب.',
      },
    ],
  },

  // ── Article 5 (originally first): كيف تدرس الكتاب المقدس ───────────────────
  {
    id: '5',
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

// Soft per-article accent colours cycling through a palette
const CARD_ACCENTS = ['#4A6FA5', '#6B4C9A', '#2E8B7A', '#C05C5C', '#B07B2A'];

/** Convert a 6-char hex colour + 0–1 alpha to an rgba() string */
const hexToRgba = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const DevotionGuideScreen: React.FC<Props> = ({ navigation }) => {
  const [openArticleId, setOpenArticleId] = useState<string | null>(null);

  const openArticle = ARTICLES.find(a => a.id === openArticleId) ?? null;

  // ── Article detail view ────────────────────────────────────────────────────
  if (openArticle) {
    const articleIdx = ARTICLES.findIndex(a => a.id === openArticle.id);
    const accent = CARD_ACCENTS[articleIdx % CARD_ACCENTS.length];

    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor={NAVY} />

        {/* ── Slim back-button bar ── */}
        <View style={[styles.detailTopBar, { backgroundColor: NAVY }]}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => setOpenArticleId(null)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="arrow-right" size={22} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.detailTopBarLabel} numberOfLines={1}>
            {openArticle.title}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.articleContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Hero block ── */}
          <View style={[styles.detailHero, { backgroundColor: accent }]}>
            <View style={styles.detailHeroIconRing}>
              <MaterialCommunityIcons name={openArticle.icon} size={36} color={accent} />
            </View>
            <Text style={styles.detailHeroTitle}>{openArticle.title}</Text>
            <Text style={styles.detailHeroSub}>{openArticle.summary}</Text>
          </View>

          {/* ── Sections ── */}
          {openArticle.sections.map((section, idx) => {
            const isFirstAndNoHeading = idx === 0 && !section.heading && section.body;
            return (
              <View key={idx} style={isFirstAndNoHeading ? styles.quoteBlock : styles.sectionBlock}>
                {isFirstAndNoHeading ? (
                  /* Opening quote styling */
                  <>
                    <MaterialCommunityIcons
                      name="format-quote-open"
                      size={28}
                      color={GOLD}
                      style={{ alignSelf: 'flex-end', marginBottom: 4 }}
                    />
                    <Text style={styles.quoteText}>{section.body}</Text>
                    <MaterialCommunityIcons
                      name="format-quote-close"
                      size={28}
                      color={GOLD}
                      style={{ alignSelf: 'flex-start', marginTop: 4 }}
                    />
                  </>
                ) : (
                  <>
                    {section.heading ? (
                      <View style={[styles.sectionHeadingRow, { borderRightColor: accent }]}>
                        <Text style={[styles.sectionHeading, { color: accent }]}>
                          {section.heading}
                        </Text>
                      </View>
                    ) : null}

                    {section.body ? (
                      <Text style={styles.sectionBody}>{section.body}</Text>
                    ) : null}

                    {section.items
                      ? section.items.map((item, i) => (
                          <View key={i} style={styles.bulletRow}>
                            <View style={[styles.bulletDot, { backgroundColor: accent }]}>
                              <Text style={styles.bulletNumber}>{i + 1}</Text>
                            </View>
                            <Text style={styles.bulletText}>{item}</Text>
                          </View>
                        ))
                      : null}
                  </>
                )}
              </View>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Articles list view ─────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />

      {/* ── Header banner ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="arrow-right" size={22} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <MaterialCommunityIcons name="book-open-page-variant" size={28} color={GOLD} />
          <Text style={styles.headerTitle}>شرح الخلوة</Text>
          <Text style={styles.headerSub}>مقالات لمساعدتك في وقتك مع الله</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* ── Decorative wave ── */}
      <View style={styles.wave} />

      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.listSectionLabel}>المقالات</Text>
        {ARTICLES.map((article, idx) => {
          const accent = CARD_ACCENTS[idx % CARD_ACCENTS.length];
          return (
            <TouchableOpacity
              key={article.id}
              style={[styles.articleCard, { borderLeftColor: accent }]}
              activeOpacity={0.82}
              onPress={() => setOpenArticleId(article.id)}
            >
              {/* Number badge */}
              <View style={[styles.articleBadge, { backgroundColor: accent }]}>
                <Text style={styles.articleBadgeText}>{idx + 1}</Text>
              </View>

              {/* Icon circle */}
              <View style={[styles.articleIconCircle, { backgroundColor: hexToRgba(accent, 0.12) }]}>
                <MaterialCommunityIcons name={article.icon} size={26} color={accent} />
              </View>

              {/* Text */}
              <View style={styles.articleCardBody}>
                <Text style={[styles.articleCardTitle, { color: NAVY }]}>{article.title}</Text>
                <Text style={styles.articleCardSummary} numberOfLines={2}>
                  {article.summary}
                </Text>
              </View>

              <MaterialCommunityIcons name="chevron-left" size={20} color="#BCC0C8" />
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  /* ── Header / banner ── */
  header: {
    backgroundColor: NAVY,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 12 : 8,
    paddingBottom: 28,
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
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 6,
  },
  headerSub: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },

  /* Decorative curved wave between header and list */
  wave: {
    height: 22,
    backgroundColor: NAVY,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    marginBottom: 4,
  },

  /* ── List ── */
  listContent: { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 8 },

  listSectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8A8FA0',
    textAlign: 'right',
    marginBottom: 12,
    letterSpacing: 0.5,
  },

  articleCard: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    elevation: 3,
    shadowColor: '#0A1124',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  articleBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    position: 'absolute',
    top: -8,
    left: 14,
  },
  articleBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
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
  articleCardBody: { flex: 1, alignItems: 'flex-end', paddingRight: 4 },
  articleCardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    textAlign: 'right',
    marginBottom: 5,
  },
  articleCardSummary: {
    fontSize: 12,
    color: '#888',
    textAlign: 'right',
    lineHeight: 19,
  },

  /* ── Detail top bar ── */
  detailTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 12 : 8,
    paddingBottom: 12,
    justifyContent: 'space-between',
  },
  detailTopBarLabel: {
    flex: 1,
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    marginHorizontal: 8,
  },

  /* ── Detail hero ── */
  detailHero: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
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
    paddingTop: 16,
    paddingBottom: 52,
  },

  /* Opening quote block */
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
  },
  quoteText: {
    fontSize: 15,
    color: '#444',
    textAlign: 'right',
    lineHeight: 27,
    fontStyle: 'italic',
  },

  /* Regular section card */
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
    borderRightWidth: 4,
    paddingRight: 10,
    marginBottom: 10,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  sectionBody: {
    fontSize: 14,
    color: '#444',
    textAlign: 'right',
    lineHeight: 26,
  },

  /* Bullet items */
  bulletRow: {
    flexDirection: 'row-reverse',
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
    textAlign: 'right',
    lineHeight: 23,
  },
});

export default DevotionGuideScreen;
