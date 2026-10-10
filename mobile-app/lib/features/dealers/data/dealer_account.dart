import '../../../core/network/api_endpoints.dart';

/// The dashboards the backend distinguishes (dealers.business_type +
/// dealers.dealer_category — see routes/dealerContext.ts `dealerTypeError`).
enum DealerKind { single, multiBranch, chain, importer, officialAgent, parts }

DealerKind dealerKindOf({String? businessType, String? dealerCategory}) {
  if (businessType == 'parts_dealer') return DealerKind.parts;
  switch (dealerCategory) {
    case 'multi_branch':
      return DealerKind.multiBranch;
    case 'chain':
      return DealerKind.chain;
    case 'importer':
      return DealerKind.importer;
    case 'official_agent':
      return DealerKind.officialAgent;
    default:
      return DealerKind.single;
  }
}

/// Every management area the app offers a dealer.
enum DealerTool {
  addCar,
  reels,
  profile,
  branches,
  employees,
  warehouses,
  shipments,
  preorders,
  serviceCenters,
  offers,
  warranties,
  addPart,
  partOrders,
}

/// Which areas each dealer type gets. This mirrors what the API accepts
/// (tests/roles.test.ts): the app never shows a tool the server would
/// refuse, and the server refuses it regardless of what the app shows.
List<DealerTool> toolsFor(DealerKind kind) {
  const shared = [DealerTool.addCar, DealerTool.reels, DealerTool.profile];
  switch (kind) {
    case DealerKind.single:
      return shared;
    case DealerKind.multiBranch:
    case DealerKind.chain:
      return [...shared, DealerTool.branches, DealerTool.employees];
    case DealerKind.importer:
      return [...shared, DealerTool.warehouses, DealerTool.shipments, DealerTool.preorders];
    case DealerKind.officialAgent:
      return [...shared, DealerTool.serviceCenters, DealerTool.offers, DealerTool.warranties];
    case DealerKind.parts:
      return [DealerTool.addPart, DealerTool.partOrders, DealerTool.profile];
  }
}

extension DealerKindX on DealerKind {
  /// Car listings (and reels) are for car dealers; parts dealers manage a
  /// parts inventory instead.
  bool get sellsCars => this != DealerKind.parts;

  /// Branches live in their own API for these types; everyone else edits
  /// a simple branch list through the profile.
  bool get hasBranchManagement => this == DealerKind.multiBranch || this == DealerKind.chain;
}

class AccountBranch {
  const AccountBranch({this.name = '', this.address = '', this.phone = '', this.mapLink = ''});

  final String name;
  final String address;
  final String phone;
  final String mapLink;

  factory AccountBranch.fromJson(Map<String, dynamic> json) => AccountBranch(
        name: (json['name'] ?? '') as String,
        address: (json['address'] ?? '') as String,
        phone: (json['phone'] ?? '') as String,
        mapLink: (json['map_link'] ?? '') as String,
      );

  Map<String, dynamic> toJson() => {
        'name': name,
        'address': address,
        if (phone.isNotEmpty) 'phone': phone,
        if (mapLink.isNotEmpty) 'map_link': mapLink,
      };
}

/// GET /api/dealer/profile — the signed-in dealer's own record.
class DealerAccount {
  const DealerAccount({
    required this.id,
    required this.name,
    required this.status,
    required this.kind,
    this.logo = '',
    this.description = '',
    this.location = '',
    this.phone = '',
    this.whatsapp = '',
    this.address = '',
    this.mapLink = '',
    this.branches = const [],
  });

  final int id;
  final String name;

  /// 'pending' | 'active' | 'suspended' (set by an administrator).
  final String status;
  final DealerKind kind;
  final String logo;
  final String description;
  final String location;
  final String phone;
  final String whatsapp;
  final String address;
  final String mapLink;
  final List<AccountBranch> branches;

  bool get isActive => status == 'active';

