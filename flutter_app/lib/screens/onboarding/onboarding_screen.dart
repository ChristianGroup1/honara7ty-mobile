import 'dart:math' as math;
import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/theme.dart';
import '../../core/supabase_service.dart';
import '../../providers/auth_provider.dart';
import '../../routing/app_router.dart';

class _Slide {
  const _Slide({
    required this.eyebrow,
    required this.title,
    required this.body,
    required this.icon,
    required this.gradient,
    this.verse,
    this.verseRef,
    this.ctaHint,
  });

  final String eyebrow;
  final String title;
  final String body;
  final IconData icon;
  final List<Color> gradient;
  final String? verse;
  final String? verseRef;
  final String? ctaHint;
}

const _slides = [
  _Slide(
    eyebrow: 'هنا راحتي',
    title: 'وقت هادئ\nمع كلمة الله',
    body:
        'نساعدك تفتح كتابك المقدس كل يوم، في وقت يناسبك، علشان تفضل ثابت مع ربنا.',
    icon: Icons.menu_book_rounded,
    gradient: [Color(0xFF0B1220), Color(0xFF1E3A8A), Color(0xFF0EA5E9)],
    ctaHint: 'رحلة يومية بسيطة وهادية',
  ),
  _Slide(
    eyebrow: 'كلمة ليومك',
    title: 'اقرأ…\nواتذكّر بلُطف',
    body:
        'فيه قوة ليومك ونور لطريقك. التذكير اليومي بيساعدك تثبت العادة من غير ما تنساها.',
    icon: Icons.auto_stories_rounded,
    gradient: [Color(0xFF1C1917), Color(0xFF92400E), Color(0xFFF59E0B)],
    verse:
        'وُجِدَ كَلاَمُكَ فَأَكَلْتُهُ، فَكَانَ كَلاَمُكَ لِي لِلْفَرَحِ وَلِبَهْجَةِ قَلْبِي',
    verseRef: 'إرميا ١٥ : ١٦',
  ),
  _Slide(
    eyebrow: 'ابدأ النهاردة',
    title: 'الاستمرارية\nأهم من الكمال',
    body:
        'حدد وقت تقابل فيه مع الله. خطوة صغيرة كل يوم بتعمل فرق كبير في مسيرتك.',
    icon: Icons.wb_twilight_rounded,
    gradient: [Color(0xFF022C22), Color(0xFF047857), Color(0xFF34D399)],
    ctaHint: 'يلا نبدأ مع بعض',
  ),
];

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key, this.inApp = false});
  final bool inApp;

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen>
    with TickerProviderStateMixin {
  final _pageController = PageController();
  late final AnimationController _pulse;
  late final AnimationController _shine;
  int _index = 0;
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _pulse = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2800),
    )..repeat(reverse: true);
    _shine = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 4200),
    )..repeat();
  }

  @override
  void dispose() {
    _pulse.dispose();
    _shine.dispose();
    _pageController.dispose();
    super.dispose();
  }

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

  void _next() {
    if (_index >= _slides.length - 1) {
      _complete();
      return;
    }
    _pageController.nextPage(
      duration: const Duration(milliseconds: 450),
      curve: Curves.easeOutCubic,
    );
  }

  void _prev() {
    _pageController.previousPage(
      duration: const Duration(milliseconds: 380),
      curve: Curves.easeOutCubic,
    );
  }

  @override
  Widget build(BuildContext context) {
    final slide = _slides[_index];
    final isLast = _index == _slides.length - 1;
    final bottom = MediaQuery.paddingOf(context).bottom;
    final top = MediaQuery.paddingOf(context).top;

    return Scaffold(
      backgroundColor: const Color(0xFF020617),
      body: Stack(
        fit: StackFit.expand,
        children: [
          // Full-bleed animated backdrop
          AnimatedContainer(
            duration: const Duration(milliseconds: 500),
            curve: Curves.easeOutCubic,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topRight,
                end: Alignment.bottomLeft,
                colors: slide.gradient,
              ),
            ),
          ),
          Positioned.fill(
            child: Opacity(
              opacity: 0.22,
              child: Image.asset(
                'assets/images/bibleBackground.png',
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => const SizedBox.shrink(),
              ),
            ),
          ),
          AnimatedBuilder(
            animation: _shine,
            builder: (context, _) {
              final t = _shine.value;
              return IgnorePointer(
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: RadialGradient(
                      center: Alignment(-0.6 + t * 1.2, -0.8 + t * 0.4),
                      radius: 1.1,
                      colors: [
                        Colors.white.withValues(alpha: 0.16),
                        Colors.transparent,
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
          // Soft bottom veil for readable CTA
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            height: 280,
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.transparent,
                    const Color(0xFF020617).withValues(alpha: 0.75),
                    const Color(0xFF020617),
                  ],
                ),
              ),
            ),
          ),

          // Content
          Column(
            children: [
              SizedBox(height: top + 8),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Row(
                  children: [
                    _StepDots(
                      count: _slides.length,
                      index: _index,
                    ),
                    const Spacer(),
                    TextButton(
                      onPressed: _loading ? null : _complete,
                      style: TextButton.styleFrom(
                        foregroundColor: Colors.white70,
                      ),
                      child: Text(
                        widget.inApp ? 'إغلاق' : 'تخطي',
                        style: const TextStyle(
                          fontFamily: AppFonts.ui,
                          fontWeight: FontWeight.w800,
                          fontSize: 13,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: PageView.builder(
                  controller: _pageController,
                  itemCount: _slides.length,
                  onPageChanged: (i) => setState(() => _index = i),
                  itemBuilder: (context, i) => _OnboardingPage(
                    slide: _slides[i],
                    pulse: _pulse,
                    active: i == _index,
                  ),
                ),
              ),
              Padding(
                padding: EdgeInsets.fromLTRB(20, 0, 20, 18 + bottom),
                child: Column(
                  children: [
                    if (slide.ctaHint != null) ...[
                      Text(
                        slide.ctaHint!,
                        style: TextStyle(
                          fontFamily: AppFonts.ui,
                          color: Colors.white.withValues(alpha: 0.65),
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 12),
                    ],
                    Row(
                      children: [
                        if (_index > 0) ...[
                          _GlassButton(
                            label: 'رجوع',
                            onTap: _prev,
                          ),
                          const SizedBox(width: 10),
                        ],
                        Expanded(
                          child: _GoldCta(
                            label: isLast
                                ? (widget.inApp ? 'تمام' : 'ابدأ معنا')
                                : 'التالي',
                            loading: _loading,
                            onTap: _loading ? null : _next,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _OnboardingPage extends StatelessWidget {
  const _OnboardingPage({
    required this.slide,
    required this.pulse,
    required this.active,
  });

  final _Slide slide;
  final AnimationController pulse;
  final bool active;

  @override
  Widget build(BuildContext context) {
    return AnimatedOpacity(
      duration: const Duration(milliseconds: 320),
      opacity: active ? 1 : 0.55,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(24, 16, 24, 8),
        child: Column(
          children: [
            const Spacer(flex: 1),
            AnimatedBuilder(
              animation: pulse,
              builder: (context, child) {
                final lift = math.sin(pulse.value * math.pi) * 10;
                final scale = 1 + (math.sin(pulse.value * math.pi) * 0.03);
                return Transform.translate(
                  offset: Offset(0, -lift),
                  child: Transform.scale(scale: scale, child: child),
                );
              },
              child: _BrandOrb(icon: slide.icon),
            ),
            const SizedBox(height: 28),
            Text(
              slide.eyebrow,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontFamily: AppFonts.ui,
                fontSize: 14,
                fontWeight: FontWeight.w900,
                letterSpacing: 1.2,
                color: const Color(0xFFFBBF24).withValues(alpha: 0.95),
              ),
            ),
            const SizedBox(height: 12),
            Text(
              slide.title,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontFamily: AppFonts.verse,
                fontSize: 34,
                fontWeight: FontWeight.w700,
                height: 1.25,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 14),
            Text(
              slide.body,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontFamily: AppFonts.ui,
                fontSize: 14,
                fontWeight: FontWeight.w600,
                height: 1.7,
                color: Colors.white.withValues(alpha: 0.78),
              ),
            ),
            if (slide.verse != null) ...[
              const SizedBox(height: 22),
              ClipRRect(
                borderRadius: BorderRadius.circular(22),
                child: BackdropFilter(
                  filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.fromLTRB(18, 18, 18, 16),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(22),
                      border: Border.all(
                        color: Colors.white.withValues(alpha: 0.2),
                      ),
                    ),
                    child: Column(
                      children: [
                        Icon(
                          Icons.format_quote_rounded,
                          color: const Color(0xFFFBBF24).withValues(alpha: 0.9),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          '«${slide.verse!}»',
                          textAlign: TextAlign.center,
                          textDirection: TextDirection.rtl,
                          style: verseStyle(
                            color: Colors.white,
                            fontSize: 16,
                            height: 1.75,
                          ),
                        ),
                        if (slide.verseRef != null) ...[
                          const SizedBox(height: 10),
                          Text(
                            slide.verseRef!,
                            style: const TextStyle(
                              fontFamily: AppFonts.ui,
                              color: Color(0xFFFBBF24),
                              fontSize: 12,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              ),
            ],
            const Spacer(flex: 2),
          ],
        ),
      ),
    );
  }
}

class _BrandOrb extends StatelessWidget {
  const _BrandOrb({required this.icon});
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 148,
      height: 148,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(color: Colors.white.withValues(alpha: 0.28), width: 1.5),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFFFBBF24).withValues(alpha: 0.22),
            blurRadius: 36,
            spreadRadius: 2,
          ),
        ],
      ),
      child: Container(
        margin: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: Colors.white.withValues(alpha: 0.12),
          border: Border.all(color: Colors.white.withValues(alpha: 0.18)),
        ),
        child: Stack(
          alignment: Alignment.center,
          children: [
            ClipOval(
              child: Image.asset(
                'assets/images/logo.png',
                width: 72,
                height: 72,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => Icon(
                  icon,
                  size: 42,
                  color: const Color(0xFFFBBF24),
                ),
              ),
            ),
            Positioned(
              bottom: 18,
              child: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFFFBBF24),
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFFFBBF24).withValues(alpha: 0.45),
                      blurRadius: 12,
                    ),
                  ],
                ),
                child: Icon(icon, size: 16, color: const Color(0xFF0F172A)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StepDots extends StatelessWidget {
  const _StepDots({required this.count, required this.index});
  final int count;
  final int index;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: List.generate(count, (i) {
        final on = i == index;
        return AnimatedContainer(
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOutCubic,
          margin: EdgeInsetsDirectional.only(end: i == count - 1 ? 0 : 7),
          width: on ? 34 : 9,
          height: 9,
          decoration: BoxDecoration(
            color: on ? const Color(0xFFFBBF24) : Colors.white38,
            borderRadius: BorderRadius.circular(99),
          ),
        );
      }),
    );
  }
}

class _GoldCta extends StatelessWidget {
  const _GoldCta({
    required this.label,
    required this.onTap,
    this.loading = false,
  });

  final String label;
  final VoidCallback? onTap;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: loading ? null : onTap,
        borderRadius: BorderRadius.circular(20),
        child: Ink(
          height: 56,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            gradient: const LinearGradient(
              begin: Alignment.centerRight,
              end: Alignment.centerLeft,
              colors: [Color(0xFFFBBF24), Color(0xFFF59E0B), Color(0xFFD97706)],
            ),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFFF59E0B).withValues(alpha: 0.4),
                blurRadius: 22,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: Center(
            child: loading
                ? const SizedBox(
                    width: 22,
                    height: 22,
                    child: CircularProgressIndicator(
                      strokeWidth: 2.4,
                      color: Color(0xFF0F172A),
                    ),
                  )
                : Text(
                    label,
                    style: const TextStyle(
                      fontFamily: AppFonts.ui,
                      color: Color(0xFF0F172A),
                      fontSize: 16,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
          ),
        ),
      ),
    );
  }
}

class _GlassButton extends StatelessWidget {
  const _GlassButton({required this.label, required this.onTap});
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(20),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: Material(
          color: Colors.white.withValues(alpha: 0.12),
          child: InkWell(
            onTap: onTap,
            child: Container(
              height: 56,
              padding: const EdgeInsets.symmetric(horizontal: 18),
              alignment: Alignment.center,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: Colors.white24),
              ),
              child: Text(
                label,
                style: const TextStyle(
                  fontFamily: AppFonts.ui,
                  color: Colors.white,
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
