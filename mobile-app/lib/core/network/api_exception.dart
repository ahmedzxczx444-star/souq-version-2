/// Thrown by ApiClient/repositories for any non-2xx response, mirroring the
/// `Error` objects src/services/api.ts throws (message + optional extra
/// fields like `requiresOtpVerification`/`email`/`cooldownSeconds`).
class ApiException implements Exception {
  ApiException(
    this.message, {
    this.statusCode,
    this.requiresOtpVerification = false,
    this.email,
    this.cooldownSeconds,
  });

  final String message;
  final int? statusCode;
  final bool requiresOtpVerification;
  final String? email;
  final int? cooldownSeconds;

  @override
  String toString() => message;
}
