import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';
import '../../../shared/models/auth_response.dart';

class RegisterResult {
  RegisterResult({required this.email, required this.requiresOtpVerification});

  final String email;
  final bool requiresOtpVerification;
}

/// Mirrors the `auth` section of src/services/api.ts 1:1 against
/// server.ts's /api/auth/* handlers.
class AuthRepository {
  AuthRepository(this._client);

  final ApiClient _client;

  Future<AuthResponse> login({
    required String email,
    required String password,
    String? captchaToken,
  }) async {
    final res = await _client.post(ApiEndpoints.login, data: {
      'email': email,
      'password': password,
      if (captchaToken != null) 'captchaToken': captchaToken,
    });
    return AuthResponse.fromJson(res.data as Map<String, dynamic>);
  }

  /// [extra] carries the dealer-only fields (phone, whatsapp_number,
  /// branches_count, address, latitude, longitude, logo, business_type,
  /// dealer_category) exactly as server.ts's POST /api/auth/register
  /// expects them — see AuthScreen.tsx's handleSubmit for the full payload
  /// shape when role == 'dealer'.
  Future<RegisterResult> register({
    required String email,
    required String password,
    required String name,
    required String role,
    String? captchaToken,
    Map<String, dynamic> extra = const {},
  }) async {
    final res = await _client.post(ApiEndpoints.register, data: {
      'email': email,
      'password': password,
      'name': name,
      'role': role,
      if (captchaToken != null) 'captchaToken': captchaToken,
      ...extra,
    });
    final body = res.data as Map<String, dynamic>;
    return RegisterResult(
      email: body['email'] as String,
      requiresOtpVerification: body['requiresOtpVerification'] == true,
    );
  }

  Future<void> sendOtp(String email, String purpose) =>
      _client.post(ApiEndpoints.sendOtp, data: {'email': email, 'purpose': purpose});

  Future<void> resendOtp(String email, String purpose) =>
      _client.post(ApiEndpoints.resendOtp, data: {'email': email, 'purpose': purpose});

  /// Returns a populated [AuthResponse] only when purpose == 'register' —
  /// forgot-password OTPs are verified via [resetPassword] instead (see
  /// server.ts POST /api/auth/verify-otp: it only signs a JWT for the
  /// register purpose).
  Future<AuthResponse?> verifyOtp({
    required String email,
    required String otp,
    required String purpose,
  }) async {
    final res = await _client.post(ApiEndpoints.verifyOtp, data: {
      'email': email,
      'otp': otp,
      'purpose': purpose,
    });
    if (purpose != 'register') return null;
    return AuthResponse.fromJson(res.data as Map<String, dynamic>);
  }

  Future<void> forgotPassword(String email) =>
      _client.post(ApiEndpoints.forgotPassword, data: {'email': email});

  Future<void> resetPassword({
    required String email,
    required String otp,
    required String password,
  }) =>
      _client.post(ApiEndpoints.resetPassword, data: {
        'email': email,
        'otp': otp,
        'password': password,
      });
}
