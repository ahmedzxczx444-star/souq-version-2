import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';
import '../../../shared/models/dealer.dart';
import '../../../shared/models/dealer_profile.dart';

/// Mirrors the `dealers`/`reels` sections of src/services/api.ts.
class DealerRepository {
  DealerRepository(this._client);

  final ApiClient _client;

  /// GET /api/dealers?type=top — the backend's ranked top 6 (see server.ts).
  Future<List<Dealer>> getTop() => _list(query: {'type': 'top'});

  /// GET /api/dealers — every active dealer, in the backend's order.
  Future<List<Dealer>> getAll() => _list();

  Future<List<Dealer>> _list({Map<String, dynamic>? query}) async {
    final res = await _client.get(ApiEndpoints.dealers, query: query);
    return (res.data as List).map((e) => Dealer.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<DealerProfile> getProfile(int id) async {
    final res = await _client.get(ApiEndpoints.dealerById(id));
    return DealerProfile.fromJson(res.data as Map<String, dynamic>);
  }

  /// GET /api/reels — every active dealer's reels, newest first.
  Future<List<DealerReel>> getAllReels() async {
    final res = await _client.get(ApiEndpoints.reels);
    return (res.data as List).map((e) => DealerReel.fromJson(e as Map<String, dynamic>)).toList();
  }

  /// The site loads every reel and keeps this dealer's.
  Future<List<DealerReel>> getReels(int dealerId) async {
    return (await getAllReels()).where((r) => r.dealerId == dealerId).toList();
  }

  /// POST /api/reels/:id/like (auth) — toggles; returns the new state.
  Future<bool> toggleReelLike(int id) async {
    final res = await _client.post(ApiEndpoints.reelLike(id));
    return (res.data as Map<String, dynamic>)['liked'] == true;
  }

  /// POST /api/reels/:id/view — counts one playback.
  Future<void> recordReelView(int id) => _client.post(ApiEndpoints.reelView(id));

  Future<bool> getFollowStatus(int id) async {
    final res = await _client.get(ApiEndpoints.dealerFollowStatus(id));
    return (res.data as Map<String, dynamic>)['followed'] == true;
  }

  /// Toggles; returns the new state.
  Future<bool> toggleFollow(int id) async {
    final res = await _client.post(ApiEndpoints.dealerFollow(id));
    return (res.data as Map<String, dynamic>)['followed'] == true;
  }

  Future<void> rate(int id, int rating) => _client.post(ApiEndpoints.dealerRate(id), data: {'rating': rating});
}
