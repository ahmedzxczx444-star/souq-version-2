import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/l10n/app_strings.dart';
import '../../../core/l10n/moderation_strings.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/network/error_text.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/providers/auth_provider.dart';
import '../../../shared/providers/language_provider.dart';
import '../data/moderation_repository.dart';

/// Opens the report form for one car, reel, part, dealer or user. Guests are
/// sent to sign in first, since the server only takes reports from accounts.
Future<void> showReportSheet(BuildContext context, WidgetRef ref, ReportTarget target, int targetId) async {
  if (ref.read(authProvider).valueOrNull == null) {
    context.push('/login');
    return;
  }
  final message = await showModalBottomSheet<String>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (_) => ReportSheet(target: target, targetId: targetId),
  );
  if (message != null && context.mounted) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }
}

/// The report form. Pops with the confirmation text once the server accepted
/// the report; errors stay on the sheet so the user can retry.
class ReportSheet extends ConsumerStatefulWidget {
  const ReportSheet({super.key, required this.target, required this.targetId});

  final ReportTarget target;
  final int targetId;

  @override
  ConsumerState<ReportSheet> createState() => _ReportSheetState();
}

class _ReportSheetState extends ConsumerState<ReportSheet> {
  final _details = TextEditingController();
  String? _reason;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _details.dispose();
    super.dispose();
  }

  String _title(AppStrings s) {
    switch (widget.target) {
      case ReportTarget.car:
        return s.reportCar;
      case ReportTarget.reel:
        return s.reportReel;
      case ReportTarget.part:
        return s.reportPart;
      case ReportTarget.dealer:
      case ReportTarget.user:
        return s.reportDealer;
    }
  }

  String _failure(Object e, AppStrings s) {
    if (e is ApiException) {
      switch (e.statusCode) {
        case 429:
          return s.reportTooMany;
        case 404:
          return s.reportGone;
        case 400:
          if (e.message.contains('own content')) return s.reportOwn;
      }
    }
    return errorMessage(e, s);
  }

  Future<void> _submit(AppStrings s) async {
    if (_reason == null) {
      setState(() => _error = s.reportChooseReason);
      return;
    }
    if (_reason == 'other' && _details.text.trim().isEmpty) {
      setState(() => _error = s.reportDetailsRequired);
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final already = await ref
          .read(moderationRepositoryProvider)
          .report(widget.target, widget.targetId, reason: _reason!, details: _details.text);
      if (mounted) Navigator.of(context).pop(already ? s.reportAlreadySent : s.reportSent);
    } catch (e) {
      if (mounted) setState(() => _error = _failure(e, s));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    return Padding(
      padding: EdgeInsets.only(left: 20, right: 20, bottom: MediaQuery.viewInsetsOf(context).bottom + 20),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(_title(s), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.gray900)),
            const SizedBox(height: 6),
            Text(s.reportHint, style: const TextStyle(fontSize: 13, color: AppColors.gray500)),
            const SizedBox(height: 16),
            Text(s.reportWhy, style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.gray900)),
            RadioGroup<String>(
              groupValue: _reason,
              onChanged: (v) {
                if (!_busy) setState(() => _reason = v);
              },
              child: Column(
                children: [
                  for (final r in reportReasons)
                    RadioListTile<String>(
                      key: Key('report-reason-$r'),
                      value: r,
                      enabled: !_busy,
                      contentPadding: EdgeInsets.zero,
                      activeColor: AppColors.emeraldAccent,
                      title: Text(s.reportReason(r)),
                    ),
                ],
              ),
            ),
            TextField(
              key: const Key('report-details'),
              controller: _details,
              enabled: !_busy,
              maxLines: 3,
              maxLength: reportDetailsMax,
              decoration: InputDecoration(labelText: _reason == 'other' ? s.reportDetailsRequired : s.reportDetails),
            ),
            if (_error != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Text(_error!, key: const Key('report-error'), style: const TextStyle(color: AppColors.red500, fontWeight: FontWeight.w600)),
              ),
            FilledButton(
              key: const Key('report-submit'),
              style: FilledButton.styleFrom(backgroundColor: AppColors.red500, minimumSize: const Size.fromHeight(48)),
              onPressed: _busy ? null : () => _submit(s),
              child: Text(_busy ? s.reportSending : s.reportSubmit),
            ),
          ],
        ),
      ),
    );
  }
}
