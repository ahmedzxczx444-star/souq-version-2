import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/presentation/auth_screen.dart';
import '../../features/auth/presentation/onboarding_screen.dart';
import '../../features/auth/presentation/otp_screen.dart';
import '../../features/auth/presentation/splash_screen.dart';
import '../../features/cars/presentation/add_car_screen.dart';
import '../../features/cars/presentation/car_details_screen.dart';
import '../../features/cars/presentation/compare_cars_screen.dart';
import '../../features/cars/presentation/favorites_screen.dart';
import '../../features/cars/presentation/featured_cars_screen.dart';
import '../../features/cars/presentation/home_screen.dart';
import '../../features/cars/presentation/reels_screen.dart';
import '../../features/cars/presentation/search_results_screen.dart';
import '../../features/dealers/presentation/all_dealers_screen.dart';
import '../../features/dealers/presentation/dealer_categories_screen.dart';
import '../../features/dealers/presentation/dealer_dashboard_screen.dart';
import '../../features/dealers/presentation/dealer_profile_screen.dart';
import '../../features/ai/presentation/ai_search_screen.dart';
import '../../features/notifications/presentation/notifications_screen.dart';
import '../../features/parts/presentation/add_part_screen.dart';
import '../../features/parts/presentation/parts_marketplace_screen.dart';
import '../../features/profile/presentation/edit_profile_screen.dart';
import '../../features/profile/presentation/profile_screen.dart';
import '../../features/profile/presentation/settings_screen.dart';
import '../../features/subscriptions/presentation/subscription_screen.dart';
import '../../shared/providers/auth_provider.dart';
import '../../shared/widgets/main_shell.dart';

/// Routes that require a signed-in user. Unauthenticated visits redirect to
/// /login, mirroring src/App.tsx rendering <AuthScreen> inline for the
/// "favorites"/"profile" tabs when `user` is null.
const _protectedRoutePrefixes = ['/favorites', '/profile', '/add-car', '/edit-profile'];

class _RouterRefresh extends ChangeNotifier {
  _RouterRefresh(Ref ref) {
    ref.listen(authProvider, (_, __) => notifyListeners());
  }
}

final routerProvider = Provider<GoRouter>((ref) {
  final refresh = _RouterRefresh(ref);

  return GoRouter(
    initialLocation: '/splash',
    refreshListenable: refresh,
    redirect: (context, state) {
      final authState = ref.read(authProvider);
      if (authState.isLoading) return null;

      final loggedIn = authState.valueOrNull != null;
      final location = state.matchedLocation;
      final isProtected = _protectedRoutePrefixes.any(location.startsWith);
      final isAuthRoute = location == '/login' || location == '/otp';

      if (isProtected && !loggedIn) return '/login';
      if (isAuthRoute && loggedIn) return '/home';
      return null;
    },
    routes: [
      GoRoute(path: '/splash', builder: (context, state) => const SplashScreen()),
      GoRoute(path: '/onboarding', builder: (context, state) => const OnboardingScreen()),
      GoRoute(path: '/login', builder: (context, state) => const AuthScreen()),
      GoRoute(
        path: '/otp',
        builder: (context, state) => OtpScreen(
          email: state.uri.queryParameters['email'] ?? '',
          purpose: state.uri.queryParameters['purpose'] ?? 'register',
        ),
      ),
      StatefulShellRoute.indexedStack(
        builder: (context, state, shell) => MainShell(navigationShell: shell),
        branches: [
          StatefulShellBranch(routes: [
            GoRoute(path: '/home', builder: (context, state) => const HomeScreen()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: '/reels', builder: (context, state) => const ReelsScreen()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: '/favorites', builder: (context, state) => const FavoritesScreen()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: '/profile', builder: (context, state) => const ProfileScreen()),
          ]),
        ],
      ),
      GoRoute(
        path: '/search',
        builder: (context, state) => SearchResultsScreen(query: state.uri.queryParameters['q'] ?? ''),
      ),
      GoRoute(
        path: '/car/:id',
        builder: (context, state) => CarDetailsScreen(carId: int.parse(state.pathParameters['id']!)),
      ),
      GoRoute(
        path: '/dealer/:id',
        builder: (context, state) => DealerProfileScreen(dealerId: int.parse(state.pathParameters['id']!)),
      ),
      GoRoute(path: '/dealers', builder: (context, state) => const AllDealersScreen()),
      GoRoute(path: '/featured-cars', builder: (context, state) => const FeaturedCarsScreen()),
      GoRoute(path: '/ai-search', builder: (context, state) => const AiSearchScreen()),
      GoRoute(path: '/parts', builder: (context, state) => const PartsMarketplaceScreen()),
      GoRoute(path: '/compare', builder: (context, state) => const CompareCarsScreen()),
      GoRoute(path: '/notifications', builder: (context, state) => const NotificationsScreen()),
      GoRoute(path: '/settings', builder: (context, state) => const SettingsScreen()),
      GoRoute(path: '/add-car', builder: (context, state) => const AddCarScreen()),
      GoRoute(path: '/add-part', builder: (context, state) => const AddPartScreen()),
      GoRoute(path: '/edit-profile', builder: (context, state) => const EditProfileScreen()),
      GoRoute(path: '/dealer-dashboard', builder: (context, state) => const DealerDashboardScreen()),
      GoRoute(path: '/dealer-categories', builder: (context, state) => const DealerCategoriesScreen()),
      GoRoute(path: '/subscription', builder: (context, state) => const SubscriptionScreen()),
    ],
  );
});
