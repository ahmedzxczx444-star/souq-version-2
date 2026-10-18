/// The privacy policy as structured text, shared with the website
/// (src/constants/privacyPolicy.ts); the content lives in the generated
/// privacy_policy_text.dart.
class PolicyDocument {
  const PolicyDocument({required this.title, required this.updatedLabel, required this.intro, required this.sections});

  final String title;
  final String updatedLabel;
  final String intro;
  final List<PolicySection> sections;
}

class PolicySection {
  const PolicySection({required this.title, this.paragraphs = const [], this.bullets = const [], this.notes = const []});

  final String title;

  /// Shown before the bullets.
  final List<String> paragraphs;
  final List<String> bullets;

  /// Shown after the bullets.
  final List<String> notes;
}
