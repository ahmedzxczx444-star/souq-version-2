import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';
import '../../../shared/models/car.dart';
import '../../../shared/models/dealer_profile.dart';
import '../../../shared/providers/auth_provider.dart';
import '../../../shared/providers/core_providers.dart';
import 'dealer_account.dart';

/// Everything a signed-in dealer manages: profile, listings, media, reels,
/// parts, and the type-specific records (branches, shipments, offers...).
/// Each call maps to one backend route; the server decides who may use it.
class DealerToolsRepository {
  DealerToolsRepository(this._client);

  final ApiClient _client;

  // --- Account ---

  Future<DealerAccount> account() async {
    final res = await _client.get(ApiEndpoints.dealerProfile);
    return DealerAccount.fromJson(res.data as Map<String, dynamic>);
  }

  Future<void> updateProfile(Map<String, dynamic> body) => _client.put(ApiEndpoints.dealerProfile, data: body);

  Future<DealerStats> stats() async {
    final res = await _client.get(ApiEndpoints.dealerStats);
    return DealerStats.fromJson(res.data as Map<String, dynamic>);
  }

  Future<PartsStats> partsStats() async {
    final res = await _client.get(ApiEndpoints.partsStats);
    return PartsStats.fromJson(res.data as Map<String, dynamic>);
  }

  Future<ChainOverview> chainOverview() async {
    final res = await _client.get(ApiEndpoints.chainOverview);
    return ChainOverview.fromJson(res.data as Map<String, dynamic>);
  }

  // --- Car listings ---

