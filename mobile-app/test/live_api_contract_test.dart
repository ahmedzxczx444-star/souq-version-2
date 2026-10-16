// Opt-in, read-only check of the app's real repositories and models against a
// running backend. Skipped unless both are given:
//   flutter test test/live_api_contract_test.dart \
//     --dart-define=LIVE_API_CHECK=true \
//     --dart-define=API_BASE_URL=https://souq-elsyrat.com
//
// Only public GET endpoints are called, without a token. GET /api/cars/:id is
// left out on purpose: it increments the listing's view counter.
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_app/core/network/api_client.dart';
import 'package:mobile_app/core/network/api_endpoints.dart';
import 'package:mobile_app/core/network/api_exception.dart';
import 'package:mobile_app/core/storage/token_storage.dart';
import 'package:mobile_app/features/cars/data/car_repository.dart';
import 'package:mobile_app/features/dealers/data/dealer_repository.dart';

const _enabled = bool.fromEnvironment('LIVE_API_CHECK');

class _NoToken extends TokenStorage {
  _NoToken() : super(const FlutterSecureStorage());

  @override
  Future<String?> readToken() async => null;
}

void main() {
  final skip = _enabled ? false : 'Set --dart-define=LIVE_API_CHECK=true to run against a live backend.';
  late ApiClient client;
  late CarRepository cars;
  late DealerRepository dealers;

  setUpAll(() {
    client = ApiClient(_NoToken());
    cars = CarRepository(client);
    dealers = DealerRepository(client);
  });

  test('the backend answers its health check', () async {
    final res = await client.get('/api/health');
    expect((res.data as Map)['status'], 'ok');
  }, skip: skip);

  test('the home feed parses into cars with usable images and dealers', () async {
    final list = await cars.getAll();
    expect(list, isNotEmpty);
    for (final car in list) {
      expect(car.id, greaterThan(0));
      expect(car.make, isNotEmpty);
      for (final url in car.images) {
        expect(Uri.parse(ApiConfig.resolveUrl(url)).isAbsolute, isTrue, reason: url);
      }
    }
  }, skip: skip);

  test('search, top dealers and the dealer list parse', () async {
    final result = await cars.search('a');
    expect(result.cars, isA<List>());
    expect(await cars.getTopDealers(), isA<List>());
    expect(await dealers.getAll(), isNotEmpty);
  }, skip: skip);

  test('a dealer profile and its reels parse', () async {
    final all = await dealers.getAll();
    final profile = await dealers.getProfile(all.first.id);
    expect(profile.dealer.id, all.first.id);
    expect(await dealers.getReels(all.first.id), isA<List>());
    expect(await dealers.getAllReels(), isA<List>());
  }, skip: skip);

  test('signed-in endpoints refuse a request without a token', () async {
    await expectLater(cars.getFavorites(), throwsA(isA<ApiException>().having((e) => e.statusCode, 'status', 401)));
  }, skip: skip);
}
