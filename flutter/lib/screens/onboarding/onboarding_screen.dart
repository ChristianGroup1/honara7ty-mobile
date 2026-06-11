// ─── Onboarding Screen ───────────────────────────────────────────────────────
// Mirrors components/onboarding/OnboardingScreen.tsx

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/theme.dart';
import '../../core/supabase_service.dart';
import '../../providers/auth_provider.dart';
import '../../routing/app_router.dart';

class _Slide {
  final String key;
  final String? title;
  final String? body;
  final String? verse;
  final String? verseRef;
  final String? icon;
  final Color accent;

  const _Slide({
    required this.key,
    this.title,
    this.body,
    this.verse,
    this.verseRef,
    this.icon,
    this.accent = AppColors.accent,
  });
}

const _slides = [
  _Slide(
    key: '1',
    title: 'مرحباً بك في تطبيق هنا راحتى',
    body:
        '"هنا نساعدك تفتح كتابك المقدس وتقرأ فيه كل يوم بانتظام، وفي وقت محدد يناسبك علشان تفضل ثابت في علاقتك مع كلمة الله."',
    icon: 'book',
    accent: AppColors.accent,
  ),
  _Slide(
    key: '2',
    body: 'اقرأ كتابك كل يوم، فيه قوة ليومك ونور لطريقك.',
    verse:
        'وُجِدَ كَلاَمُكَ فَأَكَلْتُهُ، فَكَانَ كَلاَمُكَ لِي لِلْفَرَحِ وَلِبَهْجَةِ قَلْبِي',
    verseRef: 'إرميا 15 : 16',
    icon: 'headphones',
    accent: Color(0xFF76A9FA),
  ),
  _Slide(
    key: '3',
    title: 'خلّي البداية اليوم',
    body:
        'ابدأ من النهارده حدد وقت تقابل فيه مع الله وتتغذى فيه من كلمته الحيه ومتكسلش يلا بينا',
    icon: 'calendar_today',
    accent: Color(0xFF7FD6B3),
  ),
];

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final _controller = PageController();
  int _currentPage = 0;
  bool _loading = false;

  Future<void> _complete() async {
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
  Widget build(BuildContext context) {
    final isLast = _currentPage == _slides.length - 1;

    return Scaffold(
      backgroundColor: const Color(0xFF0C1121),
      body: SafeArea(
        child: Column(
          children: [
            // Skip button.
            Align(
              alignment: Alignment.centerLeft,
              child: TextButton(
                onPressed: _complete,
                child: const Text(
                  'تخطي',
                  style: TextStyle(color: Colors.white70, fontSize: 15),
                ),
              ),
            ),

            // Page view.
            Expanded(
              child: PageView.builder(
                controller: _controller,
                itemCount: _slides.length,
                onPageChanged: (i) => setState(() => _currentPage = i),
                itemBuilder: (context, index) =>
                    _SlideView(slide: _slides[index]),
              ),
            ),

            // Dots.
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(
                _slides.length,
                (i) => Container(
                  margin: const EdgeInsets.symmetric(horizontal: 4),
                  width: i == _currentPage ? 24 : 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: i == _currentPage
                        ? _slides[_currentPage].accent
                        : Colors.white24,
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Navigation buttons.
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Row(
                textDirection: TextDirection.rtl,
                children: [
                  if (_currentPage > 0)
                    OutlinedButton(
                      onPressed: () => _controller.previousPage(
                        duration: const Duration(milliseconds: 300),
                        curve: Curves.easeInOut,
                      ),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.white,
                        side: const BorderSide(color: Colors.white38),
                        padding: const EdgeInsets.symmetric(
                            horizontal: 28, vertical: 14),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14)),
                      ),
                      child: const Text('سابق'),
                    ),
                  const Spacer(),
                  ElevatedButton(
                    onPressed: _loading
                        ? null
                        : isLast
                            ? _complete
                            : () => _controller.nextPage(
                                  duration: const Duration(milliseconds: 300),
                                  curve: Curves.easeInOut,
                                ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: _slides[_currentPage].accent,
                      foregroundColor: AppColors.navy,
                      padding: const EdgeInsets.symmetric(
                          horizontal: 36, vertical: 14),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14)),
                    ),
                    child: _loading
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                                strokeWidth: 2, color: AppColors.navy),
                          )
                        : Text(
                            isLast ? 'ابدأ معنا!' : 'لاحق',
                            style: const TextStyle(
                                fontWeight: FontWeight.bold, fontSize: 16),
                          ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}

class _SlideView extends StatelessWidget {
  final _Slide slide;
  const _SlideView({required this.slide});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 32),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // Icon circle.
          Container(
            width: 100,
            height: 100,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: slide.accent.withOpacity(0.12),
              border: Border.all(color: slide.accent.withOpacity(0.4), width: 2),
            ),
            child: Icon(
              _iconData(slide.icon),
              size: 48,
              color: slide.accent,
            ),
          ),
          const SizedBox(height: 36),

          if (slide.title != null)
            Text(
              slide.title!,
              textDirection: TextDirection.rtl,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 22,
                fontWeight: FontWeight.bold,
                height: 1.4,
              ),
            ),
          if (slide.title != null) const SizedBox(height: 16),

          if (slide.body != null)
            Text(
              slide.body!,
              textDirection: TextDirection.rtl,
              textAlign: TextAlign.center,
              style: TextStyle(
                color: Colors.white.withOpacity(0.8),
                fontSize: 16,
                height: 1.6,
              ),
            ),

          if (slide.verse != null) ...[
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: slide.accent.withOpacity(0.08),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: slide.accent.withOpacity(0.2)),
              ),
              child: Column(
                children: [
                  Text(
                    slide.verse!,
                    textDirection: TextDirection.rtl,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: slide.accent,
                      fontSize: 15,
                      fontStyle: FontStyle.italic,
                      height: 1.6,
                    ),
                  ),
                  if (slide.verseRef != null) ...[
                    const SizedBox(height: 8),
                    Text(
                      slide.verseRef!,
                      style: TextStyle(
                        color: slide.accent.withOpacity(0.7),
                        fontSize: 13,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  IconData _iconData(String? name) {
    return switch (name) {
      'book' => Icons.menu_book_rounded,
      'headphones' => Icons.headphones_rounded,
      'calendar_today' => Icons.calendar_today_rounded,
      _ => Icons.star_rounded,
    };
  }
}
