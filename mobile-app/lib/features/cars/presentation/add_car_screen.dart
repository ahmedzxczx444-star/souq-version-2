import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/l10n/app_strings.dart';
import '../../../core/l10n/dealer_strings.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/models/car.dart';
import '../../../shared/providers/language_provider.dart';
import '../../dealers/data/dealer_account.dart';
import '../../dealers/data/dealer_tools_repository.dart';
import '../../dealers/presentation/manage/dealer_widgets.dart';

/// Add or edit a car listing (AddCarScreen.tsx on the site).
///
/// Photos go through POST /api/cars/upload first, then the listing is
/// saved with POST /api/cars or PUT /api/cars/:id. A video can be attached
/// when creating; the backend turns it into the listing's reel.
class AddCarScreen extends ConsumerStatefulWidget {
  const AddCarScreen({super.key, this.car});

  /// The listing being edited, or null to add a new one.
  final Car? car;

  @override
  ConsumerState<AddCarScreen> createState() => _AddCarScreenState();
}

class _AddCarScreenState extends ConsumerState<AddCarScreen> {
  final _formKey = GlobalKey<FormState>();
  late final _make = TextEditingController(text: widget.car?.make ?? '');
  late final _model = TextEditingController(text: widget.car?.model ?? '');
  late final _year = TextEditingController(text: widget.car?.year.toString() ?? '');
  late final _price = TextEditingController(text: widget.car?.price.toString() ?? '');
  late final _mileage = TextEditingController(text: widget.car?.mileage.toString() ?? '');
  late final _location = TextEditingController(text: widget.car?.location ?? '');
  late final _description = TextEditingController(text: widget.car?.description ?? '');
  late String _fuel = widget.car?.fuelType ?? 'Petrol';
  late String _transmission = widget.car?.transmission ?? 'Automatic';
  late String _status = widget.car?.status ?? 'available';
  late final _photos = PhotoSelection(stored: widget.car?.images);

  PickedMedia? _video;
  String? _uploadedVideoUrl;
  double? _videoProgress;
  String? _error;
  bool _busy = false;

  bool get _editing => widget.car != null;

