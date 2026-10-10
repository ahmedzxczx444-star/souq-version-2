import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/l10n/app_strings.dart';
import '../../../../core/l10n/dealer_strings.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../shared/providers/language_provider.dart';
import '../../data/dealer_account.dart';
import '../../data/dealer_tools_repository.dart';
import '../../data/resource_specs.dart';
import 'dealer_widgets.dart';

/// One screen for every type-specific record list (branches, employees,
/// warehouses, shipments, pre-orders, service centers, offers, warranties,
/// parts orders). What it shows and sends comes from [ResourceSpec].
///
/// The list is only reachable for a dealer type that owns the tool, and
/// the API refuses the others anyway (403) — that answer is shown as-is.
class ResourceListScreen extends ConsumerStatefulWidget {
  const ResourceListScreen({super.key, required this.tool});

  final DealerTool tool;

  @override
  ConsumerState<ResourceListScreen> createState() => _ResourceListScreenState();
}

class _ResourceListScreenState extends ConsumerState<ResourceListScreen> {
  late Future<List<Map<String, dynamic>>> _items;

  ResourceSpec get _spec => resourceSpecs[widget.tool]!;

  @override
  void initState() {
    super.initState();
    _items = _load();
  }

  Future<List<Map<String, dynamic>>> _load() => ref.read(dealerToolsRepositoryProvider).records(_spec.path);

  void _reload() => setState(() {
        _items = _load();
      });

  int _id(Map<String, dynamic> item) => (item['id'] as num).toInt();

  Future<void> _run(Future<void> Function() action, String success) async {
    final strings = ref.read(stringsProvider);
    try {
      await action();
      if (!mounted) return;
      showMessage(context, success);
      _reload();
    } catch (e) {
      if (mounted) showMessage(context, errorMessage(e, strings));
    }
  }

  Future<void> _openForm([Map<String, dynamic>? item]) async {
    final saved = await showDialog<bool>(
      context: context,
      builder: (_) => _RecordFormDialog(spec: _spec, item: item),
    );
    if (saved == true && mounted) {
      showMessage(context, ref.read(stringsProvider).saved);
      _reload();
    }
  }

  Future<void> _delete(Map<String, dynamic> item) async {
    final strings = ref.read(stringsProvider);
    if (!await confirmDelete(context, strings)) return;
    await _run(() => ref.read(dealerToolsRepositoryProvider).deleteRecord(_spec.itemPath(_id(item))), strings.deleted);
  }

  Future<void> _setStatus(Map<String, dynamic> item, String status) => _run(
        () => ref.read(dealerToolsRepositoryProvider).updateRecord(_spec.status!.path(_id(item)), {'status': status}),
        ref.read(stringsProvider).saved,
      );

