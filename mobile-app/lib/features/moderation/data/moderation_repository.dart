import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';
import '../../../shared/providers/auth_provider.dart';
import '../../../shared/providers/core_providers.dart';

/// What can be reported; the names are routes/moderation.ts `REPORT_TARGETS`.
enum ReportTarget { car, reel, part, dealer, user }

/// The reasons routes/moderation.ts accepts, in the order the sheet shows.
const reportReasons = ['fraud', 'misleading', 'spam', 'inappropriate', 'offensive', 'other'];

/// The longest details text the server accepts.
const reportDetailsMax = 500;

/// A dealer or user the signed-in account blocked (GET /api/blocks).
class BlockedAccount {
  const BlockedAccount({required this.userId, this.dealerId, this.name});

  final int userId;
  final int? dealerId;
  final String? name;

  factory BlockedAccount.fromJson(Map<String, dynamic> json) => BlockedAccount(
        userId: (json['user_id'] as num).toInt(),
        dealerId: (json['dealer_id'] as num?)?.toInt(),
        name: json['name'] as String?,
      );
}

/// Reports and blocks (routes/moderation.ts). Every call needs a signed-in
/// account; the server decides who may report or block what.
class ModerationRepository {
  ModerationRepository(this._client);

  final ApiClient _client;

  /// Sends a report. Returns true when this account had already reported the
  /// same content and that report is still open (the server keeps one).
  Future<bool> report(ReportTarget target, int targetId, {required String reason, String? details}) async {
    final res = await _client.post(ApiEndpoints.reports, data: {
      'target_type': target.name,
      'target_id': targetId,
      'reason': reason,
      if (details != null && details.trim().isNotEmpty) 'details': details.trim(),
    });
    return (res.data as Map<String, dynamic>)['alreadyReported'] == true;
  }

  Future<List<BlockedAccount>> blocks() async {
    final res = await _client.get(ApiEndpoints.blocks);
    return [
      for (final b in (res.data as List?) ?? const [])
        if (b is Map<String, dynamic>) BlockedAccount.fromJson(b),
    ];
  }

  Future<void> blockDealer(int dealerId) => _client.post(ApiEndpoints.blocks, data: {'dealer_id': dealerId});

  Future<void> unblock(int userId) => _client.delete(ApiEndpoints.unblock(userId));
}

final moderationRepositoryProvider = Provider<ModerationRepository>(
  (ref) => ModerationRepository(ref.watch(apiClientProvider)),
);

/// The accounts the signed-in user blocked; empty for guests.
class BlockedAccountsNotifier extends AsyncNotifier<List<BlockedAccount>> {
  @override
  FutureOr<List<BlockedAccount>> build() async {
    final user = await ref.watch(authProvider.future);
    if (user == null) return const [];
    return ref.watch(moderationRepositoryProvider).blocks();
  }

  Future<void> blockDealer(int dealerId) async {
    await ref.read(moderationRepositoryProvider).blockDealer(dealerId);
    state = AsyncData(await ref.read(moderationRepositoryProvider).blocks());
  }

  Future<void> unblock(int userId) async {
    await ref.read(moderationRepositoryProvider).unblock(userId);
    state = AsyncData([...?state.valueOrNull?.where((b) => b.userId != userId)]);
  }
}

final blockedAccountsProvider =
    AsyncNotifierProvider<BlockedAccountsNotifier, List<BlockedAccount>>(BlockedAccountsNotifier.new);

/// Dealer ids whose cars, reels and parts are hidden from this user. A failed
/// load hides nothing rather than blocking the whole app.
final blockedDealerIdsProvider = Provider<Set<int>>((ref) {
  final blocks = ref.watch(blockedAccountsProvider).valueOrNull ?? const [];
  return {for (final b in blocks) if (b.dealerId != null) b.dealerId!};
});
