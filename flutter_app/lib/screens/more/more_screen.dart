import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/strings.dart';
import '../../core/supabase_service.dart';
import '../../features/focus/focus_mode.dart';
import '../../features/reminders/devotion_schedule.dart';
import '../../core/theme.dart';
import '../../providers/auth_provider.dart';
import '../../providers/theme_provider.dart';
import '../../routing/app_router.dart';
import '../../screens/onboarding/onboarding_screen.dart';
import '../../widgets/custom_alert_dialog.dart';

typedef _MoreItem = ({
  String route,
  String icon,
  List<Color> colors,
  String title,
  String subtitle
});

TextStyle _moreFont(double size, Color color,
        [FontWeight weight = FontWeight.w700]) =>
    TextStyle(
        fontFamily: 'Tajawal',
        fontSize: size,
        color: color,
        fontWeight: weight,
        height: 1.4);

class MoreScreen extends StatelessWidget {
  const MoreScreen({super.key, required this.onHome});
  final VoidCallback onHome;

  void _logout(BuildContext context) {
    showCustomAlert(
      context: context,
      title: AppStrings.homeLogoutTitle,
      message: AppStrings.homeLogoutMessage,
      type: AlertType.warning,
      actions: [
        AlertAction(text: AppStrings.homeCancel, isCancel: true),
        AlertAction(
          text: AppStrings.homeLogout,
          isDestructive: true,
          onPressed: () async {
            await context.read<AuthProvider>().signOut();
          },
        ),
      ],
    );
  }

  // Official Stitch feature gradients.
  static const List<_MoreItem> _items = [
    (
      route: Routes.profile,
      icon: 'person',
      colors: AppColors.settingsGradient,
      title: AppStrings.moreProfileTitle,
      subtitle: AppStrings.moreProfileSubtitle
    ),
    (
      route: Routes.devotionGuide,
      icon: 'menu_book',
      colors: AppColors.scriptureGradient,
      title: AppStrings.moreDevotionGuideTitle,
      subtitle: AppStrings.moreDevotionGuideSubtitle
    ),
    (
      route: Routes.aboutIdea,
      icon: 'lightbulb',
      colors: AppColors.dailyQuestionGradient,
      title: AppStrings.moreAboutIdeaTitle,
      subtitle: AppStrings.moreAboutIdeaSubtitle
    ),
    (
      route: Routes.bibleMemorization,
      icon: 'psychology',
      colors: AppColors.memorizationGradient,
      title: AppStrings.moreBibleMemorizationTitle,
      subtitle: AppStrings.moreBibleMemorizationSubtitle
    ),
    (
      route: Routes.lockScreenVerse,
      icon: 'palette',
      colors: AppColors.scriptureGradient,
      title: AppStrings.moreLockScreenVerseTitle,
      subtitle: AppStrings.moreLockScreenVerseSubtitle
    ),
    (
      route: Routes.badges,
      icon: 'military_tech',
      colors: AppColors.memorizationGradient,
      title: AppStrings.moreBadgesTitle,
      subtitle: AppStrings.moreBadgesSubtitle
    ),
    (
      route: Routes.devotionCalendar,
      icon: 'calendar_month',
      colors: AppColors.journalGradient,
      title: AppStrings.moreDevotionCalendarTitle,
      subtitle: AppStrings.moreDevotionCalendarSubtitle
    ),
    (
      route: Routes.weeklyReport,
      icon: 'leaderboard',
      colors: AppColors.settingsGradient,
      title: AppStrings.moreWeeklyReportTitle,
      subtitle: AppStrings.moreWeeklyReportSubtitle
    ),
  ];

  Widget _tile(BuildContext context, _MoreItem item) => _MoreTile(
      icon: item.icon,
      colors: item.colors,
      title: item.title,
      subtitle: item.subtitle,
      onTap: () {
        if (item.route == Routes.aboutIdea) {
          Navigator.of(context).push(
            MaterialPageRoute<void>(
              builder: (_) => const OnboardingScreen(inApp: true),
            ),
          );
          return;
        }
        context.push(item.route);
      });

