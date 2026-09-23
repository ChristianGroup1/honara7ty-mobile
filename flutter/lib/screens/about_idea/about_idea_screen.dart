// ─── AboutIdeaScreen ─────────────────────────────────────────────────────────────

import 'package:flutter/material.dart';
import '../onboarding/onboarding_screen.dart';

class AboutIdeaScreen extends StatelessWidget {
  const AboutIdeaScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const OnboardingScreen(inApp: true);
  }
}
