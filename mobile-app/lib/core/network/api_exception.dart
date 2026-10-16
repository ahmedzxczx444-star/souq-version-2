/// Thrown by ApiClient/repositories for any non-2xx response, mirroring the
/// `Error` objects src/services/api.ts throws (message + optional extra
/// fields like `requiresOtpVerification`/`email`/`cooldownSeconds`).
///
/// [kind] tells a server refusal (whose [message] is meant for the user)
/// apart from a request that never got an answer, so screens can show a
/// translated "no connection" / "timed out" text instead of Dio's English.
class ApiException implements Exception {
  ApiException(
    this.message, {
    this.statusCode,
    this.requiresOtpVerification = false,
    this.email,
    this.cooldownSeconds,
    this.kind = ApiErrorKind.server,
  });

  final String message;
  final int? statusCode;
  final bool requiresOtpVerification;
  final String? email;
  final int? cooldownSeconds;
  final ApiErrorKind kind;

  @override
  String toString() => message;
}

enum ApiErrorKind {
  /// The server answered with an error; [ApiException.message] is its text.
  server,

  /// No connection to the server (offline, DNS, refused, TLS failure).
  network,

  /// The server did not answer in time.
  timeout,
}