  Widget _pair(Widget right, Widget left) => Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: IntrinsicHeight(
            child: Row(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
              Expanded(child: right),
              const SizedBox(width: 12),
              Expanded(child: left)
            ])),
      );

  @override
  Widget build(BuildContext context) {
    final themeProvider = context.watch<ThemeProvider>();
    final dark = themeProvider.isNightMode;
    final card = dark ? AppColors.darkCard : Colors.white;
    final text = dark ? AppColors.darkText : AppColors.navy;
    final muted = dark ? AppColors.darkMutedText : AppColors.lightMutedText;
    final border = dark ? AppColors.darkBorder : const Color(0xFFF1F5F9);
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor:
            dark ? AppColors.darkBackground : const Color(0xFFF8FAFC),
        body: Column(children: [
          Container(
            color: card,
            child: SafeArea(
              bottom: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
                child: Row(children: [
                  Expanded(
                      child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                        Row(mainAxisSize: MainAxisSize.min, children: [
                          Container(
                              width: 8,
                              height: 8,
                              decoration: const BoxDecoration(
                                  color: Color(0xFFFBBF24),
                                  shape: BoxShape.circle)),
                          const SizedBox(width: 6),
                          Flexible(
                              child: Text('الإعدادات والتفضيلات',
                                  style: _moreFont(11, const Color(0xFFD97706),
                                      FontWeight.w800))),
                        ]),
                        Text(AppStrings.moreTitle,
                            style: _moreFont(20, text, FontWeight.w900)),
                      ])),
                  const SizedBox(width: 12),
                  OutlinedButton(
                      onPressed: onHome,
                      style: OutlinedButton.styleFrom(
                          backgroundColor: dark
                              ? AppColors.darkCardMuted
                              : const Color(0xFFF8FAFC),
                          padding: const EdgeInsets.symmetric(
                              horizontal: 14, vertical: 8),
                          minimumSize: const Size(0, 34),
                          side: BorderSide(
                              color: dark ? border : const Color(0xFFE2E8F0)),
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16))),
                      child: Row(mainAxisSize: MainAxisSize.min, children: [
                        Text('الرئيسية', style: _moreFont(12, text)),
                        const SizedBox(width: 6),
                        Icon(Icons.arrow_back_rounded,
                            textDirection: TextDirection.ltr,
                            color: dark ? muted : AppColors.lightMutedText,
                            size: 16),
                      ])),
                ]),
              ),
            ),
          ),
          Divider(height: 1, color: border),
          Expanded(
              child: ListView(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
                  children: [
                Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                      color: card,
                      borderRadius: BorderRadius.circular(AppRadius.xxl),
                      border: Border.all(color: border),
                      boxShadow: [
                        BoxShadow(
                            color: Colors.black.withValues(alpha: .02),
                            blurRadius: 25,
                            offset: const Offset(0, 4))
                      ]),
                  child: Row(children: [
                    const _MoreSymbol(
                        name: 'dark_mode',
                        colors: [Color(0xFF312E81), Color(0xFF1E293B)],
                        foreground: Color(0xFFFCD34D),
                        size: 44),
                    const SizedBox(width: 12),
                    Expanded(
                        child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                          Text(AppStrings.moreNightModeTitle,
                              style: _moreFont(14, text, FontWeight.w900)),
                          Text(AppStrings.moreNightModeSubtitle,
                              style: _moreFont(11, muted, FontWeight.w500)),
                        ])),
                    const SizedBox(width: 8),
                    SizedBox(
                        width: 44,
                        height: 28,
                        child: FittedBox(
                            child: Switch.adaptive(
                          value: dark,
                          onChanged: themeProvider.setNightMode,
                          activeTrackColor: const Color(0xFF312E81),
                          activeThumbColor: Colors.white,
                          inactiveThumbColor: Colors.white,
                          inactiveTrackColor: const Color(0xFFE2E8F0),
                          trackOutlineColor:
                              const WidgetStatePropertyAll(Colors.transparent),
                        ))),
                  ]),
                ),
                _pair(const _FocusModeCard(), _tile(context, _items[0])),
                for (var index = 1; index < _items.length; index += 2)
                  _pair(
                    _tile(context, _items[index]),
                    index + 1 < _items.length
                        ? _tile(context, _items[index + 1])
                        : const SizedBox.shrink(),
                  ),
                Material(
                  color: card,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(AppRadius.xxl),
                      side: BorderSide(color: border)),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(AppRadius.xxl),
                    onTap: () => launchUrl(
                        Uri.parse('https://honara7ty.space/privacy'),
                        mode: LaunchMode.externalApplication),
                    child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Row(children: [
                          const _MoreSymbol(
                              name: 'shield',
                              colors: [Color(0xFF334155), Color(0xFF1E293B)]),
                          const SizedBox(width: 12),
                          Expanded(
                              child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                Text(AppStrings.morePrivacy,
                                    style:
                                        _moreFont(14, text, FontWeight.w900)),
                                Text('اعرف كيف نجمع بياناتك ونستخدمها ونحميها',
                                    style:
                                        _moreFont(11, muted, FontWeight.w400)),
                              ])),
                          const SizedBox(width: 8),
                          Icon(Icons.open_in_new_rounded,
                              color: muted, size: 16),
                        ])),
                  ),
                ),
                const SizedBox(height: 12),
                Material(
                  color: const Color(0xFFF43F5E),
                  borderRadius: BorderRadius.circular(AppRadius.xxl),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(AppRadius.xxl),
                    onTap: () => _logout(context),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.logout_rounded,
                              color: Colors.white, size: 18),
                          const SizedBox(width: 8),
                          Text(
                            AppStrings.homeLogoutTitle,
                            style: _moreFont(14, Colors.white, FontWeight.w900),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ])),
        ]),
      ),
    );
  }
}

