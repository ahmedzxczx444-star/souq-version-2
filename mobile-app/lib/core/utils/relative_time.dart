/// Parses the backend's timestamps: SQLite `CURRENT_TIMESTAMP` values
/// ("YYYY-MM-DD HH:MM:SS", always UTC) as well as ISO-8601 strings.
DateTime? parseBackendTime(String? value) {
  if (value == null || value.trim().isEmpty) return null;
  var text = value.trim().replaceFirst(' ', 'T');
  final hasZone = text.endsWith('Z') || RegExp(r'[+-]\d\d:?\d\d$').hasMatch(text);
  if (!hasZone) text = '${text}Z';
  return DateTime.tryParse(text);
}

/// "منذ 3 أيام" / "3 days ago" for a listing's real creation time, or null
/// when the time is missing or unreadable (callers then show nothing rather
/// than a made-up age).
String? relativeTime(String? value, {required bool arabic, DateTime? now}) {
  final time = parseBackendTime(value);
  if (time == null) return null;
  final diff = (now ?? DateTime.now()).toUtc().difference(time.toUtc());
  if (diff.isNegative || diff.inMinutes < 1) return arabic ? 'الآن' : 'just now';

  final (int count, String unit) = switch (diff) {
    _ when diff.inMinutes < 60 => (diff.inMinutes, 'minute'),
    _ when diff.inHours < 24 => (diff.inHours, 'hour'),
    _ when diff.inDays < 30 => (diff.inDays, 'day'),
    _ when diff.inDays < 365 => (diff.inDays ~/ 30, 'month'),
    _ => (diff.inDays ~/ 365, 'year'),
  };

  if (!arabic) return '$count $unit${count == 1 ? '' : 's'} ago';
  return 'منذ ${_arabicCount(count, unit)}';
}

/// Arabic number agreement: 1 → singular, 2 → dual, 3–10 → plural,
/// 11+ → singular with the number.
String _arabicCount(int count, String unit) {
  const forms = {
    'minute': ('دقيقة', 'دقيقتين', 'دقائق'),
    'hour': ('ساعة', 'ساعتين', 'ساعات'),
    'day': ('يوم', 'يومين', 'أيام'),
    'month': ('شهر', 'شهرين', 'أشهر'),
    'year': ('سنة', 'سنتين', 'سنوات'),
  };
  final (singular, dual, plural) = forms[unit]!;
  if (count == 1) return singular;
  if (count == 2) return dual;
  if (count <= 10) return '$count $plural';
  return '$count $singular';
}
