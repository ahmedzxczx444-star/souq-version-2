import 'package:freezed_annotation/freezed_annotation.dart';

part 'part.freezed.dart';
part 'part.g.dart';

/// Minimal stub mirroring src/types.ts `Part` — only the fields the parts
/// marketplace placeholder screen needs. Fill this out to match the full
/// interface (part_number, manufacturer, compatibility[], etc.) when the
/// parts marketplace feature is built out (see routes/parts.ts).
@freezed
class Part with _$Part {
  const factory Part({
    required int id,
    @JsonKey(name: 'dealer_id') required int dealerId,
    required String name,
    required List<String> images,
    num? price,
    required String status,
  }) = _Part;

  factory Part.fromJson(Map<String, dynamic> json) => _$PartFromJson(json);
}
