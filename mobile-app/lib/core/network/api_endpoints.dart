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

  /// Why [baseUrl] is unusable for a store build, or null when it is fine.
  ///
  /// A phone cannot reach the developer's machine through `127.0.0.1`,
  /// `localhost` or the Android emulator's `10.0.2.2`, and both stores
  /// expect HTTPS. Only mobile release builds are checked — desktop and
  /// debug builds keep working against a local backend.
  static String? releaseProblem({required String url, required bool release, required bool mobile}) {
    if (!release || !mobile) return null;
    final uri = Uri.tryParse(url);
    if (uri == null || uri.host.isEmpty) return 'API_BASE_URL is not a valid URL.';
    const devHosts = {'127.0.0.1', 'localhost', '10.0.2.2', '0.0.0.0', '::1'};
    if (devHosts.contains(uri.host)) {
      return 'This build points at a development address (${uri.host}). '
          'Rebuild with --dart-define=API_BASE_URL=https://<production API>.';
    }
    if (uri.scheme != 'https') return 'The production API must be served over HTTPS.';
    return null;
  }

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
  static String dealerFollow(int id) => '/api/dealers/$id/follow';
  static String dealerFollowStatus(int id) => '/api/dealers/$id/follow-status';
  static String dealerRate(int id) => '/api/dealers/$id/rate';

  // Reels
  static const reels = '/api/reels';
  static String reelLike(int id) => '/api/reels/$id/like';
  static String reelView(int id) => '/api/reels/$id/view';

  // Favorites
  static const favorites = '/api/favorites';
  static String favoriteToggle(int carId) => '/api/favorites/$carId';
}
