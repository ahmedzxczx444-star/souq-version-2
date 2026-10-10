import 'dart:io';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/l10n/app_strings.dart';
import '../../../../core/l10n/dealer_strings.dart';
import '../../../../core/network/api_endpoints.dart';
import '../../../../core/network/api_exception.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/web_layout.dart';
import '../../data/dealer_account.dart';
import '../../data/dealer_tools_repository.dart';

/// Page frame shared by the dealer screens: the site's phone-width column,
/// a back button and a bold title.
class DealerPage extends StatelessWidget {
  const DealerPage({super.key, required this.title, required this.child, this.action, this.floatingAction});

  final String title;
  final Widget child;
  final Widget? action;
  final Widget? floatingAction;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.white,
      body: SafeArea(
        child: WebColumn(
          // The action button stays inside the column instead of the window corner.
          child: Stack(
            children: [
              Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(24, 24, 24, 16),
                child: Row(
                  children: [
                    WebBackButton(onTap: () => context.canPop() ? context.pop() : context.go('/profile')),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Text(
                        title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w900,
                          letterSpacing: -0.6,
                          color: AppColors.gray900,
                        ),
                      ),
                    ),
                    if (action != null) action!,
                  ],
                ),
              ),
              Expanded(child: child),
            ],
              ),
              if (floatingAction != null)
                PositionedDirectional(end: 24, bottom: 24, child: floatingAction!),
            ],
          ),
        ),
      ),
    );
  }
}

String errorMessage(Object error, AppStrings strings) =>
    error is ApiException ? error.message : strings.genericError;

class LoadingView extends StatelessWidget {
  const LoadingView({super.key});

  @override
  Widget build(BuildContext context) =>
      const Center(child: CircularProgressIndicator(color: AppColors.black, strokeWidth: 2));
}

class ErrorView extends StatelessWidget {
  const ErrorView({super.key, required this.message, required this.onRetry, required this.strings});

  final String message;
  final VoidCallback onRetry;
  final AppStrings strings;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.cloud_off_rounded, size: 40, color: AppColors.gray400),
            const SizedBox(height: 16),
            Text(strings.loadFailed, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
            const SizedBox(height: 8),
            Text(message, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.gray500, fontSize: 13)),
            const SizedBox(height: 16),
            TextButton(key: const Key('retry'), onPressed: onRetry, child: Text(strings.retry)),
          ],
        ),
      ),
    );
  }
}

class EmptyView extends StatelessWidget {
  const EmptyView({super.key, required this.icon, required this.title, this.body});

  final IconData icon;
  final String title;
  final String? body;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 40),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 72,
            height: 72,
            decoration: BoxDecoration(color: AppColors.gray50, borderRadius: BorderRadius.circular(28)),
            child: Icon(icon, size: 32, color: AppColors.gray400),
          ),
          const SizedBox(height: 16),
          Text(title, textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
          if (body != null) ...[
            const SizedBox(height: 6),
            Text(body!, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.gray500, fontSize: 13)),
          ],
        ],
      ),
    );
  }
}

/// Small uppercase label above a form control, as on the site's forms.
class FieldLabel extends StatelessWidget {
  const FieldLabel(this.text, {super.key});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8, top: 16),
      child: Text(text, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.gray400)),
    );
  }
}

class LabeledField extends StatelessWidget {
  const LabeledField({
    super.key,
    required this.label,
    required this.controller,
    this.keyboardType,
    this.maxLines = 1,
    this.validator,
    this.textDirection,
    this.hint,
  });

  final String label;
  final TextEditingController controller;
  final TextInputType? keyboardType;
  final int maxLines;
  final String? Function(String?)? validator;
  final TextDirection? textDirection;
  final String? hint;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        FieldLabel(label),
        TextFormField(
          controller: controller,
          keyboardType: keyboardType,
          maxLines: maxLines,
          validator: validator,
          textDirection: textDirection,
          decoration: InputDecoration(hintText: hint),
        ),
      ],
    );
  }
}

class LabeledDropdown extends StatelessWidget {
  const LabeledDropdown({
    super.key,
    required this.label,
    required this.value,
    required this.items,
    required this.onChanged,
  });

  final String label;
  final String value;
  final Map<String, String> items;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        FieldLabel(label),
        DropdownButtonFormField<String>(
          initialValue: items.containsKey(value) ? value : null,
          isExpanded: true,
          items: [
            for (final e in items.entries)
              DropdownMenuItem(value: e.key, child: Text(e.value, overflow: TextOverflow.ellipsis)),
          ],
          onChanged: (v) => onChanged(v ?? ''),
        ),
      ],
    );
  }
}