  @override
  void dispose() {
    for (final c in [_make, _model, _year, _price, _mileage, _location, _description]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _pickVideo(AppStrings strings) async {
    final picked = await ref.read(mediaPickerProvider).pickVideo();
    if (!mounted || picked == null) return;
    if (!UploadRules.videoAllowed(picked)) return showMessage(context, strings.videoRejected);
    setState(() {
      _video = picked;
      _uploadedVideoUrl = null;
    });
  }

  Future<void> _submit(AppStrings strings) async {
    if (!_formKey.currentState!.validate()) return;
    if (_photos.count == 0) return setState(() => _error = strings.photoRequired);

    setState(() {
      _busy = true;
      _error = null;
    });
    final repo = ref.read(dealerToolsRepositoryProvider);
    try {
      final images = await _photos.resolve(repo);
      if (_video != null && _uploadedVideoUrl == null) {
        _uploadedVideoUrl = await repo.uploadVideo(
          _video!,
          onProgress: (f) {
            if (mounted) setState(() => _videoProgress = f);
          },
        );
      }
      final body = <String, dynamic>{
        'make': _make.text.trim(),
        'model': _model.text.trim(),
        'year': int.parse(_year.text.trim()),
        'price': num.parse(_price.text.trim()),
        'mileage': num.tryParse(_mileage.text.trim()) ?? 0,
        'location': _location.text.trim(),
        'fuel_type': _fuel,
        'transmission': _transmission,
        'description': _description.text.trim(),
        'images': images,
        'status': _status,
      };
      if (_editing) {
        await repo.updateCar(widget.car!.id, body);
      } else {
        await repo.createCar({...body, if (_uploadedVideoUrl != null) 'video_url': _uploadedVideoUrl});
      }
      ref.invalidate(dealerCarsProvider);
      ref.invalidate(dealerStatsProvider);
      ref.invalidate(dealerReelsProvider);
      if (!mounted) return;
      showMessage(context, strings.saved);
      context.canPop() ? context.pop() : context.go('/dealer-dashboard');
    } catch (e) {
      if (mounted) setState(() => _error = errorMessage(e, strings));
    } finally {
      if (mounted) {
        setState(() {
          _busy = false;
          _videoProgress = null;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final strings = ref.watch(stringsProvider);
    String? required(String? v) => (v == null || v.trim().isEmpty) ? strings.requiredField : null;
    final thisYear = DateTime.now().year;

    return DealerPage(
      title: _editing ? strings.editCar : strings.addCar,
      child: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(24, 0, 24, 48),
          children: [
            PhotoPickerField(selection: _photos, strings: strings),
            LabeledField(key: const Key('car-make'), label: strings.make, controller: _make, validator: required),
            LabeledField(key: const Key('car-model'), label: strings.model, controller: _model, validator: required),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: LabeledField(
                    key: const Key('car-year'),
                    label: strings.year,
                    controller: _year,
                    keyboardType: TextInputType.number,
                    validator: (v) {
                      final year = int.tryParse((v ?? '').trim());
                      return year == null || year < 1950 || year > thisYear + 1 ? strings.invalidYear : null;
                    },
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: LabeledField(
                    key: const Key('car-price'),
                    label: strings.price,
                    controller: _price,
                    keyboardType: TextInputType.number,
                    validator: (v) {
                      final price = num.tryParse((v ?? '').trim());
                      return price == null || price <= 0 ? strings.invalidNumber : null;
                    },
                  ),
                ),
              ],
            ),
            LabeledField(
              key: const Key('car-mileage'),
              label: strings.mileageKm,
              controller: _mileage,
              keyboardType: TextInputType.number,
              validator: (v) {
                final text = (v ?? '').trim();
                return text.isNotEmpty && (num.tryParse(text) == null || num.parse(text) < 0) ? strings.invalidNumber : null;
              },
            ),
            LabeledField(key: const Key('car-location'), label: strings.locationLabel, controller: _location),
            Row(
              children: [
                Expanded(
                  child: LabeledDropdown(
                    label: strings.fuelType,
                    value: _fuel,
                    items: {for (final f in const ['Petrol', 'Diesel', 'Hybrid', 'Electric']) f: strings.fuelLabel(f)},
                    onChanged: (v) => _fuel = v,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: LabeledDropdown(
                    label: strings.transmissionLabel,
                    value: _transmission,
                    items: {for (final t in const ['Automatic', 'Manual']) t: strings.transmissionValueLabel(t)},
                    onChanged: (v) => _transmission = v,
                  ),
                ),
              ],
            ),
            // A listing hidden by an administrator stays hidden; the API ignores a status change.
            if (_status != 'hidden')
              LabeledDropdown(
                label: strings.listingStatus,
                value: _status,
                items: {for (final s in const ['available', 'reserved', 'sold']) s: strings.carStatusLabel(s)},
                onChanged: (v) => _status = v,
              ),
            LabeledField(
              key: const Key('car-description'),
              label: strings.description,
              controller: _description,
              maxLines: 4,
            ),
            if (!_editing) ...[
              FieldLabel(strings.videoOptional),
              OutlinedButton.icon(
                key: const Key('car-video'),
                onPressed: _busy ? null : () => _pickVideo(strings),
                icon: Icon(_video == null ? Icons.video_call_outlined : Icons.check_circle_outline_rounded),
                label: Text(_video == null ? strings.chooseVideo : _video!.name, overflow: TextOverflow.ellipsis),
              ),
              const SizedBox(height: 8),
              Text(strings.videoRules, style: const TextStyle(fontSize: 11, color: AppColors.gray500)),
              if (_videoProgress != null)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: LinearProgressIndicator(value: _videoProgress, color: AppColors.black),
                ),
            ],
            if (_error != null)
              Padding(
                padding: const EdgeInsets.only(top: 16),
                child: Text(
                  _error!,
                  key: const Key('car-error'),
                  style: const TextStyle(color: AppColors.red500, fontWeight: FontWeight.w700, fontSize: 13),
                ),
              ),
            const SizedBox(height: 24),
            SubmitButton(
              key: const Key('car-submit'),
              label: _editing ? strings.saveChanges : strings.publish,
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
