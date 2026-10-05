import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/auth_response.dart';
import '../models/user.dart';
import 'core_providers.dart';

/// Holds the signed-in user (or null). Backed by TokenStorage
/// (flutter_secure_storage) so it survives app restarts, mirroring the
/// website's localStorage("user"/"token") pair in src/App.tsx.
class AuthNotifier extends AsyncNotifier<User?> {
  @override
  FutureOr<User?> build() async {
    final storage = ref.watch(tokenStorageProvider);
    final token = await storage.readToken();
    if (token == null) return null;
    return storage.readUser();
  }

  Future<void> applyAuthResponse(AuthResponse response) async {
    await ref.read(tokenStorageProvider).save(token: response.token, user: response.user);
    state = AsyncData(response.user);
  }

  Future<void> logout() async {
    await ref.read(tokenStorageProvider).clear();
    state = const AsyncData(null);
  }

  /// Called by ApiClient's 401 interceptor. There's no refresh-token
  /// endpoint on the backend (JWT is a flat 1h expiry — see server.ts), so
  /// any 401 means the session is gone and the user must sign in again.
  void forceLogout() {
    unawaited(logout());
  }
}

final authProvider = AsyncNotifierProvider<AuthNotifier, User?>(AuthNotifier.new);
