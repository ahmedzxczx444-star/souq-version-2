import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/l10n/app_strings.dart';
import '../../../shared/providers/language_provider.dart';
import '../../../shared/widgets/web_layout.dart';
import 'privacy_policy_text.dart';

/// One numbered section of a legal page.
class LegalSection {
  const LegalSection(this.title, this.body);

  final String title;
  final String body;
}

/// Copied verbatim from src/screens/TermsScreen.tsx (the site publishes
/// these pages in Arabic only).
const termsSections = [
  LegalSection(
    '1. طبيعة المنصة',
    'تعتبر المنصة سوقاً إلكترونياً يهدف إلى الربط بين بائعي السيارات ومشتريه. نحن نوفر المساحة التقنية لعرض السيارات والتواصل، ولا نتدخل في عمليات البيع المباشرة.',
  ),
  LegalSection(
    '2. ملكية المعروضات',
    'المنصة لا تملك أي من السيارات المدرجة في القوائم. جميع السيارات المعروضة مملوكة للتجار أو الأفراد العارضين لها.',
  ),
  LegalSection(
    '3. مسؤولية المعلومات',
    'يتحمل التجار والمعلنون المسؤولية الكاملة عن دقة وصحة المعلومات المتعلقة بالسيارات المعروضة، بما في ذلك الحالة الفنية والأسعار والمواصفات.',
  ),
  LegalSection(
    '4. إدارة المحتوى',
    'تحتفظ المنصة بالحق في إزالة أي إعلانات مضللة أو احتيالية أو تخالف سياسات الاستخدام دون إشعار مسبق، وذلك لضمان سلامة ومصداقية السوق.',
  ),
  LegalSection(
    '5. الاستخدام القانوني',
    'يجب على جميع المستخدمين استخدام المنصة للأغراض القانونية فقط ووفقاً للقوانين واللوائح المعمول بها في جمهورية مصر العربية.',
  ),
  LegalSection(
    '6. المحتوى المحظور والإبلاغ',
    'يُمنع نشر أي محتوى احتيالي أو مضلل أو مسيء أو يحض على الكراهية أو العنف، أو محتوى جنسي، أو محتوى ينتهك حقوق الغير أو القانون، كما يُمنع انتحال الشخصية أو الإزعاج المتكرر. يمكن لأي مستخدم الإبلاغ عن سيارة أو قطعة غيار أو فيديو أو معرض أو مستخدم من داخل التطبيق، وحظر أي معرض لإخفاء محتواه. يراجع المشرفون البلاغات ويحق لهم إخفاء المحتوى المخالف أو حذفه وإيقاف الحساب المخالف أو حظره.\n\n'
        'Fraudulent, misleading, abusive, hateful, violent, sexual or illegal content, impersonation and spam are not allowed. Anyone can report a car, part, video, dealer or user from the app and block a dealer to hide its content. Moderators review reports and may hide or remove content and suspend or ban accounts that break these rules.',
  ),
  LegalSection(
    '7. إخلاء المسؤولية',
    'المنصة غير مسؤولة عن أي معاملات أو اتفاقيات تتم بين البائع والمشتري. ننصح دائماً بفحص السيارة جيداً والتأكد من الأوراق القانونية قبل إتمام أي عملية شراء.',
  ),
];

/// Support channels, as published on src/screens/ContactScreen.tsx.
const supportPhoneDisplay = '+20 115 533 6849';
const supportPhoneUri = 'tel:+201155336849';
const supportWhatsAppUri = 'https://wa.me/201155336849';
const supportEmail = 'Souqcars33@gmail.com';

class _LegalScaffold extends StatelessWidget {
  const _LegalScaffold({required this.title, required this.children, this.rtl = true});

  final String title;
  final List<Widget> children;