  @override
  Widget build(BuildContext context) {
    final strings = ref.watch(stringsProvider);
    final arabic = strings.isArabic;
    final spec = _spec;

    return DealerPage(
      title: spec.title(arabic),
      floatingAction: spec.canCreate
          ? FloatingActionButton(
              key: const Key('record-add'),
              backgroundColor: AppColors.black,
              foregroundColor: AppColors.white,
              onPressed: _openForm,
              child: const Icon(Icons.add),
            )
          : null,
      child: FutureBuilder<List<Map<String, dynamic>>>(
        future: _items,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) return const LoadingView();
          if (snapshot.hasError) {
            return ErrorView(message: errorMessage(snapshot.error!, strings), onRetry: _reload, strings: strings);
          }
          final items = snapshot.data ?? const [];
          if (items.isEmpty) return Center(child: EmptyView(icon: spec.icon, title: strings.nothingHere));

          return ListView.separated(
            padding: const EdgeInsets.fromLTRB(24, 8, 24, 96),
            itemCount: items.length,
            separatorBuilder: (_, _) => const SizedBox(height: 12),
            itemBuilder: (context, index) {
              final item = items[index];
              final subtitle = spec.subtitleOf?.call(item, arabic) ?? '';
              return Container(
                key: Key('record-${_id(item)}'),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(color: AppColors.gray50, borderRadius: BorderRadius.circular(20)),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(spec.icon, size: 20, color: AppColors.gray600),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                spec.titleOf(item),
                                style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15, color: AppColors.gray900),
                              ),
                              if (subtitle.isNotEmpty)
                                Padding(
                                  padding: const EdgeInsets.only(top: 4),
                                  child: Text(subtitle, style: const TextStyle(color: AppColors.gray600, fontSize: 13, height: 1.4)),
                                ),
                            ],
                          ),
                        ),
                        if (spec.canEdit)
                          IconButton(
                            key: Key('record-edit-${_id(item)}'),
                            tooltip: strings.edit,
                            icon: const Icon(Icons.edit_outlined, size: 20),
                            onPressed: () => _openForm(item),
                          ),
                        if (spec.canDelete)
                          IconButton(
                            key: Key('record-delete-${_id(item)}'),
                            tooltip: strings.delete,
                            icon: const Icon(Icons.delete_outline_rounded, size: 20, color: AppColors.red500),
                            onPressed: () => _delete(item),
                          ),
                      ],
                    ),
                    if (spec.status != null)
                      Padding(
                        padding: const EdgeInsets.only(top: 12),
                        child: Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            for (final option in spec.status!.options)
                              Builder(builder: (context) {
                                final current = '${item['status']}' == option.value;
                                return ChoiceChip(
                                  key: Key('record-status-${_id(item)}-${option.value}'),
                                  label: Text(option.label(arabic)),
                                  selected: current,
                                  showCheckmark: false,
                                  backgroundColor: AppColors.white,
                                  selectedColor: AppColors.black,
                                  side: BorderSide(color: current ? AppColors.black : AppColors.gray200),
                                  labelStyle: TextStyle(
                                    color: current ? AppColors.white : AppColors.gray900,
                                    fontWeight: FontWeight.w700,
                                    fontSize: 13,
                                  ),
                                  onSelected: (_) {
                                    if (!current) _setStatus(item, option.value);
                                  },
                                );
                              }),
                          ],
                        ),
                      ),
                  ],
                ),
              );
            },
          );
        },
      ),
    );
  }
}

class _RecordFormDialog extends ConsumerStatefulWidget {
  const _RecordFormDialog({required this.spec, this.item});

  final ResourceSpec spec;
  final Map<String, dynamic>? item;

  @override
  ConsumerState<_RecordFormDialog> createState() => _RecordFormDialogState();
}

class _RecordFormDialogState extends ConsumerState<_RecordFormDialog> {
  final _formKey = GlobalKey<FormState>();
  late final Map<String, dynamic> _values = initialRecordValues(widget.spec, widget.item);
  final _controllers = <String, TextEditingController>{};
  final _loadedOptions = <String, List<FieldOption>>{};
  String? _error;
  bool _busy = false;

  bool get _editing => widget.item != null;

  List<ResourceField> get _fields =>
      widget.spec.fields.where((f) => !(_editing && f.createOnly)).toList();

  @override
  void initState() {
    super.initState();
    for (final field in _fields) {
      if (field.type == FieldType.toggle || field.type == FieldType.select) continue;
      _controllers[field.key] = TextEditingController(text: '${_values[field.key] ?? ''}');
    }
    for (final field in _fields.where((f) => f.loadOptions != null)) {
      field.loadOptions!(ref.read(dealerToolsRepositoryProvider)).then((options) {
        if (mounted) setState(() => _loadedOptions[field.key] = options);
      }).catchError((_) {
        if (mounted) setState(() => _loadedOptions[field.key] = const []);
      });
    }
  }

  @override
  void dispose() {
    for (final c in _controllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _pickDate(ResourceField field) async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime.tryParse(_controllers[field.key]!.text) ?? now,
      firstDate: DateTime(now.year - 5),
      lastDate: DateTime(now.year + 10),
    );
    if (picked != null) {
      _controllers[field.key]!.text = picked.toIso8601String().substring(0, 10);
    }
  }

