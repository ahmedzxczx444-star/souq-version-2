import 'dart:convert';

import 'package:flutter/material.dart';

import '../../../core/network/api_endpoints.dart';
import 'dealer_account.dart';
import 'dealer_tools_repository.dart';

/// The type-specific record lists (branches, shipments, offers...) share
/// one screen; each is described here by its backend route and fields, so
/// the form only ever sends what that route reads.
enum FieldType { text, multiline, number, date, select, toggle, list }

class FieldOption {
  const FieldOption(this.value, this.ar, this.en);

  final String value;
  final String ar;
  final String en;

  String label(bool arabic) => arabic ? ar : en;
}

class ResourceField {
  const ResourceField(
    this.key,
    this.ar,
    this.en, {
    this.type = FieldType.text,
    this.required = false,
    this.options = const [],
    this.createOnly = false,
    this.loadOptions,
  });

  final String key;
  final String ar;
  final String en;
  final FieldType type;
  final bool required;
  final List<FieldOption> options;

  /// Shown when adding but not when editing (the route ignores it then).
  final bool createOnly;

  /// For a select whose choices come from the dealer's own data.
  final Future<List<FieldOption>> Function(DealerToolsRepository repo)? loadOptions;

  String label(bool arabic) => arabic ? ar : en;
}

/// A status the dealer can change straight from the list.
class StatusAction {
  const StatusAction({required this.options, required this.path});

  final List<FieldOption> options;
  final String Function(int id) path;
}

class ResourceSpec {
  const ResourceSpec({
    required this.tool,
    required this.ar,
    required this.en,
    required this.icon,
    required this.path,
    required this.fields,
    required this.titleOf,
    this.subtitleOf,
    this.canCreate = true,
    this.canEdit = true,
    this.canDelete = true,
    this.status,
    this.keepOnEdit = const [],
    this.onCreate,
  });

  final DealerTool tool;
  final String ar;
  final String en;
  final IconData icon;
  final String path;
  final List<ResourceField> fields;
  final String Function(Map<String, dynamic> item) titleOf;
  final String Function(Map<String, dynamic> item, bool arabic)? subtitleOf;
  final bool canCreate;
  final bool canEdit;
  final bool canDelete;
  final StatusAction? status;

  /// Keys copied from the existing record into an edit, for routes that
  /// would otherwise clear a value this form does not show.
  final List<String> keepOnEdit;

  /// Adds what the route expects beyond the form fields.
  final Map<String, dynamic> Function(Map<String, dynamic> body)? onCreate;

  String title(bool arabic) => arabic ? ar : en;
  String itemPath(int id) => '$path/$id';
}

String _s(dynamic v) => v == null ? '' : '$v';

String _join(Iterable<String> parts) => parts.where((p) => p.trim().isNotEmpty).join(' · ');

/// `services` is stored as a JSON array string (routes/officialAgent.ts).
List<String> decodeList(dynamic value) {
  if (value is List) return value.map((e) => '$e').toList();
  if (value is String && value.trim().startsWith('[')) {
    try {
      return (jsonDecode(value) as List).map((e) => '$e').toList();
    } catch (_) {
      return const [];
    }
  }
  if (value is String && value.trim().isNotEmpty) return [value];
  return const [];
}

String optionLabel(List<FieldOption> options, dynamic value, bool arabic) {
  for (final o in options) {
    if (o.value == '$value') return o.label(arabic);
  }
  return _s(value);
}

const shipmentStatuses = [
  FieldOption('pending', 'قيد الانتظار', 'Pending'),
  FieldOption('in_transit', 'في الطريق', 'In transit'),
  FieldOption('customs', 'الجمارك', 'Customs'),
  FieldOption('arrived', 'وصلت', 'Arrived'),
  FieldOption('cleared', 'تم التخليص', 'Cleared'),
];

const preorderStatuses = [
  FieldOption('requested', 'مطلوب', 'Requested'),
  FieldOption('confirmed', 'مؤكد', 'Confirmed'),
  FieldOption('fulfilled', 'تم التنفيذ', 'Fulfilled'),
  FieldOption('cancelled', 'ملغي', 'Cancelled'),
];

