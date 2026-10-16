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
import '../../features/dealers/presentation/dealer_dashboard_screen.dart';
import '../../features/dealers/presentation/dealer_profile_screen.dart';
import '../../features/dealers/data/dealer_account.dart';
import '../../features/dealers/data/dealer_tools_repository.dart';
import '../../features/dealers/presentation/manage/dealer_reels_screen.dart';
import '../../features/dealers/presentation/manage/dealer_tool_gate.dart';
import '../../features/dealers/presentation/manage/dealer_widgets.dart';
import '../../features/dealers/presentation/manage/resource_list_screen.dart';
import '../../shared/models/car.dart';
import '../../shared/models/user.dart';
import '../../features/ai/presentation/ai_search_screen.dart';
import '../../features/notifications/presentation/notifications_screen.dart';
import '../../features/parts/presentation/add_part_screen.dart';
import '../../features/parts/presentation/my_part_orders_screen.dart';
import '../../features/parts/presentation/part_details_screen.dart';
import '../../features/parts/presentation/parts_marketplace_screen.dart';
import '../../features/profile/presentation/edit_profile_screen.dart';
import '../../features/profile/presentation/legal_screens.dart';
import '../../features/profile/presentation/profile_screen.dart';
import '../../features/profile/presentation/settings_screen.dart';
import '../../features/dealers/data/resource_specs.dart';
import '../../shared/providers/auth_provider.dart';
import '../../shared/providers/language_provider.dart';
import '../../shared/widgets/main_shell.dart';

/// Routes that require a signed-in user. Unauthenticated visits redirect to
/// /login, mirroring src/App.tsx rendering <AuthScreen> inline for the
/// "favorites"/"profile" tabs when `user` is null.
const _protectedRoutePrefixes = [
  '/favorites',
  '/profile',
  '/edit-profile',
  '/notifications',
  '/my-part-orders',
  ..._dealerRoutePrefixes,
];

/// Dealer management screens: signed-in dealers only. Each screen also
/// checks the dealer type (DealerToolGate), and the API checks both again.
const _dealerRoutePrefixes = [
  '/dealer-dashboard',
  '/dealer-reels',
  '/dealer-manage',
  '/add-car',
  '/edit-car',
  '/add-part',
  '/edit-part',
];

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
      if (_dealerRoutePrefixes.any(location.startsWith) && !(authState.valueOrNull?.isDealer ?? false)) {
        return '/profile';
      }
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
      GoRoute(
        path: '/part/:id',
        builder: (context, state) => PartDetailsScreen(partId: int.parse(state.pathParameters['id']!)),
      ),
      GoRoute(path: '/my-part-orders', builder: (context, state) => const MyPartOrdersScreen()),
      GoRoute(path: '/compare', builder: (context, state) => const CompareCarsScreen()),
      GoRoute(path: '/notifications', builder: (context, state) => const NotificationsScreen()),
      GoRoute(path: '/settings', builder: (context, state) => const SettingsScreen()),
      GoRoute(path: '/terms', builder: (context, state) => const TermsScreen()),
      GoRoute(path: '/privacy', builder: (context, state) => const PrivacyScreen()),
      GoRoute(path: '/contact', builder: (context, state) => const ContactScreen()),
      GoRoute(
        path: '/add-car',
        builder: (context, state) => DealerToolGate(tool: DealerTool.addCar, builder: (_) => const AddCarScreen()),
      ),
      GoRoute(
        path: '/edit-car/:id',
        builder: (context, state) => DealerToolGate(
          tool: DealerTool.addCar,
          builder: (_) => _EditLoader<Car>(
            initial: state.extra is Car ? state.extra as Car : null,
            provider: dealerCarsProvider,
            matches: (car) => '${car.id}' == state.pathParameters['id'],
            builder: (car) => AddCarScreen(car: car),
          ),
        ),
      ),
      GoRoute(
        path: '/add-part',
        builder: (context, state) => DealerToolGate(tool: DealerTool.addPart, builder: (_) => const AddPartScreen()),
      ),
      GoRoute(
        path: '/edit-part/:id',
        builder: (context, state) => DealerToolGate(
          tool: DealerTool.addPart,
          builder: (_) => _EditLoader<PartItem>(
            initial: state.extra is PartItem ? state.extra as PartItem : null,
            provider: dealerPartsProvider,
            matches: (part) => '${part.id}' == state.pathParameters['id'],
            builder: (part) => AddPartScreen(part: part),
          ),
        ),
      ),
      GoRoute(
        path: '/dealer-reels',
        builder: (context, state) => DealerToolGate(tool: DealerTool.reels, builder: (_) => const DealerReelsScreen()),
      ),
      GoRoute(
        path: '/dealer-manage/:tool',
        builder: (context, state) {
          final tool = DealerTool.values.where((t) => t.name == state.pathParameters['tool']).firstOrNull;
          if (tool == null || !resourceSpecs.containsKey(tool)) return const DealerDashboardScreen();
          return DealerToolGate(tool: tool, builder: (_) => ResourceListScreen(tool: tool));
        },
      ),
      GoRoute(path: '/edit-profile', builder: (context, state) => const EditProfileScreen()),
      GoRoute(path: '/dealer-dashboard', builder: (context, state) => const DealerDashboardScreen()),
    ],
  );
});

/// Opens an edit screen for the record passed along with the navigation,
/// or — when the route is opened directly — finds it in the dealer's own list.
class _EditLoader<T> extends ConsumerWidget {
  const _EditLoader({required this.initial, required this.provider, required this.matches, required this.builder});

  final T? initial;
  final ProviderListenable<AsyncValue<List<T>>> provider;
  final bool Function(T item) matches;
  final Widget Function(T item) builder;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (initial != null) return builder(initial as T);
    final strings = ref.watch(stringsProvider);
    return ref.watch(provider).when(
          loading: () => const Scaffold(body: LoadingView()),
          error: (e, _) => Scaffold(body: Center(child: Text(errorMessage(e, strings)))),
          data: (items) {
            final found = items.where(matches).firstOrNull;
            return found == null ? const DealerDashboardScreen() : builder(found);
          },
        );
  }
}