  Future<void> _submit(AppStrings strings) async {
    if (!_formKey.currentState!.validate()) return;
    for (final entry in _controllers.entries) {
      _values[entry.key] = entry.value.text;
    }
    final spec = widget.spec;
    for (final field in _fields) {
      if (field.required && field.type == FieldType.select && '${_values[field.key] ?? ''}'.isEmpty) {
        return setState(() => _error = '${field.label(strings.isArabic)}: ${strings.requiredField}');
      }
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    final repo = ref.read(dealerToolsRepositoryProvider);
    try {
      final body = buildRecordBody(spec, _values, existing: widget.item);
      if (_editing) {
        await repo.updateRecord(spec.itemPath((widget.item!['id'] as num).toInt()), body);
      } else {
        await repo.createRecord(spec.path, body);
      }
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      if (mounted) setState(() => _error = errorMessage(e, strings));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Widget _control(ResourceField field, AppStrings strings) {
    final arabic = strings.isArabic;
    final label = field.label(arabic) + (field.required ? ' *' : '');
    String? requiredCheck(String? v) =>
        field.required && (v == null || v.trim().isEmpty) ? strings.requiredField : null;

    switch (field.type) {
      case FieldType.toggle:
        return SwitchListTile(
          key: Key('field-${field.key}'),
          contentPadding: EdgeInsets.zero,
          title: Text(label, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
          value: _values[field.key] == true,
          onChanged: (v) => setState(() => _values[field.key] = v),
        );
      case FieldType.select:
        final options = field.loadOptions != null ? _loadedOptions[field.key] : field.options;
        if (options == null) {
          return const Padding(padding: EdgeInsets.symmetric(vertical: 16), child: LinearProgressIndicator());
        }
        return LabeledDropdown(
          key: Key('field-${field.key}'),
          label: label,
          value: '${_values[field.key] ?? ''}',
          items: {for (final o in options) o.value: o.label(arabic)},
          onChanged: (v) => _values[field.key] = v,
        );
      case FieldType.date:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            FieldLabel(label),
            TextFormField(
              key: Key('field-${field.key}'),
              controller: _controllers[field.key],
              readOnly: true,
              onTap: () => _pickDate(field),
              validator: requiredCheck,
              decoration: const InputDecoration(hintText: 'YYYY-MM-DD', suffixIcon: Icon(Icons.event_outlined)),
            ),
          ],
        );
      default:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            FieldLabel(label),
            TextFormField(
              key: Key('field-${field.key}'),
              controller: _controllers[field.key],
              maxLines: field.type == FieldType.multiline ? 3 : 1,
              keyboardType: field.type == FieldType.number ? TextInputType.number : null,
              validator: (v) {
                final missing = requiredCheck(v);
                if (missing != null) return missing;
                if (field.type == FieldType.number && v != null && v.trim().isNotEmpty && num.tryParse(v.trim()) == null) {
                  return strings.invalidNumber;
                }
                return null;
              },
            ),
          ],
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    final strings = ref.watch(stringsProvider);
    return AlertDialog(
      title: Text('${_editing ? strings.edit : strings.add} · ${widget.spec.title(strings.isArabic)}'),
      content: SizedBox(
        width: 400,
        child: Form(
          key: _formKey,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                for (final field in _fields) _control(field, strings),
                if (_error != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 12),
                    child: Text(_error!, style: const TextStyle(color: AppColors.red500, fontWeight: FontWeight.w700, fontSize: 13)),
                  ),
              ],
            ),
          ),
        ),
      ),
      actions: [
        TextButton(onPressed: _busy ? null : () => Navigator.pop(context, false), child: Text(strings.cancel)),
        TextButton(
          key: const Key('record-save'),
          onPressed: _busy ? null : () => _submit(strings),
          child: Text(strings.save),
        ),
      ],
    );
  }
}
