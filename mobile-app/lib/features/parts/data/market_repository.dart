import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';

int _int(Object? v) => v is num ? v.toInt() : int.tryParse('$v') ?? 0;
num? _num(Object? v) => v is num ? v : num.tryParse('${v ?? ''}');
String _str(Object? v) => v == null ? '' : '$v';
bool _bool(Object? v) => v == true || v == 1 || v == '1' || v == 'true';

/// One make/model/year range a part fits (routes/parts.ts `part_compatibility`).
class PartFit {
  const PartFit({required this.make, required this.model, this.yearFrom, this.yearTo});

  final String make;
  final String model;
  final int? yearFrom;
  final int? yearTo;

  factory PartFit.fromJson(Map<String, dynamic> json) => PartFit(
        make: _str(json['make']),
        model: _str(json['model']),
        yearFrom: json['year_from'] == null ? null : _int(json['year_from']),
        yearTo: json['year_to'] == null ? null : _int(json['year_to']),
      );

  String get label {
    final years = yearFrom == null && yearTo == null
        ? ''
        : yearFrom == yearTo || yearTo == null
            ? ' ${yearFrom ?? yearTo}'
            : ' ${yearFrom ?? ''}–$yearTo';
    return '$make $model$years'.trim();
  }
}

/// A part as buyers see it: GET /api/parts/search/query rows, and
/// GET /api/parts/:id which adds the dealer's contact details.
class MarketPart {
  const MarketPart({
    required this.id,
    required this.dealerId,
    required this.name,
    this.partNumber = '',
    this.manufacturer = '',
    this.category = '',
    this.condition = '',
    this.images = const [],
    this.price,
    this.status = 'available',
    this.deliverySupported = false,
    this.compatibility = const [],
    this.dealerName,
    this.dealerLogo,
    this.dealerLocation,
    this.dealerPhone,
    this.dealerWhatsapp,
    this.dealerAddress,
    this.dealerMapLink,
  });

  final int id;
  final int dealerId;
  final String name;
  final String partNumber;
  final String manufacturer;
  final String category;
  final String condition;
  final List<String> images;
  final num? price;
  final String status;
  final bool deliverySupported;
  final List<PartFit> compatibility;
  final String? dealerName;
  final String? dealerLogo;
  final String? dealerLocation;
  final String? dealerPhone;
  final String? dealerWhatsapp;
  final String? dealerAddress;
  final String? dealerMapLink;

  bool get isAvailable => status == 'available';
  List<String> get imageUrls => images.map(ApiConfig.resolveUrl).toList();

  factory MarketPart.fromJson(Map<String, dynamic> json) {
    String? opt(String key) {
      final v = json[key];
      return v == null || '$v'.trim().isEmpty ? null : '$v';
    }

    return MarketPart(
      id: _int(json['id']),
      dealerId: _int(json['dealer_id']),
      name: _str(json['name']),
      partNumber: _str(json['part_number']),
      manufacturer: _str(json['manufacturer']),
      category: _str(json['category']),
      condition: _str(json['condition_status']),
      images: [for (final i in (json['images'] as List?) ?? const []) '$i'],
      price: _num(json['price']),
      status: json['status'] == null ? 'available' : _str(json['status']),
      deliverySupported: _bool(json['delivery_supported']),
      compatibility: [
        for (final c in (json['compatibility'] as List?) ?? const [])
          if (c is Map<String, dynamic>) PartFit.fromJson(c),
      ],
      dealerName: opt('dealer_name'),
      dealerLogo: opt('dealer_logo'),
      dealerLocation: opt('dealer_location'),
      dealerPhone: opt('dealer_phone'),
      dealerWhatsapp: opt('dealer_whatsapp'),
      dealerAddress: opt('dealer_address'),
      dealerMapLink: opt('dealer_map_link'),
    );
  }
}

class PartSearchResult {
  const PartSearchResult({required this.parts, required this.count, required this.noExactMatch});

  final List<MarketPart> parts;
  final int count;
  final bool noExactMatch;
}

/// A buyer's order (GET /api/parts/my-orders).
class PartOrder {
  const PartOrder({
    required this.id,
    required this.status,
    required this.deliveryMethod,
    this.deliveryAddress,
    this.dealerName,
    this.dealerPhone,
    this.createdAt,
    this.items = const [],
  });