  factory DealerAccount.fromJson(Map<String, dynamic> json) => DealerAccount(
        id: (json['id'] as num).toInt(),
        name: (json['name'] ?? '') as String,
        status: (json['status'] ?? 'pending') as String,
        kind: dealerKindOf(
          businessType: json['business_type'] as String?,
          dealerCategory: json['dealer_category'] as String?,
        ),
        logo: (json['logo'] ?? '') as String,
        description: (json['description'] ?? '') as String,
        location: (json['location'] ?? '') as String,
        phone: (json['phone'] ?? '') as String,
        whatsapp: (json['whatsapp_number'] ?? '') as String,
        address: (json['address'] ?? '') as String,
        mapLink: (json['map_location_link'] ?? '') as String,
        branches: ((json['branches'] as List?) ?? const [])
            .map((e) => AccountBranch.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}

int _int(dynamic v) => v is num ? v.toInt() : int.tryParse('$v') ?? 0;

/// GET /api/dealer/stats.
class DealerStats {
  const DealerStats({this.totalCars = 0, this.totalFollowers = 0, this.totalLikes = 0});

  final int totalCars;
  final int totalFollowers;
  final int totalLikes;

  factory DealerStats.fromJson(Map<String, dynamic> json) => DealerStats(
        totalCars: _int(json['totalCars']),
        totalFollowers: _int(json['totalFollowers']),
        totalLikes: _int(json['totalLikes']),
      );
}

/// GET /api/parts/dealer/stats.
class PartsStats {
  const PartsStats({this.totalParts = 0, this.availableParts = 0, this.totalViews = 0});

  final int totalParts;
  final int availableParts;
  final int totalViews;

  factory PartsStats.fromJson(Map<String, dynamic> json) => PartsStats(
        totalParts: _int(json['totalParts']),
        availableParts: _int(json['availableParts']),
        totalViews: _int(json['totalViews']),
      );
}

class BranchPerformance {
  const BranchPerformance({required this.name, this.region = '', this.totalCars = 0, this.totalViews = 0});

  final String name;
  final String region;
  final int totalCars;
  final int totalViews;
}

/// GET /api/dealer/chain/overview (chains only).
class ChainOverview {
  const ChainOverview({
    this.totalCars = 0,
    this.totalBranches = 0,
    this.unassignedCars = 0,
    this.employeeCount = 0,
    this.branches = const [],
  });

  final int totalCars;
  final int totalBranches;
  final int unassignedCars;
  final int employeeCount;
  final List<BranchPerformance> branches;

  factory ChainOverview.fromJson(Map<String, dynamic> json) => ChainOverview(
        totalCars: _int(json['totalCars']),
        totalBranches: _int(json['totalBranches']),
        unassignedCars: _int(json['unassignedCars']),
        employeeCount: _int(json['employeeCount']),
        branches: ((json['branchPerformance'] as List?) ?? const []).map((e) {
          final b = e as Map<String, dynamic>;
          return BranchPerformance(
            name: (b['branchName'] ?? '') as String,
            region: (b['region'] ?? '') as String,
            totalCars: _int(b['totalCars']),
            totalViews: _int(b['totalViews']),
          );
        }).toList(),
      );
}

class PartCompatibility {
  const PartCompatibility({required this.make, this.model = '', this.yearFrom, this.yearTo});

  final String make;
  final String model;
  final int? yearFrom;
  final int? yearTo;

  factory PartCompatibility.fromJson(Map<String, dynamic> json) => PartCompatibility(
        make: (json['make'] ?? '') as String,
        model: (json['model'] ?? '') as String,
        yearFrom: (json['year_from'] as num?)?.toInt(),
        yearTo: (json['year_to'] as num?)?.toInt(),
      );

  Map<String, dynamic> toJson() => {'make': make, 'model': model, 'yearFrom': yearFrom, 'yearTo': yearTo};
}

/// A row of GET /api/parts (the dealer's own inventory).
class PartItem {
  const PartItem({
    required this.id,
    required this.name,
    this.partNumber = '',
    this.manufacturer = '',
    this.category = '',
    this.subtype = 'new_parts',
    this.condition = 'new',
    this.images = const [],
    this.price,
    this.status = 'available',
    this.deliverySupported = false,
    this.views = 0,
    this.compatibility = const [],
  });

  final int id;
  final String name;
  final String partNumber;
  final String manufacturer;
  final String category;
  final String subtype;
  final String condition;
  final List<String> images;
  final num? price;
  final String status;
  final bool deliverySupported;
  final int views;
  final List<PartCompatibility> compatibility;

  bool get isAvailable => status == 'available';
  String get coverImage => images.isNotEmpty ? ApiConfig.resolveUrl(images.first) : '';

  factory PartItem.fromJson(Map<String, dynamic> json) => PartItem(
        id: (json['id'] as num).toInt(),
        name: (json['name'] ?? '') as String,
        partNumber: (json['part_number'] ?? '') as String,
        manufacturer: (json['manufacturer'] ?? '') as String,
        category: (json['category'] ?? '') as String,
        subtype: (json['part_subtype'] ?? 'new_parts') as String,
        condition: (json['condition_status'] ?? 'new') as String,
        images: ((json['images'] as List?) ?? const []).map((e) => '$e').toList(),
        price: json['price'] as num?,
        status: (json['status'] ?? 'available') as String,
        deliverySupported: json['delivery_supported'] == true || json['delivery_supported'] == 1,
        views: _int(json['views']),
        compatibility: ((json['compatibility'] as List?) ?? const [])
            .map((e) => PartCompatibility.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}

/// A file the user picked from the device (photo or video).
class PickedMedia {
  const PickedMedia({required this.path, required this.name, this.sizeBytes = 0});

  final String path;
  final String name;
  final int sizeBytes;

  String get extension {
    final dot = name.lastIndexOf('.');
    return dot < 0 ? '' : name.substring(dot + 1).toLowerCase();
  }
}

/// Upload rules enforced by server.ts (multer limits and file filters);
/// checked on the device first so a bad file fails before a long upload.
class UploadRules {
  UploadRules._();

  static const maxPhotos = 10;
  static const maxPhotoBytes = 5 * 1024 * 1024;
  static const maxVideoBytes = 100 * 1024 * 1024;
  static const photoTypes = {'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png', 'webp': 'image/webp'};
  static const videoTypes = {'mp4': 'video/mp4', 'mov': 'video/quicktime'};

  static bool photoAllowed(PickedMedia f) =>
      photoTypes.containsKey(f.extension) && (f.sizeBytes == 0 || f.sizeBytes <= maxPhotoBytes);

  static bool videoAllowed(PickedMedia f) =>
      videoTypes.containsKey(f.extension) && (f.sizeBytes == 0 || f.sizeBytes <= maxVideoBytes);
}
