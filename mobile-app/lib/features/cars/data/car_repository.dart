import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';
import '../../../shared/models/car.dart';
import '../../../shared/models/dealer.dart';

class SearchResult {
  SearchResult({required this.cars, required this.noExactMatch});

  final List<Car> cars;
  final bool noExactMatch;
}

/// Mirrors the `cars`/`dealers`/`search`/`favorites` sections of
/// src/services/api.ts against server.ts's public GET /api/cars,
/// /api/cars/:id, /api/search, /api/dealers, and the authenticated
/// /api/favorites endpoints.
class CarRepository {
  CarRepository(this._client);

  final ApiClient _client;

  Future<List<Car>> getAll() async {
    final res = await _client.get(ApiEndpoints.cars);
    return (res.data as List).map((e) => Car.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<Car> getById(int id) async {
    final res = await _client.get(ApiEndpoints.carById(id));
    return Car.fromJson(res.data as Map<String, dynamic>);
  }

  Future<SearchResult> search(String query) async {
    final res = await _client.get(ApiEndpoints.search, query: {'q': query});
    final body = res.data as Map<String, dynamic>;
    final cars = (body['results'] as List).map((e) => Car.fromJson(e as Map<String, dynamic>)).toList();
    return SearchResult(cars: cars, noExactMatch: body['noExactMatch'] == true);
  }

  Future<List<Dealer>> getTopDealers() async {
    final res = await _client.get(ApiEndpoints.dealers, query: {'type': 'top'});
    return (res.data as List).map((e) => Dealer.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<Car>> getFavorites() async {
    final res = await _client.get(ApiEndpoints.favorites);
    return (res.data as List).map((e) => Car.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<void> toggleFavorite(int carId) => _client.post(ApiEndpoints.favoriteToggle(carId));
}
