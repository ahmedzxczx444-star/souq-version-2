import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/l10n/app_strings.dart';
import '../../../core/l10n/dealer_strings.dart';
import '../../../core/network/image_urls.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/phone_utils.dart';
import '../../../shared/models/user.dart';
import '../../../shared/providers/auth_provider.dart';
import '../../../shared/providers/language_provider.dart';
import '../../dealers/data/dealer_account.dart';
import '../../dealers/data/dealer_tools_repository.dart';
import '../../dealers/presentation/manage/dealer_widgets.dart';

/// Dealers edit their showroom profile here (GET/PUT /api/dealer/profile).
/// Buyers have no profile-editing endpoint on the backend yet, so they get
/// a pointer to Settings instead of a form that could not be saved.
class EditProfileScreen extends ConsumerWidget {
  const EditProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = ref.watch(stringsProvider);
    final user = ref.watch(authProvider).valueOrNull;

    if (user == null || !user.isDealer) {
      return DealerPage(
        title: strings.editProfile,
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              EmptyView(icon: Icons.person_outline_rounded, title: user?.name ?? '', body: strings.buyerProfileNote),
              TextButton(onPressed: () => context.push('/settings'), child: Text(strings.settings)),
            ],
          ),
        ),
      );
    }

    final account = ref.watch(dealerAccountProvider);
    return DealerPage(
      title: strings.showroomProfile,
      child: account.when(
        loading: () => const LoadingView(),
        error: (e, _) => ErrorView(
          message: errorMessage(e, strings),
          onRetry: () => ref.invalidate(dealerAccountProvider),
          strings: strings,
        ),
        data: (dealer) => _DealerProfileForm(dealer: dealer),
      ),
    );
  }
}

/// "+201001234567" (or a legacy stored format) -> "1001234567" for editing.
String localPhone(String stored) {
  final digits = toWhatsappDigits(stored);
  return digits == null ? '' : digits.substring(2);
}

class _BranchControllers {
  _BranchControllers(AccountBranch b)
      : name = TextEditingController(text: b.name),
        address = TextEditingController(text: b.address),
        phone = TextEditingController(text: localPhone(b.phone)),
        mapLink = b.mapLink;

  final TextEditingController name;
  final TextEditingController address;
  final TextEditingController phone;
  final String mapLink;

  void dispose() {
    name.dispose();
    address.dispose();
    phone.dispose();
  }
}

class _DealerProfileForm extends ConsumerStatefulWidget {
  const _DealerProfileForm({required this.dealer});

  final DealerAccount dealer;

  @override
  ConsumerState<_DealerProfileForm> createState() => _DealerProfileFormState();
}

class _DealerProfileFormState extends ConsumerState<_DealerProfileForm> {
  final _formKey = GlobalKey<FormState>();
  late final _name = TextEditingController(text: widget.dealer.name);
  late final _description = TextEditingController(text: widget.dealer.description);
  late final _location = TextEditingController(text: widget.dealer.location);
  late final _phone = TextEditingController(text: localPhone(widget.dealer.phone));
  late final _whatsapp = TextEditingController(text: localPhone(widget.dealer.whatsapp));
  late final _address = TextEditingController(text: widget.dealer.address);
  late final _mapLink = TextEditingController(text: widget.dealer.mapLink);
  late final List<_BranchControllers> _branches = widget.dealer.branches.map(_BranchControllers.new).toList();
  final _removed = <_BranchControllers>[];
  late String _logo = widget.dealer.logo;
  PickedMedia? _newLogo;
  String? _error;
  bool _busy = false;

  @override
  void dispose() {
    for (final c in [_name, _description, _location, _phone, _whatsapp, _address, _mapLink]) {
      c.dispose();
    }
    for (final b in [..._branches, ..._removed]) {
      b.dispose();
    }
    super.dispose();
  }

  Future<void> _pickLogo(AppStrings strings) async {
    final picked = await ref.read(mediaPickerProvider).pickPhotos(limit: 1);
    if (!mounted || picked.isEmpty) return;
    if (!UploadRules.photoAllowed(picked.first)) return showMessage(context, strings.photoRejected);
    setState(() => _newLogo = picked.first);
  }