class _MoreSymbol extends StatelessWidget {
  const _MoreSymbol(
      {required this.name,
      required this.colors,
      this.foreground = Colors.white,
      this.size = 40});
  final String name;
  final List<Color> colors;
  final Color foreground;
  final double size;

  @override
  Widget build(BuildContext context) => Container(
        width: size,
        height: size,
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            gradient: LinearGradient(
                begin: Alignment.bottomLeft,
                end: Alignment.topRight,
                colors: colors)),
        child: SvgPicture.asset('assets/icons/more/$name.svg',
            colorFilter: ColorFilter.mode(foreground, BlendMode.srcIn),
            excludeFromSemantics: true),
      );
}

class _MoreTile extends StatelessWidget {
  const _MoreTile(
      {required this.icon,
      required this.colors,
      required this.title,
      required this.subtitle,
      required this.onTap});
  final String icon;
  final List<Color> colors;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final dark = context.watch<ThemeProvider>().isNightMode;
    return Material(
      color: dark ? AppColors.darkCard : Colors.white,
      shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.xxl),
          side: BorderSide(
              color: dark ? AppColors.darkBorder : const Color(0xFFF1F5F9))),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppRadius.xxl),
        child: Padding(
            padding: const EdgeInsets.all(16),
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              _MoreSymbol(name: icon, colors: colors),
              const SizedBox(height: 12),
              const Spacer(),
              Text(title,
                  textAlign: TextAlign.right,
                  style: _moreFont(
                      12,
                      dark ? AppColors.darkText : AppColors.navy,
                      FontWeight.w900)),
              const SizedBox(height: 2),
              Text(subtitle,
                  textAlign: TextAlign.right,
                  style: _moreFont(
                      10,
                      dark ? AppColors.darkMutedText : AppColors.lightMutedText,
                      FontWeight.w400)),
            ])),
      ),
    );
  }
}

class _FocusModeCard extends StatefulWidget {
  const _FocusModeCard();

  @override
  State<_FocusModeCard> createState() => _FocusModeCardState();
}

class _FocusModeCardState extends State<_FocusModeCard> {
  FocusModePreference _preference = FocusModePreference.disabled;

  @override
  void initState() {
    super.initState();
    FocusMode.preference().then((value) {
      if (mounted) setState(() => _preference = value);
    });
  }