  Future<List<Car>> myCars() async {
    final res = await _client.get(ApiEndpoints.dealerCars);
    return (res.data as List).map((e) => Car.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<int> createCar(Map<String, dynamic> body) async {
    final res = await _client.post(ApiEndpoints.cars, data: body);
    return ((res.data as Map<String, dynamic>)['id'] as num).toInt();
  }

  Future<void> updateCar(int id, Map<String, dynamic> body) => _client.put(ApiEndpoints.carById(id), data: body);

  Future<void> deleteCar(int id) => _client.delete(ApiEndpoints.carById(id));

  // --- Media ---

  /// POST /api/cars/upload — returns the stored `/uploads/cars/...` paths.
  Future<List<String>> uploadPhotos(List<PickedMedia> photos) async {
    final res = await _client.upload(
      ApiEndpoints.carImagesUpload,
      field: 'images',
      files: [
        for (final p in photos)
          (path: p.path, name: p.name, mimeType: UploadRules.photoTypes[p.extension] ?? 'application/octet-stream'),
      ],
    );
    return ((res.data as Map<String, dynamic>)['images'] as List).map((e) => '$e').toList();
  }

  /// POST /api/reels/upload — returns the stored `/uploads/reels/...` path.
  Future<String> uploadVideo(PickedMedia video, {void Function(double fraction)? onProgress}) async {
    final res = await _client.upload(
      ApiEndpoints.reelUpload,
      field: 'video',
      files: [(path: video.path, name: video.name, mimeType: UploadRules.videoTypes[video.extension] ?? 'video/mp4')],
      onProgress: onProgress == null ? null : (sent, total) => onProgress(total > 0 ? sent / total : 0),
    );
    return (res.data as Map<String, dynamic>)['video_url'] as String;
  }

  // --- Reels ---

  Future<List<DealerReel>> myReels() async {
    final res = await _client.get(ApiEndpoints.dealerReels);
    return (res.data as List).map((e) => DealerReel.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<void> createReel({required String videoUrl, String caption = '', int? carId}) =>
      _client.post(ApiEndpoints.reels, data: {'video_url': videoUrl, 'caption': caption, 'car_id': carId});

  Future<void> deleteReel(int id) => _client.delete(ApiEndpoints.reelById(id));

  // --- Parts ---

  Future<List<PartItem>> parts() async {
    final res = await _client.get(ApiEndpoints.parts);
    return (res.data as List).map((e) => PartItem.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<void> createPart(Map<String, dynamic> body) => _client.post(ApiEndpoints.parts, data: body);

  Future<void> updatePart(int id, Map<String, dynamic> body) => _client.put(ApiEndpoints.partById(id), data: body);

  Future<void> setPartStatus(int id, String status) =>
      _client.put(ApiEndpoints.partStatus(id), data: {'status': status});

  Future<void> deletePart(int id) => _client.delete(ApiEndpoints.partById(id));

  // --- Type-specific records (see resource_specs.dart) ---

  Future<List<Map<String, dynamic>>> records(String path) async {
    final res = await _client.get(path);
    return (res.data as List).map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }

  Future<void> createRecord(String path, Map<String, dynamic> body) => _client.post(path, data: body);

  Future<void> updateRecord(String path, Map<String, dynamic> body) => _client.put(path, data: body);

  Future<void> deleteRecord(String path) => _client.delete(path);
}

final dealerToolsRepositoryProvider = Provider<DealerToolsRepository>(
  (ref) => DealerToolsRepository(ref.watch(apiClientProvider)),
);

/// The signed-in dealer's account. Rebuilt when the user changes, so one
/// dealer's data is never shown to the next person who signs in.
final dealerAccountProvider = FutureProvider.autoDispose<DealerAccount>((ref) {
  ref.watch(authProvider);
  return ref.watch(dealerToolsRepositoryProvider).account();
});

final dealerCarsProvider = FutureProvider.autoDispose<List<Car>>((ref) {
  ref.watch(authProvider);
  return ref.watch(dealerToolsRepositoryProvider).myCars();
});

final dealerPartsProvider = FutureProvider.autoDispose<List<PartItem>>((ref) {
  ref.watch(authProvider);
  return ref.watch(dealerToolsRepositoryProvider).parts();
});

final dealerReelsProvider = FutureProvider.autoDispose<List<DealerReel>>((ref) {
  ref.watch(authProvider);
  return ref.watch(dealerToolsRepositoryProvider).myReels();
});

/// Picks photos and videos from the device. An interface so screens can be
/// tested without the platform plugin.
abstract class MediaPicker {
  Future<List<PickedMedia>> pickPhotos({required int limit});
  Future<PickedMedia?> pickVideo();
}

class DeviceMediaPicker implements MediaPicker {
  final _picker = ImagePicker();

  Future<PickedMedia> _toMedia(XFile file) async =>
      PickedMedia(path: file.path, name: file.name, sizeBytes: await file.length());

  @override
  Future<List<PickedMedia>> pickPhotos({required int limit}) async {
    if (limit <= 0) return const [];
    if (limit == 1) {
      final one = await _picker.pickImage(source: ImageSource.gallery);
      return one == null ? const [] : [await _toMedia(one)];
    }
    final many = await _picker.pickMultiImage(limit: limit);
    return [for (final f in many.take(limit)) await _toMedia(f)];
  }

  @override
  Future<PickedMedia?> pickVideo() async {
    final file = await _picker.pickVideo(source: ImageSource.gallery, maxDuration: const Duration(minutes: 3));
    return file == null ? null : _toMedia(file);
  }
}

final mediaPickerProvider = Provider<MediaPicker>((ref) => DeviceMediaPicker());

/// The full body PUT /api/cars/:id expects, from an existing listing —
/// used to change one thing (e.g. the status) without losing the rest.
Map<String, dynamic> listingBody(Car car, {String? status}) => {
      'make': car.make,
      'model': car.model,
      'year': car.year,
      'price': car.price,
      'mileage': car.mileage,
      'location': car.location,
      'fuel_type': car.fuelType,
      'transmission': car.transmission,
      'description': car.description,
      'images': car.images,
      'status': status ?? car.status,
    };

final dealerStatsProvider = FutureProvider.autoDispose<DealerStats>((ref) {
  ref.watch(authProvider);
  return ref.watch(dealerToolsRepositoryProvider).stats();
});

final partsStatsProvider = FutureProvider.autoDispose<PartsStats>((ref) {
  ref.watch(authProvider);
  return ref.watch(dealerToolsRepositoryProvider).partsStats();
});

final chainOverviewProvider = FutureProvider.autoDispose<ChainOverview>((ref) {
  ref.watch(authProvider);
  return ref.watch(dealerToolsRepositoryProvider).chainOverview();
});
