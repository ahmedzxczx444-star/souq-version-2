/// Direct port of phoneUtils.ts — keep in sync with that file if the
/// validation rules ever change.
final RegExp _egyptLocalRegex = RegExp(r'^1[0125]\d{8}$');
final RegExp _egyptE164Regex = RegExp(r'^\+201[0125]\d{8}$');

bool isValidEgyptLocalPhone(String local) => _egyptLocalRegex.hasMatch(local.trim());

bool isValidEgyptE164(String value) => _egyptE164Regex.hasMatch(value.trim());

String toEgyptE164(String local) => '+20${local.trim()}';

String? toWhatsappDigits(String? stored) {
  if (stored == null || stored.isEmpty) return null;
  final digits = stored.replaceAll(RegExp(r'\D'), '');
  String local;
  if (digits.startsWith('20') && digits.length == 12) {
    local = digits.substring(2);
  } else if (digits.startsWith('0') && digits.length == 11) {
    local = digits.substring(1);
  } else if (digits.length == 10) {
    local = digits;
  } else {
    return null;
  }
  return isValidEgyptLocalPhone(local) ? '20$local' : null;
}

String? toWhatsappLink(String? stored) {
  final digits = toWhatsappDigits(stored);
  return digits != null ? 'https://wa.me/$digits' : null;
}
