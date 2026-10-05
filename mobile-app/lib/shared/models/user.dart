import 'package:freezed_annotation/freezed_annotation.dart';

part 'user.freezed.dart';
part 'user.g.dart';

/// Mirrors src/types.ts `User`. Field casing follows the JSON exactly as
/// returned by server.ts (mostly camelCase here, except `is_verified`,
/// which server.ts's `/api/auth/me` passes through straight from the DB
/// column) — do not apply a blanket snake_case converter to this class.
@freezed
class User with _$User {
  const factory User({
    required int id,
    required String email,
    required String name,
    String? role,
    int? dealerId,
    String? planType,
    @JsonKey(name: 'is_verified') bool? isVerified,
  }) = _User;

  factory User.fromJson(Map<String, dynamic> json) => _$UserFromJson(json);
}

extension UserRoleX on User {
  bool get isDealer => role == 'dealer';
  bool get isSuperAdmin => role == 'super_admin';
}