  Future<void> _submit(AppStrings strings) async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    final repo = ref.read(dealerToolsRepositoryProvider);
    try {
      if (_newLogo != null) {
        _logo = (await repo.uploadPhotos([_newLogo!])).first;
        _newLogo = null;
      }
      await repo.updateProfile({
        'name': _name.text.trim(),
        'logo': _logo,
        'description': _description.text.trim(),
        'location': _location.text.trim(),
        'phone': toEgyptE164(_phone.text),
        'whatsapp_number': _whatsapp.text.trim().isEmpty ? '' : toEgyptE164(_whatsapp.text),
        'address': _address.text.trim(),
        'map_location_link': _mapLink.text.trim(),
        // Multi-branch dealers and chains keep their branches in the
        // branches API; sending a list here would replace those records.
        if (!widget.dealer.kind.hasBranchManagement)
          'branches': [
            for (final b in _branches)
              AccountBranch(
                name: b.name.text.trim(),
                address: b.address.text.trim(),
                phone: b.phone.text.trim().isEmpty ? '' : toEgyptE164(b.phone.text),
                mapLink: b.mapLink,
              ).toJson(),
          ],
      });
      ref.invalidate(dealerAccountProvider);
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
    String? required(String? v) => (v == null || v.trim().isEmpty) ? strings.requiredField : null;
    String? phoneCheck(String? v, {bool optional = false}) {
      final text = (v ?? '').trim();
      if (text.isEmpty) return optional ? null : strings.requiredField;
      return isValidEgyptLocalPhone(text) ? null : strings.invalidPhone;
    }

    final logo = displayImageUrl(_logo);
    return Form(
      key: _formKey,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(24, 0, 24, 48),
        children: [
          Row(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(20),
                child: SizedBox(
                  width: 72,
                  height: 72,
                  child: logo == null
                      ? const ColoredBox(color: AppColors.gray100)
                      : CachedNetworkImage(
                          imageUrl: logo,
                          fit: BoxFit.cover,
                          errorWidget: (_, _, _) => const ColoredBox(color: AppColors.gray100),
                        ),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: OutlinedButton.icon(
                  key: const Key('profile-logo'),
                  onPressed: _busy ? null : () => _pickLogo(strings),
                  icon: Icon(_newLogo == null ? Icons.image_outlined : Icons.check_circle_outline_rounded),
                  label: Text(_newLogo == null ? strings.changeLogo : _newLogo!.name, overflow: TextOverflow.ellipsis),
                ),
              ),
            ],
          ),
          LabeledField(key: const Key('profile-name'), label: strings.showroomName, controller: _name, validator: required),
          LabeledField(label: strings.description, controller: _description, maxLines: 3),
          LabeledField(label: strings.locationLabel, controller: _location),
          LabeledField(
            key: const Key('profile-phone'),
            label: '${strings.phone} (‎+20‎)',
            controller: _phone,
            keyboardType: TextInputType.phone,
            textDirection: TextDirection.ltr,
            hint: '10XXXXXXXX',
            validator: phoneCheck,
          ),
          LabeledField(
            key: const Key('profile-whatsapp'),
            label: '${strings.whatsapp} (‎+20‎)',
            controller: _whatsapp,
            keyboardType: TextInputType.phone,
            textDirection: TextDirection.ltr,
            hint: '10XXXXXXXX',
            validator: (v) => phoneCheck(v, optional: true),
          ),
          LabeledField(label: strings.address, controller: _address),
          LabeledField(label: strings.mapLink, controller: _mapLink, textDirection: TextDirection.ltr),
          const SizedBox(height: 16),
          Text(strings.branches, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
          if (widget.dealer.kind.hasBranchManagement)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(
                strings.branchesManagedSeparately,
                key: const Key('branches-note'),
                style: const TextStyle(color: AppColors.gray500, fontSize: 13),
              ),
            )
          else ...[
            for (var i = 0; i < _branches.length; i++)
              Container(
                key: Key('branch-$i'),
                margin: const EdgeInsets.only(top: 12),
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                decoration: BoxDecoration(color: AppColors.gray50, borderRadius: BorderRadius.circular(20)),
                child: Column(
                  children: [
                    LabeledField(label: strings.branchName, controller: _branches[i].name, validator: required),
                    LabeledField(label: strings.address, controller: _branches[i].address, validator: required),
                    LabeledField(
                      label: '${strings.phone} (‎+20‎)',
                      controller: _branches[i].phone,
                      keyboardType: TextInputType.phone,
                      textDirection: TextDirection.ltr,
                      validator: (v) => phoneCheck(v, optional: true),
                    ),
                    Align(
                      alignment: AlignmentDirectional.centerEnd,
                      child: TextButton(
                        // Disposed with the form: its fields are still mounted this frame.
                        onPressed: () => setState(() => _removed.add(_branches.removeAt(i))),
                        child: Text(strings.delete, style: const TextStyle(color: AppColors.red500)),
                      ),
                    ),
                  ],
                ),
              ),
            Align(
              alignment: AlignmentDirectional.centerStart,
              child: TextButton.icon(
                key: const Key('branch-add'),
                onPressed: () => setState(() => _branches.add(_BranchControllers(const AccountBranch()))),
                icon: const Icon(Icons.add),
                label: Text(strings.addBranch),
              ),
            ),
          ],
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(top: 16),
              child: Text(
                _error!,
                key: const Key('profile-error'),
                style: const TextStyle(color: AppColors.red500, fontWeight: FontWeight.w700, fontSize: 13),
              ),
            ),
          const SizedBox(height: 24),
          SubmitButton(
            key: const Key('profile-submit'),
            label: strings.saveChanges,
            busy: _busy,
            onPressed: () => _submit(strings),
          ),
        ],
      ),
    );
  }
}
