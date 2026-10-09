/// The base URL the backend is reachable at. server.ts's `app.use(cors())`
/// has no origin restriction, so this can point at any host without backend
/// changes — see routes/*.ts and server.ts for the underlying Express app.
///
/// Default is 127.0.0.1 because Windows desktop is the current target
/// platform (see project notes) — this is what gets compiled into the
/// Release .exe when nothing else is specified, so it must work with zero
/// flags for a plain double-click launch. 127.0.0.1 (not "localhost") is
/// deliberate: it forces IPv4 and skips any IPv4/IPv6 hostname-resolution
/// ambiguity entirely, on top of server.ts now listening dual-stack.
///
/// Override at build/run time when targeting a different platform, e.g.:
///   flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000
/// (10.0.2.2 is how the Android emulator reaches the host machine's
/// localhost; use your LAN IP for a physical device.)
class ApiConfig {
  ApiConfig._();

  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://127.0.0.1:3000',
  );

  /// Makes a server-relative path (`/uploads/cars/x.jpg`) absolute against
  /// [baseUrl]. Anything else — an absolute http(s) URL, a `//host/...`
  /// protocol-relative URL, a data: URI, or an empty string — is returned
  /// untouched, so an already absolute URL never changes host.
  static String resolveUrl(String url, {String base = baseUrl}) {
    if (!url.startsWith('/') || url.startsWith('//')) return url;
    final root = base.endsWith('/') ? base.substring(0, base.length - 1) : base;
    return '$root$url';
  }
}

/// Mirrors src/services/api.ts's `API_BASE` + path construction 1:1 so the
/// route strings here can be diffed against that file when the backend
/// contract changes.
class ApiEndpoints {
  ApiEndpoints._();

  // Auth
  static const login = '/api/auth/login';
  static const register = '/api/auth/register';
  static const sendOtp = '/api/auth/send-otp';
  static const resendOtp = '/api/auth/resend-otp';
  static const verifyOtp = '/api/auth/verify-otp';
  static const forgotPassword = '/api/auth/forgot-password';
  static const resetPassword = '/api/auth/reset-password';
  static const changePassword = '/api/auth/change-password';
  static const logoutAll = '/api/auth/logout-all';
  static const me = '/api/auth/me';

  // Cars
  static const cars = '/api/cars';
  static String carById(int id) => '/api/cars/$id';
  static const search = '/api/search';

  // Dealers
  static const dealers = '/api/dealers';
  static String dealerById(int id) => '/api/dealers/$id';

  // Favorites
  static const favorites = '/api/favorites';
  static String favoriteToggle(int carId) => '/api/favorites/$carId';
}
