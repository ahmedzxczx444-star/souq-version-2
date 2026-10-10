import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/l10n/app_strings.dart';
import '../../../core/l10n/dealer_strings.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/providers/language_provider.dart';
import '../../dealers/data/dealer_account.dart';
import '../../dealers/data/dealer_tools_repository.dart';
import '../../dealers/presentation/manage/dealer_widgets.dart';

/// Add or edit a part in a parts dealer's inventory (manual entry, as in
/// AddPartScreen.tsx on the site: POST /api/parts, PUT /api/parts/:id).
/// The site's AI-assisted entry (part-number lookup, photo and barcode
/// recognition) is not offered here.
class AddPartScreen extends ConsumerStatefulWidget {
  const AddPartScreen({super.key, this.part});

  final PartItem? part;

  @override
  ConsumerState<AddPartScreen> createState() => _AddPartScreenState();
}

class _CompatRow {
  _CompatRow([PartCompatibility? c])
      : make = TextEditingController(text: c?.make ?? ''),
        model = TextEditingController(text: c?.model ?? ''),
        from = TextEditingController(text: c?.yearFrom?.toString() ?? ''),
        to = TextEditingController(text: c?.yearTo?.toString() ?? '');

  final TextEditingController make;
  final TextEditingController model;
  final TextEditingController from;
  final TextEditingController to;

  void dispose() {
    make.dispose();
    model.dispose();
    from.dispose();
    to.dispose();
  }
}

class _AddPartScreenState extends ConsumerState<AddPartScreen> {
  final _formKey = GlobalKey<FormState>();
  late final _name = TextEditingController(text: widget.part?.name ?? '');
  late final _partNumber = TextEditingController(text: widget.part?.partNumber ?? '');
  late final _manufacturer = TextEditingController(text: widget.part?.manufacturer ?? '');
  late final _category = TextEditingController(text: widget.part?.category ?? '');
  late final _price = TextEditingController(text: widget.part?.price?.toString() ?? '');
  late String _subtype = widget.part?.subtype ?? 'new_parts';
  late String _condition = widget.part?.condition ?? 'new';
  late bool _available = widget.part?.isAvailable ?? true;
  late bool _delivery = widget.part?.deliverySupported ?? false;
  late final _photos = PhotoSelection(stored: widget.part?.images);
  late final List<_CompatRow> _compat = (widget.part?.compatibility ?? const []).map(_CompatRow.new).toList();
  final _removed = <_CompatRow>[];
  String? _error;
  bool _busy = false;

  bool get _editing => widget.part != null;

  @override
  void dispose() {
    for (final c in [_name, _partNumber, _manufacturer, _category, _price]) {
      c.dispose();
    }
    for (final row in [..._compat, ..._removed]) {
      row.dispose();
    }
    super.dispose();
  }

