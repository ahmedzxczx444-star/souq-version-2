import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme/app_colors.dart';
import '../../../shared/widgets/web_layout.dart';

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
    '6. إخلاء المسؤولية',
    'المنصة غير مسؤولة عن أي معاملات أو اتفاقيات تتم بين البائع والمشتري. ننصح دائماً بفحص السيارة جيداً والتأكد من الأوراق القانونية قبل إتمام أي عملية شراء.',
  ),
];

/// Copied verbatim from src/screens/PrivacyScreen.tsx.
const privacySections = [
  LegalSection(
    '1. البيانات التي نجمعها',
    'نقوم بجمع بعض البيانات الأساسية لتقديم خدماتنا، وتشمل: البريد الإلكتروني، رقم الهاتف، ومعلومات الحساب التي تزودنا بها عند التسجيل.',
  ),
  LegalSection(
    '2. لماذا نجمع هذه البيانات؟',
    'نستخدم هذه البيانات لإنشاء حسابك، وتحسين تجربة المستخدم، والتواصل معك بخصوص إعلاناتك أو استفساراتك، ولضمان أمان المنصة.',
  ),
  LegalSection(
    '3. حماية البيانات',
    'نحن ملتزمون بحماية بياناتك الشخصية واستخدام تقنيات أمان متقدمة لمنع الوصول غير المصرح به أو تسريب المعلومات.',
  ),
  LegalSection(
    '4. مشاركة البيانات',
    'نحن نلتزم بعدم بيع أو تأجير بياناتك الشخصية لأي طرف ثالث لأغراض تسويقية. يتم استخدام البيانات فقط داخل إطار المنصة ولتحسين خدماتنا.',
  ),
  LegalSection(
    '5. ملفات تعريف الارتباط (Cookies)',
    'نستخدم ملفات تعريف الارتباط لتحسين تجربة التصفح، وتذكر تفضيلاتك، وتحليل كيفية استخدام المنصة لتطويرها باستمرار.',
  ),
  LegalSection(
    '6. حقوق المستخدم',
    'لديك الحق الكامل في تحديث بياناتك الشخصية أو طلب حذف حسابك وبياناتك من أنظمتنا في أي وقت من خلال إعدادات الحساب أو التواصل معنا.',
  ),
];

/// Support channels, as published on src/screens/ContactScreen.tsx.
const supportPhoneDisplay = '+20 115 533 6849';
const supportPhoneUri = 'tel:+201155336849';
const supportWhatsAppUri = 'https://wa.me/201155336849';
const supportEmail = 'Souqcars33@gmail.com';

class _LegalScaffold extends StatelessWidget {
  const _LegalScaffold({required this.title, required this.children});

  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    // These pages are Arabic on the site whatever the app language.
    return Directionality(
      textDirection: TextDirection.rtl,
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

class PrivacyScreen extends StatelessWidget {
  const PrivacyScreen({super.key});

  @override
  Widget build(BuildContext context) => const _LegalDocument(title: 'سياسة الخصوصية', sections: privacySections);
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
              Text('سوق السيارات', style: TextStyle(color: AppColors.white, fontSize: 20, fontWeight: FontWeight.w900)),
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
