import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/theme.dart';
import '../../core/supabase_service.dart';
import '../../providers/auth_provider.dart';
import '../../routing/app_router.dart';
import '../../widgets/auth_action_button.dart';

class _Slide {
  const _Slide({
    required this.badge,
    required this.title,
    required this.body,
    required this.icon,
    required this.tint,
    required this.bg,
    this.verse,
    this.verseRef,
  });

  final String badge;
  final String title;
  final String body;
  final IconData icon;
  final Color tint;
  final Color bg;
  final String? verse;
  final String? verseRef;
}

const _slides = [
  _Slide(
    badge: 'هنا راحتي',
    title: 'مرحباً بك في هنا راحتي',
    body:
        'نساعدك تفتح كتابك المقدس وتقرأ فيه كل يوم بانتظام، وفي وقت يناسبك علشان تفضل ثابت في علاقتك مع كلمة الله.',
    icon: Icons.menu_book_rounded,
    tint: Color(0xFF0284C7),
    bg: Color(0xFFF0F9FF),
  ),
  _Slide(
    badge: 'كلمة ليومك',
    title: 'اقرأ كتابك كل يوم',
    body: 'فيه قوة ليومك ونور لطريقك. التذكير اليومي بيساعدك تثبت العادة من غير ما تنساها.',
    icon: Icons.auto_stories_rounded,
    tint: Color(0xFFD97706),
    bg: Color(0xFFFFFBEB),
    verse:
        'وُجِدَ كَلاَمُكَ فَأَكَلْتُهُ، فَكَانَ كَلاَمُكَ لِي لِلْفَرَحِ وَلِبَهْجَةِ قَلْبِي',
    verseRef: 'إرميا ١٥ : ١٦',
  ),
  _Slide(
    badge: 'ابدأ النهاردة',
    title: 'خلّي البداية اليوم',
    body:
        'حدد وقت تقابل فيه مع الله وتتغذى من كلمته الحية. الاستمرارية أهم من الكمال — يلا بينا.',
    icon: Icons.calendar_today_rounded,
    tint: Color(0xFF059669),
    bg: Color(0xFFECFDF5),
  ),
];

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key, this.inApp = false});
  final bool inApp;

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final _controller = PageController();
  int _currentPage = 0;
  bool _loading = false;

  Future<void> _complete() async {
    if (widget.inApp) {
      Navigator.maybePop(context);
      return;
    }
    setState(() => _loading = true);
    try {
      await supabase.auth.updateUser(
        UserAttributes(data: {'onboarding_completed': true}),
      );
      if (!mounted) return;
      await context.read<AuthProvider>().refresh();
      if (mounted) context.go(Routes.notificationPermission);
    } catch (_) {
      if (mounted) context.go(Routes.mainTabs);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isLast = _currentPage == _slides.length - 1;
    final slide = _slides[_currentPage];

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: Stack(
        children: [
          SafeArea(
            child: Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                  child: Row(
                    children: [
                      Text(
                        '${_currentPage + 1} / ${_slides.length}',
                        style: const TextStyle(
                          fontFamily: AppFonts.ui,
                          fontSize: 12,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF94A3B8),
                        ),
                      ),
                      const Spacer(),
                      TextButton(
                        onPressed: _loading ? null : _complete,
                        child: const Text(
                          'تخطي',
                          style: TextStyle(
                            fontFamily: AppFonts.ui,
                            color: Color(0xFF64748B),
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: PageView.builder(
                    controller: _controller,
                    itemCount: _slides.length,
                    onPageChanged: (i) => setState(() => _currentPage = i),
                    itemBuilder: (context, index) =>
                        _SlideCard(slide: _slides[index]),
                  ),
                ),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: List.generate(
                    _slides.length,
                    (i) => AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      margin: const EdgeInsets.symmetric(horizontal: 4),
                      width: i == _currentPage ? 24 : 8,
                      height: 8,
                      decoration: BoxDecoration(
                        color: i == _currentPage
                            ? slide.tint
                            : const Color(0xFFE2E8F0),
                        borderRadius: BorderRadius.circular(99),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
                  child: Row(
                    children: [
                      if (_currentPage > 0)
                        Expanded(
                          child: OutlinedButton(
                            onPressed: () => _controller.previousPage(
                              duration: const Duration(milliseconds: 280),
                              curve: Curves.easeInOut,
                            ),
                            style: OutlinedButton.styleFrom(
                              foregroundColor: const Color(0xFF0F172A),
                              side: const BorderSide(color: Color(0xFFE2E8F0)),
                              backgroundColor: Colors.white,
                              minimumSize: const Size.fromHeight(52),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16),
                              ),
                            ),
                            child: const Text(
                              'سابق',
                              style: TextStyle(
                                fontFamily: AppFonts.ui,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                        ),
                      if (_currentPage > 0) const SizedBox(width: 10),
                      Expanded(
                        flex: _currentPage > 0 ? 1 : 1,
                        child: AuthPrimaryButton(
                          label: isLast ? 'ابدأ معنا!' : 'التالي',
                          loading: _loading,
                          icon: isLast
                              ? Icons.rocket_launch_rounded
                              : Icons.arrow_forward_rounded,
                          onPressed: isLast
                              ? _complete
                              : () => _controller.nextPage(
                                    duration:
                                        const Duration(milliseconds: 280),
                                    curve: Curves.easeInOut,
                                  ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SlideCard extends StatelessWidget {
  const _SlideCard({required this.slide});
  final _Slide slide;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 12),
      children: [
        Container(
          padding: const EdgeInsets.all(22),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                Color(0xFF0F172A),
                Color(0xFF1E1B4B),
                Color(0xFF0F172A),
              ],
            ),
            borderRadius: BorderRadius.circular(28),
            border: Border.all(color: const Color(0xFF1E293B)),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF0F172A).withValues(alpha: 0.16),
                blurRadius: 24,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: Column(
            children: [
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.10),
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(
                    color: Colors.white.withValues(alpha: 0.15),
                  ),
                ),
                child: Text(
                  slide.badge,
                  style: const TextStyle(
                    fontFamily: AppFonts.ui,
                    color: Color(0xFFFCD34D),
                    fontSize: 11,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
              const SizedBox(height: 18),
              Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.10),
                  borderRadius: BorderRadius.circular(22),
                  border: Border.all(
                    color: Colors.white.withValues(alpha: 0.15),
                  ),
                ),
                child: Icon(slide.icon, size: 34, color: const Color(0xFFFBBF24)),
              ),
              const SizedBox(height: 18),
              Text(
                slide.title,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontFamily: AppFonts.ui,
                  color: Colors.white,
                  fontSize: 22,
                  fontWeight: FontWeight.w900,
                  height: 1.35,
                ),
              ),
              const SizedBox(height: 10),
              Text(
                slide.body,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontFamily: AppFonts.ui,
                  color: Color(0xFFCBD5E1),
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                  height: 1.6,
                ),
              ),
            ],
          ),
        ),
        if (slide.verse != null) ...[
          const SizedBox(height: 14),
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(22),
              border: Border.all(
                color: slide.tint.withValues(alpha: 0.25),
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.02),
                  blurRadius: 16,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Column(
              children: [
                Icon(Icons.format_quote_rounded, color: slide.tint),
                const SizedBox(height: 8),
                Text(
                  '«${slide.verse!}»',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontFamily: AppFonts.ui,
                    color: const Color(0xFF0F172A),
                    fontSize: 14,
                    fontStyle: FontStyle.italic,
                    fontWeight: FontWeight.w600,
                    height: 1.65,
                  ),
                ),
                if (slide.verseRef != null) ...[
                  const SizedBox(height: 10),
                  Text(
                    slide.verseRef!,
                    style: TextStyle(
                      fontFamily: AppFonts.ui,
                      color: slide.tint,
                      fontSize: 12,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ] else ...[
          const SizedBox(height: 14),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(22),
              border: Border.all(color: const Color(0xFFF1F5F9)),
            ),
            child: Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: slide.bg,
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Icon(slide.icon, color: slide.tint),
                ),
                const SizedBox(width: 12),
                const Expanded(
                  child: Text(
                    'خطوات صغيرة كل يوم… فرق كبير في مسيرتك.',
                    style: TextStyle(
                      fontFamily: AppFonts.ui,
                      color: Color(0xFF64748B),
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      height: 1.45,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }
}
