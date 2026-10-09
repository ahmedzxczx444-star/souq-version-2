import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../core/network/api_client.dart';
import '../../core/storage/app_prefs.dart';
import '../../core/storage/token_storage.dart';
import '../../features/auth/data/auth_repository.dart';
import '../../features/cars/data/car_repository.dart';
import '../../features/dealers/data/dealer_repository.dart';
import 'auth_provider.dart';

/// Overridden in main.dart once SharedPreferences.getInstance() resolves —
/// everything that needs prefs synchronously (AppPrefs, language) depends
/// on this instead of doing its own async init.
final sharedPreferencesProvider = Provider<SharedPreferences>(
  (ref) => throw UnimplementedError('sharedPreferencesProvider must be overridden in main()'),
);

final appPrefsProvider = Provider<AppPrefs>((ref) => AppPrefs(ref.watch(sharedPreferencesProvider)));

final secureStorageProvider = Provider<FlutterSecureStorage>((ref) => const FlutterSecureStorage());

final tokenStorageProvider = Provider<TokenStorage>(
  (ref) => TokenStorage(ref.watch(secureStorageProvider)),
);

final apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient(
    ref.watch(tokenStorageProvider),
    onUnauthorized: () => ref.read(authProvider.notifier).forceLogout(),
  );
});

final authRepositoryProvider = Provider<AuthRepository>(
  (ref) => AuthRepository(ref.watch(apiClientProvider)),
);

final dealerRepositoryProvider = Provider<DealerRepository>(
  (ref) => DealerRepository(ref.watch(apiClientProvider)),
);

final carRepositoryProvider = Provider<CarRepository>(
  (ref) => CarRepository(ref.watch(apiClientProvider)),
);
