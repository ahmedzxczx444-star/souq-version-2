/// Mirrors src/constants/config.ts. Keep values in sync manually — there is
/// no shared build step between the web and mobile clients.
class FeatureFlags {
  FeatureFlags._();

  static const bool subscriptionsEnabled = false;
  static const bool dealerCategoriesEnabled = true;
  static const bool partsMarketplaceEnabled = true;
}
