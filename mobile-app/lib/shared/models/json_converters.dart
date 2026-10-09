/// The backend is SQLite, which has no boolean type: flag columns come back
/// as `0`/`1` unless a handler coerces them (GET /api/cars does `!!featured`;
/// GET /api/favorites and GET /api/dealers pass the raw integer through).
/// These accept either representation so one model works for every endpoint.
bool? flexibleBoolOrNull(Object? value) {
  if (value == null) return null;
  if (value is bool) return value;
  if (value is num) return value != 0;
  if (value is String) {
    final v = value.trim().toLowerCase();
    if (v == 'true' || v == '1') return true;
    if (v == 'false' || v == '0' || v.isEmpty) return false;
  }
  throw FormatException('Cannot read a boolean from $value');
}

/// For flags that are simply "off" when absent.
bool flexibleBool(Object? value) => flexibleBoolOrNull(value) ?? false;
