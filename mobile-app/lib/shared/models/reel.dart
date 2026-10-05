import 'package:freezed_annotation/freezed_annotation.dart';

part 'reel.freezed.dart';
part 'reel.g.dart';

/// Minimal stub mirroring src/types.ts `Reel`. Fill this out (caption,
/// car_id, dealer info) when the Reels tab is built (see server.ts
/// GET /api/reels).
@freezed
class Reel with _$Reel {
  const factory Reel({
    required int id,
    @JsonKey(name: 'dealer_id') required int dealerId,
    @JsonKey(name: 'video_url') required String videoUrl,
    required String caption,
    @Default(0) num views,
    @Default(0) num likes,
  }) = _Reel;

  factory Reel.fromJson(Map<String, dynamic> json) => _$ReelFromJson(json);
}