const orderStatuses = [
  FieldOption('pending', 'قيد الانتظار', 'Pending'),
  FieldOption('confirmed', 'مؤكد', 'Confirmed'),
  FieldOption('delivered', 'تم التسليم', 'Delivered'),
  FieldOption('cancelled', 'ملغي', 'Cancelled'),
];

const employeeRoles = [
  FieldOption('branch_manager', 'مدير فرع', 'Branch manager'),
  FieldOption('regional_manager', 'مدير إقليمي', 'Regional manager'),
  FieldOption('staff', 'موظف', 'Staff'),
];

/// The permission sets the site assigns per role (ChainDashboard.tsx).
Map<String, bool> employeePermissions(String role) => role == 'regional_manager'
    ? {'manage_cars': true, 'manage_branches': true, 'view_reports': true}
    : {'manage_cars': true, 'view_reports': true};

final resourceSpecs = <DealerTool, ResourceSpec>{
  DealerTool.branches: ResourceSpec(
    tool: DealerTool.branches,
    ar: 'الفروع',
    en: 'Branches',
    icon: Icons.store_mall_directory_outlined,
    path: ApiEndpoints.dealerBranches,
    fields: const [
      ResourceField('name', 'اسم الفرع', 'Branch name', required: true),
      ResourceField('address', 'العنوان', 'Address', required: true),
      ResourceField('phone', 'رقم الهاتف', 'Phone'),
      ResourceField('region', 'المنطقة', 'Region'),
      ResourceField('map_link', 'رابط الخريطة', 'Map link'),
      ResourceField('is_headquarters', 'المقر الرئيسي', 'Headquarters', type: FieldType.toggle),
    ],
    titleOf: (b) => _s(b['name']),
    subtitleOf: (b, ar) => _join([
      _s(b['address']),
      _s(b['region']),
      if (b['is_headquarters'] == 1 || b['is_headquarters'] == true) (ar ? 'المقر الرئيسي' : 'Headquarters'),
    ]),
  ),
  DealerTool.employees: ResourceSpec(
    tool: DealerTool.employees,
    ar: 'الموظفون',
    en: 'Employees',
    icon: Icons.badge_outlined,
    path: ApiEndpoints.dealerEmployees,
    fields: const [
      ResourceField('email', 'بريد الموظف (يجب أن يكون مسجلاً)', 'Employee email (must already be registered)',
          required: true, createOnly: true),
      ResourceField('role', 'الدور', 'Role', type: FieldType.select, required: true, options: employeeRoles),
    ],
    titleOf: (e) => _s(e['name']),
    subtitleOf: (e, ar) => _join([_s(e['email']), optionLabel(employeeRoles, e['role'], ar), _s(e['branch_name'])]),
    keepOnEdit: const ['branch_id'],
    onCreate: (body) => {...body, 'permissions': employeePermissions('${body['role']}')},
  ),
  DealerTool.warehouses: ResourceSpec(
    tool: DealerTool.warehouses,
    ar: 'المخازن',
    en: 'Warehouses',
    icon: Icons.warehouse_outlined,
    path: ApiEndpoints.importerWarehouses,
    fields: const [
      ResourceField('name', 'اسم المخزن', 'Warehouse name', required: true),
      ResourceField('location', 'المدينة', 'City'),
      ResourceField('address', 'العنوان', 'Address'),
    ],
    titleOf: (w) => _s(w['name']),
    subtitleOf: (w, ar) => _join([_s(w['location']), _s(w['address'])]),
  ),
  DealerTool.shipments: ResourceSpec(
    tool: DealerTool.shipments,
    ar: 'الشحنات',
    en: 'Shipments',
    icon: Icons.directions_boat_outlined,
    path: ApiEndpoints.importerShipments,
    canDelete: false,
    fields: [
      const ResourceField('reference_code', 'رقم الشحنة', 'Reference code', required: true),
      const ResourceField('origin_country', 'بلد المنشأ', 'Origin country'),
      const ResourceField('carrier', 'شركة الشحن', 'Carrier'),
      ResourceField(
        'warehouse_id',
        'المخزن',
        'Warehouse',
        type: FieldType.select,
        loadOptions: (repo) async => [
          for (final w in await repo.records(ApiEndpoints.importerWarehouses))
            FieldOption('${w['id']}', _s(w['name']), _s(w['name'])),
        ],
      ),
      const ResourceField('status', 'الحالة', 'Status', type: FieldType.select, options: shipmentStatuses),
      const ResourceField('eta', 'موعد الوصول المتوقع', 'Expected arrival', type: FieldType.date),
      const ResourceField('notes', 'ملاحظات', 'Notes', type: FieldType.multiline),
    ],
    titleOf: (s) => _s(s['reference_code']),
    subtitleOf: (s, ar) => _join([
      optionLabel(shipmentStatuses, s['status'], ar),
      _s(s['origin_country']),
      _s(s['carrier']),
      if (_s(s['eta']).isNotEmpty) '${ar ? 'الوصول' : 'ETA'} ${s['eta']}',
    ]),
    status: StatusAction(options: shipmentStatuses, path: (id) => '${ApiEndpoints.importerShipments}/$id'),
  ),
  DealerTool.preorders: ResourceSpec(
    tool: DealerTool.preorders,
    ar: 'طلبات الحجز المسبق',
    en: 'Pre-orders',
    icon: Icons.assignment_outlined,
    path: ApiEndpoints.importerPreorders,
    canCreate: false,
    canEdit: false,
    canDelete: false,
    fields: const [],
    titleOf: (p) => _join([_s(p['car_make']), _s(p['car_model']), _s(p['desired_year'])]).replaceAll(' · ', ' '),
    subtitleOf: (p, ar) => _join([
      optionLabel(preorderStatuses, p['status'], ar),
      _s(p['customer_name']),
      _s(p['customer_email']),
      _s(p['notes']),
    ]),
    status: StatusAction(options: preorderStatuses, path: (id) => '${ApiEndpoints.importerPreorders}/$id'),
  ),
  DealerTool.serviceCenters: ResourceSpec(
    tool: DealerTool.serviceCenters,
    ar: 'مراكز الخدمة',
    en: 'Service Centers',
    icon: Icons.build_outlined,
    path: ApiEndpoints.officialServiceCenters,
    fields: const [
      ResourceField('name', 'اسم المركز', 'Center name', required: true),
      ResourceField('address', 'العنوان', 'Address', required: true),
      ResourceField('phone', 'رقم الهاتف', 'Phone'),
      ResourceField('services', 'الخدمات (افصل بينها بفاصلة)', 'Services (comma separated)', type: FieldType.list),
    ],
    titleOf: (c) => _s(c['name']),
    subtitleOf: (c, ar) => _join([_s(c['address']), _s(c['phone']), decodeList(c['services']).join('، ')]),
  ),
  DealerTool.offers: ResourceSpec(
    tool: DealerTool.offers,
    ar: 'العروض',
    en: 'Offers',
    icon: Icons.local_offer_outlined,
    path: ApiEndpoints.officialOffers,
    canEdit: false,
    fields: const [
      ResourceField('title', 'عنوان العرض', 'Offer title', required: true),
      ResourceField('description', 'التفاصيل', 'Details', type: FieldType.multiline),
      ResourceField('discount_percent', 'نسبة الخصم %', 'Discount %', type: FieldType.number),
      ResourceField('valid_from', 'يبدأ من', 'Valid from', type: FieldType.date),
      ResourceField('valid_to', 'ينتهي في', 'Valid to', type: FieldType.date),
    ],
    titleOf: (o) => _s(o['title']),
    subtitleOf: (o, ar) => _join([
      if (o['discount_percent'] != null) '${o['discount_percent']}%',
      _s(o['description']),
      if (_s(o['valid_to']).isNotEmpty) '${ar ? 'حتى' : 'Until'} ${o['valid_to']}',
    ]),
  ),
  DealerTool.warranties: ResourceSpec(
    tool: DealerTool.warranties,
    ar: 'الضمانات',
    en: 'Warranties',
    icon: Icons.verified_user_outlined,
    path: ApiEndpoints.officialWarranties,
    canEdit: false,
    fields: [
      ResourceField(
        'car_id',
        'السيارة',
        'Car',
        type: FieldType.select,
        required: true,
        loadOptions: (repo) async => [
          for (final c in await repo.myCars())
            FieldOption('${c.id}', '${c.make} ${c.model} ${c.year}', '${c.make} ${c.model} ${c.year}'),
        ],
      ),
      const ResourceField('warranty_type', 'نوع الضمان', 'Warranty type', required: true),
      const ResourceField('duration_months', 'المدة بالأشهر', 'Duration (months)', type: FieldType.number),
      const ResourceField('coverage_details', 'تفاصيل التغطية', 'Coverage details', type: FieldType.multiline),
    ],
    titleOf: (w) => _join([_s(w['make']), _s(w['model']), _s(w['year'])]).replaceAll(' · ', ' '),
    subtitleOf: (w, ar) => _join([
      _s(w['warranty_type']),
      if (w['duration_months'] != null) '${w['duration_months']} ${ar ? 'شهر' : 'months'}',
      _s(w['coverage_details']),
    ]),
  ),
  DealerTool.partOrders: ResourceSpec(
    tool: DealerTool.partOrders,
    ar: 'الطلبات',
    en: 'Orders',
    icon: Icons.receipt_long_outlined,
    path: ApiEndpoints.partOrders,
    canCreate: false,
    canEdit: false,
    canDelete: false,
    fields: const [],
    titleOf: (o) {
      final items = (o['items'] as List?) ?? const [];
      final names = items.map((i) => _s((i as Map)['part_name'])).where((n) => n.isNotEmpty).join('، ');
      return names.isEmpty ? '#${o['id']}' : names;
    },
    subtitleOf: (o, ar) => _join([
      optionLabel(orderStatuses, o['status'], ar),
      _s(o['buyer_name']),
      _s(o['buyer_email']),
      _s(o['delivery_address']),
      _s(o['notes']),
    ]),
    status: StatusAction(options: orderStatuses, path: ApiEndpoints.partOrderStatus),
  ),
};