  /// The terms and contact pages are Arabic on the site; the privacy policy
  /// follows the app language.
  final bool rtl;

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: rtl ? TextDirection.rtl : TextDirection.ltr,
      child: Scaffold(
        backgroundColor: AppColors.white,
        body: SafeArea(
          child: WebColumn(
            child: Column(
              children: [
                Container(
                  padding: const EdgeInsets.fromLTRB(24, 24, 24, 24),
                  decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: AppColors.gray50))),
                  child: Row(
                    children: [
                      WebBackButton(onTap: () => context.canPop() ? context.pop() : context.go('/home')),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Text(
                          title,
                          style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w900,
                            letterSpacing: -0.5,
                            color: AppColors.gray900,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                Expanded(child: ListView(padding: const EdgeInsets.all(24), children: children)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _LegalDocument extends StatelessWidget {
  const _LegalDocument({required this.title, required this.sections});

  final String title;
  final List<LegalSection> sections;

  @override
  Widget build(BuildContext context) {
    return _LegalScaffold(
      title: title,
      children: [
        for (final section in sections)
          Padding(
            padding: const EdgeInsets.only(bottom: 32),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  section.title,
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: AppColors.gray900),
                ),
                const SizedBox(height: 16),
                Text(section.body, style: const TextStyle(fontSize: 16, height: 1.625, color: AppColors.gray600)),
              ],
            ),
          ),
      ],
    );
  }
}

class TermsScreen extends StatelessWidget {
  const TermsScreen({super.key});

  @override
  Widget build(BuildContext context) => const _LegalDocument(title: 'الشروط والأحكام', sections: termsSections);
}

/// The privacy policy published at souq-elsyrat.com/privacy, in the app's
/// language (privacy_policy_text.dart is generated from the website's copy).
class PrivacyScreen extends ConsumerWidget {
  const PrivacyScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final arabic = ref.watch(languageProvider) == AppLanguage.ar;
    final policy = arabic ? privacyPolicyAR : privacyPolicyEN;
    const body = TextStyle(fontSize: 15, height: 1.6, color: AppColors.gray600);
    return _LegalScaffold(
      title: policy.title,
      rtl: arabic,
      children: [
        Text(
          '${policy.updatedLabel}: $privacyPolicyUpdated',
          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.gray400),
        ),
        const SizedBox(height: 8),
        Text(policy.intro, style: body),
        const SizedBox(height: 24),
        for (var i = 0; i < policy.sections.length; i++)
          Padding(
            key: Key('policy-section-${i + 1}'),
            padding: const EdgeInsets.only(bottom: 28),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  policy.sections[i].title,
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: AppColors.gray900),
                ),
                const SizedBox(height: 12),
                for (final p in policy.sections[i].paragraphs)
                  Padding(padding: const EdgeInsets.only(bottom: 8), child: Text(p, style: body)),
                for (final b in policy.sections[i].bullets)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Padding(padding: EdgeInsets.only(top: 9), child: Icon(Icons.circle, size: 5, color: AppColors.gray400)),
                        const SizedBox(width: 10),
                        Expanded(child: Text(b, style: body)),
                      ],
                    ),
                  ),
                for (final n in policy.sections[i].notes)
                  Padding(padding: const EdgeInsets.only(bottom: 8), child: Text(n, style: body)),
              ],
            ),
          ),
      ],
    );
  }
}

class ContactScreen extends StatelessWidget {
  const ContactScreen({super.key});

  static Future<void> _open(String uri) async {
    await launchUrl(Uri.parse(uri), mode: LaunchMode.externalApplication);
  }

  @override
  Widget build(BuildContext context) {
    return _LegalScaffold(
      title: 'تواصل معنا',
      children: [
        const Padding(
          padding: EdgeInsets.only(bottom: 32),
          child: Text(
            'نحن هنا لمساعدتك. يمكنك التواصل مع فريق الدعم الفني من خلال الوسائل التالية:',
            style: TextStyle(fontSize: 16, height: 1.5, color: AppColors.gray600),
          ),
        ),
        _ContactCard(
          icon: Icons.phone_outlined,
          iconColor: AppColors.emerald600,
          label: 'الهاتف / واتساب',
          value: supportPhoneDisplay,
          valueDirection: TextDirection.ltr,
          onTap: () => _open(supportPhoneUri),
        ),
        _ContactCard(
          icon: Icons.chat_bubble_outline_rounded,
          iconColor: AppColors.emerald500,
          label: 'واتساب مباشر',
          value: 'ابدأ المحادثة الآن',
          background: Color(0xFFECFDF5),
          onTap: () => _open(supportWhatsAppUri),
        ),
        _ContactCard(
          icon: Icons.mail_outline_rounded,
          iconColor: Color(0xFF2563EB),
          label: 'البريد الإلكتروني',
          value: supportEmail,
          onTap: () => _open('mailto:$supportEmail'),
        ),
        Container(
          margin: const EdgeInsets.only(top: 32),
          padding: const EdgeInsets.all(32),
          decoration: BoxDecoration(color: AppColors.black, borderRadius: BorderRadius.circular(32)),
          child: const Column(
            children: [
              Text('أسواق السيارات', style: TextStyle(color: AppColors.white, fontSize: 20, fontWeight: FontWeight.w900)),
              SizedBox(height: 8),
              Text(
                'منصتك الموثوقة لبيع وشراء السيارات في مصر',
                textAlign: TextAlign.center,
                style: TextStyle(color: AppColors.gray400, fontSize: 14),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _ContactCard extends StatelessWidget {
  const _ContactCard({
    required this.icon,
    required this.iconColor,
    required this.label,
    required this.value,
    required this.onTap,
    this.background = AppColors.gray50,
    this.valueDirection,
  });

  final IconData icon;
  final Color iconColor;
  final String label;
  final String value;
  final VoidCallback onTap;
  final Color background;
  final TextDirection? valueDirection;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(color: background, borderRadius: BorderRadius.circular(24)),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(color: AppColors.white, borderRadius: BorderRadius.circular(16)),
                child: Icon(icon, size: 24, color: iconColor),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      label,
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.gray400),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      value,
                      textDirection: valueDirection,
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: AppColors.gray900),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
