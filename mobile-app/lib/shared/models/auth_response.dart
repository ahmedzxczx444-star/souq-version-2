import 'package:freezed_annotation/freezed_annotation.dart';

import 'user.dart';

part 'auth_response.freezed.dart';
part 'auth_response.g.dart';

/// Mirrors src/types.ts `AuthResponse` — the shape returned by
/// POST /api/auth/login and POST /api/auth/verify-otp (purpose=register).
@freezed
class AuthResponse with _$AuthResponse {
  const factory AuthResponse({
    required String token,
    required User user,
  }) = _AuthResponse;

  factory AuthResponse.fromJson(Map<String, dynamic> json) => _$AuthResponseFromJson(json);
}