  Future<void> _choose(FocusModePreference value) async {
    if (!FocusMode.supported) {
      await FocusMode.setPreference(value);
      if (mounted) setState(() => _preference = value);
      if (value == FocusModePreference.disabled) return;
      await DevotionSchedule.ensure();
      if (!mounted) return;
      await showIosFocusGuide(
        context,
        automatic: value == FocusModePreference.automatic,
      );
      return;
    }
    if (value != FocusModePreference.disabled &&
        !await FocusMode.hasPermission()) {
      await FocusMode.requestPermission();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content:
                Text('اسمح بالوصول لوضع عدم الإزعاج ثم اختَر الوضع مرة أخرى.')),
      );
      return;
    }
    await FocusMode.setPreference(value);
    if (value == FocusModePreference.manual) await FocusMode.enable();
    if (value == FocusModePreference.disabled) await FocusMode.disable();
    if (value == FocusModePreference.automatic) {
      final userId = supabase.auth.currentUser?.id;
      var hour = 7;
      var minute = 0;
      if (userId != null) {
        final profile = await supabase
            .from('profiles')
            .select('devotion_time')
            .eq('id', userId)
            .maybeSingle();
        final raw = profile?['devotion_time'] as String?;
        if (raw != null && raw.contains(':')) {
          final parts = raw.split(':');
          hour = int.parse(parts[0]);
          minute = int.parse(parts[1]);
        }
      }
      await FocusMode.schedule(hour, minute);
    }
    if (mounted) setState(() => _preference = value);
  }

  Future<void> _openSettings() async {
    final dark = context.read<ThemeProvider>().isNightMode;
    final text = dark ? AppColors.darkText : AppColors.navy;
    final selected = await showModalBottomSheet<FocusModePreference>(
      context: context,
      useSafeArea: true,
      isScrollControlled: true,
      showDragHandle: false,
      backgroundColor: dark ? AppColors.darkCard : Colors.white,
      builder: (context) => SafeArea(
        top: false,
        child: Directionality(
          textDirection: TextDirection.rtl,
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text('وضع الخلوة (لا تزعجني)',
                      style: _moreFont(18, text, FontWeight.w800)),
                  const SizedBox(height: 8),
                  Text(
                      FocusMode.supported
                          ? 'يكتم إشعارات الجهاز لمدة ٣٠ دقيقة وقت الخلوة.'
                          : 'يمكنك تفعيل التركيز من إعدادات الجهاز، أو ضبط تشغيله تلقائيًا من تطبيق الاختصارات.',
                      style: _moreFont(
                          13,
                          dark
                              ? AppColors.darkMutedText
                              : AppColors.lightMutedText,
                          FontWeight.w400)),
                  const SizedBox(height: 16),
                  for (final option in const [
                    (FocusModePreference.disabled, 'إيقاف'),
                    (FocusModePreference.manual, 'الآن'),
                    (FocusModePreference.automatic, 'تلقائي')
                  ])
                    ListTile(
                        contentPadding: EdgeInsets.zero,
                        title: Text(option.$2, style: _moreFont(14, text)),
                        trailing: Icon(
                            _preference == option.$1
                                ? Icons.radio_button_checked
                                : Icons.radio_button_off,
                            color: const Color(0xFF0EA5E9)),
                        onTap: () => Navigator.pop(context, option.$1)),
                ]),
          ),
        ),
      ),
    );
    if (!mounted || selected == null) return;
    await _choose(selected);
  }

  @override
  Widget build(BuildContext context) => _MoreTile(
        icon: 'notifications_off',
        colors: const [Color(0xFF0EA5E9), Color(0xFF3B82F6)],
        title: 'وضع الخلوة (لا تزعجني)',
        subtitle: switch (_preference) {
          FocusModePreference.disabled => 'معطل (إيقاف)',
          FocusModePreference.manual => 'مفعّل الآن',
          FocusModePreference.automatic => 'مفعّل تلقائيًا',
        },
        onTap: _openSettings,
      );
}