  final int id;
  final String status;
  final String deliveryMethod;
  final String? deliveryAddress;
  final String? dealerName;
  final String? dealerPhone;
  final String? createdAt;
  final List<({String name, String partNumber, num? price})> items;

  factory PartOrder.fromJson(Map<String, dynamic> json) => PartOrder(
        id: _int(json['id']),
        status: json['status'] == null ? 'pending' : _str(json['status']),
        deliveryMethod: json['delivery_method'] == null ? 'pickup' : _str(json['delivery_method']),
        deliveryAddress: json['delivery_address'] as String?,
        dealerName: json['dealer_name'] as String?,
        dealerPhone: json['dealer_phone'] as String?,
        createdAt: json['created_at'] as String?,
        items: [
          for (final i in (json['items'] as List?) ?? const [])
            if (i is Map<String, dynamic>)
              (name: _str(i['part_name']), partNumber: _str(i['part_number']), price: _num(i['price_at_order'])),
        ],
      );
}

/// An in-app notification (GET /api/notifications). The server creates
/// them for new followers, favorites on a dealer's car and dealer approval.
class AppNotification {
  const AppNotification({required this.id, required this.type, required this.message, required this.isRead, this.createdAt});

  final int id;
  final String type;
  final String message;
  final bool isRead;
  final String? createdAt;

  factory AppNotification.fromJson(Map<String, dynamic> json) => AppNotification(
        id: _int(json['notification_id'] ?? json['id']),
        type: _str(json['type']),
        message: _str(json['message']),
        isRead: _bool(json['is_read']),
        createdAt: json['created_at'] as String?,
      );

  AppNotification read() => AppNotification(id: id, type: type, message: message, isRead: true, createdAt: createdAt);
}

/// Buyer-side parts marketplace and notifications (routes/parts.ts,
/// routes/partsOrders.ts, server.ts /api/notifications).
class MarketRepository {
  MarketRepository(this._client);

  final ApiClient _client;

  /// Available parts matching [query]; an empty query lists the newest
  /// available parts (the server returns at most 30).
  Future<PartSearchResult> searchParts(String query) async {
    final res = await _client.get(ApiEndpoints.partsSearch, query: {'q': query});
    final body = res.data as Map<String, dynamic>;
    final parts = [
      for (final p in (body['results'] as List?) ?? const [])
        if (p is Map<String, dynamic>) MarketPart.fromJson(p),
    ];
    return PartSearchResult(
      parts: parts,
      count: body['count'] is num ? (body['count'] as num).toInt() : parts.length,
      noExactMatch: body['noExactMatch'] == true,
    );
  }

  Future<MarketPart> getPart(int id) async {
    final res = await _client.get(ApiEndpoints.partById(id));
    return MarketPart.fromJson(res.data as Map<String, dynamic>);
  }

  /// POST /api/parts/:id/order — any signed-in user. The dealer sees it in
  /// their orders list. [deliveryMethod] is 'pickup' or 'delivery'.
  Future<int> placeOrder(int partId, {required String deliveryMethod, String? deliveryAddress, String? notes}) async {
    final res = await _client.post(ApiEndpoints.partOrder(partId), data: {
      'delivery_method': deliveryMethod,
      if (deliveryAddress != null && deliveryAddress.trim().isNotEmpty) 'delivery_address': deliveryAddress.trim(),
      if (notes != null && notes.trim().isNotEmpty) 'notes': notes.trim(),
    });
    return _int((res.data as Map<String, dynamic>)['id']);
  }

  Future<List<PartOrder>> myOrders() async {
    final res = await _client.get(ApiEndpoints.myPartOrders);
    return [
      for (final o in (res.data as List?) ?? const [])
        if (o is Map<String, dynamic>) PartOrder.fromJson(o),
    ];
  }

  Future<List<AppNotification>> notifications() async {
    final res = await _client.get(ApiEndpoints.notifications);
    return [
      for (final n in (res.data as List?) ?? const [])
        if (n is Map<String, dynamic>) AppNotification.fromJson(n),
    ];
  }

  Future<void> markRead(int id) => _client.put(ApiEndpoints.notificationRead(id));
}
