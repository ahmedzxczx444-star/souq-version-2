import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';
import '../../../shared/providers/core_providers.dart';
import '../../../shared/providers/language_provider.dart';
import '../../../shared/widgets/primary_button.dart';

/// No 1:1 React source — the website has no onboarding step (it's a
/// browser tab, always "already installed"). This is a mobile-only
/// first-run intro, kept intentionally short (3 slides) and skippable.
class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  final _controller = PageController();
  int _page = 0;

  List<({IconData icon, String title, String body})> _slides(bool ar) => [
        (
          icon: Icons.directions_car_filled_rounded,
          title: ar ? 'آلاف السيارات' : 'Thousands of cars',
          body: ar ? 'تصفح أحدث عروض السيارات من معارض موثوقة.' : 'Browse the latest listings from trusted dealers.',
        ),
        (
          icon: Icons.auto_awesome_rounded,
          title: ar ? 'بحث ذكي بالذكاء الاصطناعي' : 'AI-powered search',
          body: ar ? 'صف اللي بتدور عليه ودعنا نجيبه لك.' : 'Describe what you want and let AI find it.',
        ),
        (
          icon: Icons.storefront_rounded,
          title: ar ? 'معارض وقطع غيار' : 'Dealers & auto parts',
          body: ar ? 'كل احتياجاتك في مكان واحد.' : 'Everything you need, in one marketplace.',
        ),
      ];

  Future<void> _finish() async {
    await ref.read(appPrefsProvider).setSeenOnboarding();
    if (mounted) context.go('/login');
  }

  @override
  Widget build(BuildContext context) {
    final lang = ref.watch(languageProvider);
    final strings = ref.watch(stringsProvider);
    final slides = _slides(lang.name == 'ar');

    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            Align(
              alignment: Alignment.topRight,
              child: TextButton(
                onPressed: _finish,
                child: Text(lang.name == 'ar' ? 'تخطي' : 'Skip'),
              ),
            ),
            Expanded(
              child: PageView.builder(
                controller: _controller,
                itemCount: slides.length,
                onPageChanged: (i) => setState(() => _page = i),
                itemBuilder: (context, i) {
                  final slide = slides[i];
                  return Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 32),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          width: 96,
                          height: 96,
                          decoration: BoxDecoration(
                            color: AppColors.emeraldAccent.withValues(alpha: 0.08),
                            borderRadius: BorderRadius.circular(32),
                          ),
                          child: Icon(slide.icon, size: 44, color: AppColors.emeraldAccent),
                        ),
                        const SizedBox(height: 32),
                        Text(
                          slide.title,
                          textAlign: TextAlign.center,
                          style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          slide.body,
                          textAlign: TextAlign.center,
                          style: const TextStyle(color: AppColors.gray500, fontWeight: FontWeight.w500),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(
                slides.length,
                (i) => AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  margin: const EdgeInsets.symmetric(horizontal: 4),
                  width: _page == i ? 20 : 6,
                  height: 6,
                  decoration: BoxDecoration(
                    color: _page == i ? AppColors.black : AppColors.gray100,
                    borderRadius: BorderRadius.circular(3),
                  ),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(24),
              child: PrimaryButton(
                label: _page == slides.length - 1 ? strings.signIn : (lang.name == 'ar' ? 'التالي' : 'Next'),
                onPressed: () {
                  if (_page == slides.length - 1) {
                    _finish();
                  } else {
                    _controller.nextPage(duration: const Duration(milliseconds: 250), curve: Curves.easeOut);
                  }
                },
                icon: Icons.arrow_forward_rounded,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