Future<bool> confirmDelete(BuildContext context, AppStrings strings, {String? title, String? body}) async {
  final ok = await showDialog<bool>(
    context: context,
    builder: (dialogContext) => AlertDialog(
      title: Text(title ?? strings.deleteItemTitle),
      content: Text(body ?? strings.deleteItemBody),
      actions: [
        TextButton(onPressed: () => Navigator.pop(dialogContext, false), child: Text(strings.cancel)),
        TextButton(
          key: const Key('confirm-delete'),
          onPressed: () => Navigator.pop(dialogContext, true),
          child: Text(strings.delete, style: const TextStyle(color: AppColors.red500)),
        ),
      ],
    ),
  );
  return ok == true;
}

void showMessage(BuildContext context, String message) {
  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
}

/// The photos of a listing or part being edited: paths already stored on
/// the server plus files picked on this device and not uploaded yet.
class PhotoSelection {
  PhotoSelection({List<String>? stored}) : stored = [...?stored];

  final List<String> stored;
  final List<PickedMedia> fresh = [];

  int get count => stored.length + fresh.length;
  int get remaining => UploadRules.maxPhotos - count;

  /// Uploads the new files and returns every photo path, stored ones first.
  Future<List<String>> resolve(DealerToolsRepository repo) async {
    if (fresh.isEmpty) return [...stored];
    final uploaded = await repo.uploadPhotos(fresh);
    stored.addAll(uploaded);
    fresh.clear();
    return [...stored];
  }
}

class PhotoPickerField extends ConsumerStatefulWidget {
  const PhotoPickerField({super.key, required this.selection, required this.strings});

  final PhotoSelection selection;
  final AppStrings strings;

  @override
  ConsumerState<PhotoPickerField> createState() => _PhotoPickerFieldState();
}

class _PhotoPickerFieldState extends ConsumerState<PhotoPickerField> {
  Future<void> _pick() async {
    final selection = widget.selection;
    if (selection.remaining <= 0) return;
    final picked = await ref.read(mediaPickerProvider).pickPhotos(limit: selection.remaining);
    if (!mounted || picked.isEmpty) return;
    final accepted = picked.where(UploadRules.photoAllowed).take(selection.remaining).toList();
    setState(() => selection.fresh.addAll(accepted));
    if (accepted.length != picked.length) showMessage(context, widget.strings.photoRejected);
  }

  Widget _tile({required Widget image, required VoidCallback onRemove, required Key removeKey}) {
    return Stack(
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(16),
          child: SizedBox(width: 88, height: 88, child: image),
        ),
        PositionedDirectional(
          top: 4,
          end: 4,
          child: GestureDetector(
            key: removeKey,
            onTap: onRemove,
            child: Container(
              padding: const EdgeInsets.all(4),
              decoration: const BoxDecoration(color: Color(0x99000000), shape: BoxShape.circle),
              child: const Icon(Icons.close, size: 14, color: AppColors.white),
            ),
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final selection = widget.selection;
    final strings = widget.strings;
    const placeholder = ColoredBox(color: AppColors.gray100);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        FieldLabel('${strings.photos} (${selection.count}/${UploadRules.maxPhotos})'),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (var i = 0; i < selection.stored.length; i++)
              _tile(
                removeKey: Key('remove-stored-$i'),
                image: CachedNetworkImage(
                  imageUrl: ApiConfig.resolveUrl(selection.stored[i]),
                  fit: BoxFit.cover,
                  placeholder: (_, _) => placeholder,
                  errorWidget: (_, _, _) => placeholder,
                ),
                onRemove: () => setState(() => selection.stored.removeAt(i)),
              ),
            for (var i = 0; i < selection.fresh.length; i++)
              _tile(
                removeKey: Key('remove-fresh-$i'),
                image: Image.file(
                  File(selection.fresh[i].path),
                  fit: BoxFit.cover,
                  errorBuilder: (_, _, _) => placeholder,
                ),
                onRemove: () => setState(() => selection.fresh.removeAt(i)),
              ),
            if (selection.remaining > 0)
              GestureDetector(
                key: const Key('add-photos'),
                onTap: _pick,
                child: Container(
                  width: 88,
                  height: 88,
                  decoration: BoxDecoration(
                    color: AppColors.gray50,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.gray200),
                  ),
                  child: const Icon(Icons.add_a_photo_outlined, color: AppColors.gray500),
                ),
              ),
          ],
        ),
        const SizedBox(height: 8),
        Text(strings.photoRules, style: const TextStyle(fontSize: 11, color: AppColors.gray500)),
      ],
    );
  }
}

/// Black pill submit button with a busy state.
class SubmitButton extends StatelessWidget {
  const SubmitButton({super.key, required this.label, required this.onPressed, this.busy = false, this.busyLabel});

  final String label;
  final VoidCallback onPressed;
  final bool busy;
  final String? busyLabel;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton(
        onPressed: busy ? null : onPressed,
        style: ElevatedButton.styleFrom(backgroundColor: AppColors.black),
        child: busy
            ? Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.white),
                  ),
                  if (busyLabel != null) ...[const SizedBox(width: 12), Text(busyLabel!)],
                ],
              )
            : Text(label),
      ),
    );
  }
}