  Future<void> _submit(AppStrings strings) async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    final repo = ref.read(dealerToolsRepositoryProvider);
    try {
      final images = await _photos.resolve(repo);
      final body = <String, dynamic>{
        'name': _name.text.trim(),
        'part_number': _partNumber.text.trim(),
        'manufacturer': _manufacturer.text.trim(),
        'category': _category.text.trim(),
        'part_subtype': _subtype,
        'condition_status': _condition,
        'images': images,
        'price': num.tryParse(_price.text.trim()),
        'status': _available ? 'available' : 'unavailable',
        'delivery_supported': _delivery,
        'compatibility': [
          for (final row in _compat)
            if (row.make.text.trim().isNotEmpty)
              PartCompatibility(
                make: row.make.text.trim(),
                model: row.model.text.trim(),
                yearFrom: int.tryParse(row.from.text.trim()),
                yearTo: int.tryParse(row.to.text.trim()),
              ).toJson(),
        ],
      };
      if (_editing) {
        await repo.updatePart(widget.part!.id, body);
      } else {
        await repo.createPart(body);
      }
      ref.invalidate(dealerPartsProvider);
      ref.invalidate(partsStatsProvider);
      if (!mounted) return;
      showMessage(context, strings.saved);
      context.canPop() ? context.pop() : context.go('/dealer-dashboard');
    } catch (e) {
      if (mounted) setState(() => _error = errorMessage(e, strings));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final strings = ref.watch(stringsProvider);
    String? yearCheck(String? v) {
      final text = (v ?? '').trim();
      return text.isNotEmpty && int.tryParse(text) == null ? strings.invalidYear : null;
    }

    return DealerPage(
      title: _editing ? strings.editPart : strings.addPart,
      child: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(24, 0, 24, 48),
          children: [
            PhotoPickerField(selection: _photos, strings: strings),
            LabeledField(
              key: const Key('part-name'),
              label: strings.partName,
              controller: _name,
              validator: (v) => (v == null || v.trim().isEmpty) ? strings.requiredField : null,
            ),
            LabeledField(
              key: const Key('part-number'),
              label: strings.partNumber,
              controller: _partNumber,
              textDirection: TextDirection.ltr,
            ),
            LabeledField(label: strings.manufacturer, controller: _manufacturer),
            LabeledField(label: strings.category, controller: _category),
            Row(
              children: [
                Expanded(
                  child: LabeledDropdown(
                    label: strings.partType,
                    value: _subtype,
                    items: {
                      for (final s in const [
                        'new_parts',
                        'imported_parts',
                        'half_cut',
                        'accessories',
                        'tires_batteries',
                        'oils_consumables',
                      ])
                        s: strings.partSubtypeLabel(s),
                    },
                    onChanged: (v) => _subtype = v,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: LabeledDropdown(
                    label: strings.condition,
                    value: _condition,
                    items: {for (final c in const ['new', 'used', 'refurbished']) c: strings.partConditionLabel(c)},
                    onChanged: (v) => _condition = v,
                  ),
                ),
              ],
            ),
            LabeledField(
              key: const Key('part-price'),
              label: strings.price,
              controller: _price,
              keyboardType: TextInputType.number,
              validator: (v) {
                final text = (v ?? '').trim();
                return text.isNotEmpty && (num.tryParse(text) == null || num.parse(text) < 0) ? strings.invalidNumber : null;
              },
            ),
            const SizedBox(height: 8),
            SwitchListTile(
              key: const Key('part-available'),
              contentPadding: EdgeInsets.zero,
              title: Text(strings.availableForSale, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
              value: _available,
              onChanged: (v) => setState(() => _available = v),
            ),
            SwitchListTile(
              key: const Key('part-delivery'),
              contentPadding: EdgeInsets.zero,
              title: Text(strings.deliverySupported, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
              value: _delivery,
              onChanged: (v) => setState(() => _delivery = v),
            ),
            const SizedBox(height: 8),
            Text(strings.compatibleCars, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
            for (var i = 0; i < _compat.length; i++)
              Container(
                key: Key('compat-$i'),
                margin: const EdgeInsets.only(top: 12),
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                decoration: BoxDecoration(color: AppColors.gray50, borderRadius: BorderRadius.circular(20)),
                child: Column(
                  children: [
                    Row(
                      children: [
                        Expanded(child: LabeledField(label: strings.make, controller: _compat[i].make)),
                        const SizedBox(width: 12),
                        Expanded(child: LabeledField(label: strings.model, controller: _compat[i].model)),
                      ],
                    ),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: LabeledField(
                            label: strings.yearFrom,
                            controller: _compat[i].from,
                            keyboardType: TextInputType.number,
                            validator: yearCheck,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: LabeledField(
                            label: strings.yearTo,
                            controller: _compat[i].to,
                            keyboardType: TextInputType.number,
                            validator: yearCheck,
                          ),
                        ),
                      ],
                    ),
                    Align(
                      alignment: AlignmentDirectional.centerEnd,
                      child: TextButton(
                        onPressed: () => setState(() => _removed.add(_compat.removeAt(i))),
                        child: Text(strings.delete, style: const TextStyle(color: AppColors.red500)),
                      ),
                    ),
                  ],
                ),
              ),
            Align(
              alignment: AlignmentDirectional.centerStart,
              child: TextButton.icon(
                key: const Key('compat-add'),
                onPressed: () => setState(() => _compat.add(_CompatRow())),
                icon: const Icon(Icons.add),
                label: Text(strings.addCompatibility),
              ),
            ),
            if (_error != null)
              Padding(
                padding: const EdgeInsets.only(top: 16),
                child: Text(
                  _error!,
                  key: const Key('part-error'),
                  style: const TextStyle(color: AppColors.red500, fontWeight: FontWeight.w700, fontSize: 13),
                ),
              ),
            const SizedBox(height: 24),
            SubmitButton(
              key: const Key('part-submit'),
              label: _editing ? strings.saveChanges : strings.addPart,
              busy: _busy,
              busyLabel: strings.uploading,
              onPressed: () => _submit(strings),
            ),
          ],
        ),
      ),
    );
  }
}