/// Turns what the form holds into the JSON the route reads.
Map<String, dynamic> buildRecordBody(ResourceSpec spec, Map<String, dynamic> values, {Map<String, dynamic>? existing}) {
  final body = <String, dynamic>{};
  for (final field in spec.fields) {
    if (existing != null && field.createOnly) continue;
    final raw = values[field.key];
    switch (field.type) {
      case FieldType.number:
        body[field.key] = num.tryParse('${raw ?? ''}'.trim());
      case FieldType.toggle:
        body[field.key] = raw == true;
      case FieldType.list:
        body[field.key] = '${raw ?? ''}'.split(RegExp('[,،]')).map((e) => e.trim()).where((e) => e.isNotEmpty).toList();
      case FieldType.select:
        final text = '${raw ?? ''}';
        // Ids are numbers on the server; other selects are plain strings.
        body[field.key] = text.isEmpty ? null : (field.key.endsWith('_id') ? int.tryParse(text) : text);
      default:
        body[field.key] = '${raw ?? ''}'.trim();
    }
  }
  if (existing != null) {
    for (final key in spec.keepOnEdit) {
      body[key] = existing[key];
    }
    return body;
  }
  return spec.onCreate?.call(body) ?? body;
}

/// The form's starting values for editing [item].
Map<String, dynamic> initialRecordValues(ResourceSpec spec, Map<String, dynamic>? item) {
  final values = <String, dynamic>{};
  for (final field in spec.fields) {
    final raw = item?[field.key];
    switch (field.type) {
      case FieldType.toggle:
        values[field.key] = raw == true || raw == 1;
      case FieldType.list:
        values[field.key] = decodeList(raw).join(', ');
      case FieldType.select:
        // A fixed list starts on its first choice (a new shipment is "pending").
        values[field.key] = raw == null ? (field.options.isNotEmpty ? field.options.first.value : '') : '$raw';
      default:
        values[field.key] = raw == null ? '' : '$raw';
    }
  }
  return values;
}
