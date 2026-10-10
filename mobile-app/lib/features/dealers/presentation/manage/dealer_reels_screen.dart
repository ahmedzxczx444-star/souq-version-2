import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../../core/l10n/app_strings.dart';
import '../../../../core/l10n/dealer_strings.dart';
import '../../../../core/network/api_endpoints.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/relative_time.dart';
import '../../../../shared/providers/language_provider.dart';
import '../../data/dealer_account.dart';
import '../../data/dealer_tools_repository.dart';
import 'dealer_widgets.dart';

/// The dealer's own reels: post a new one (AddReelScreen.tsx on the site)
/// and delete old ones.
///
/// Upload works on every target the picker supports. Playback inside the
/// app exists on Android and iOS only (the video_player plugin has no
/// Windows implementation), so each reel here opens in the system player.
class DealerReelsScreen extends ConsumerWidget {
  const DealerReelsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = ref.watch(stringsProvider);
    final reels = ref.watch(dealerReelsProvider);

    return DealerPage(
      title: strings.myReels,
      floatingAction: FloatingActionButton.extended(
        key: const Key('reel-new'),
        backgroundColor: AppColors.black,
        foregroundColor: AppColors.white,
        icon: const Icon(Icons.video_call_outlined),
        label: Text(strings.newReel),
        onPressed: () async {
          final posted = await showDialog<bool>(context: context, builder: (_) => const _NewReelDialog());
          if (posted == true) {
            ref.invalidate(dealerReelsProvider);
            if (context.mounted) showMessage(context, strings.saved);
          }
        },
      ),
      child: reels.when(
        loading: () => const LoadingView(),
        error: (e, _) => ErrorView(
          message: errorMessage(e, strings),
          onRetry: () => ref.invalidate(dealerReelsProvider),
          strings: strings,
        ),
        data: (list) {
          if (list.isEmpty) return Center(child: EmptyView(icon: Icons.movie_outlined, title: strings.noReelsYet));
          return ListView.separated(
            padding: const EdgeInsets.fromLTRB(24, 8, 24, 96),
            itemCount: list.length,
            separatorBuilder: (_, _) => const SizedBox(height: 12),
            itemBuilder: (context, index) {
              final reel = list[index];
              final car = [reel.make, reel.model].whereType<String>().join(' ');
              final age = relativeTime(reel.createdAt, arabic: strings.isArabic) ?? '';
              return Container(
                key: Key('reel-${reel.id}'),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(color: AppColors.gray50, borderRadius: BorderRadius.circular(20)),
                child: Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.play_circle_outline_rounded, size: 32),
                      onPressed: reel.videoUrl == null
                          ? null
                          : () => launchUrl(
                                Uri.parse(ApiConfig.resolveUrl(reel.videoUrl!)),
                                mode: LaunchMode.externalApplication,
                              ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            (reel.caption ?? '').isEmpty ? (car.isEmpty ? '#${reel.id}' : car) : reel.caption!,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            [
                              if (car.isNotEmpty) car,
                              '${strings.views}: ${reel.views}',
                              '${strings.likes}: ${reel.likes}',
                              if (age.isNotEmpty) age,
                            ].join(' · '),
                            style: const TextStyle(color: AppColors.gray500, fontSize: 12, fontWeight: FontWeight.w700),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      key: Key('reel-delete-${reel.id}'),
                      tooltip: strings.delete,
                      icon: const Icon(Icons.delete_outline_rounded, color: AppColors.red500),
                      onPressed: () async {
                        if (!await confirmDelete(context, strings, title: strings.deleteReelTitle)) return;
                        try {
                          await ref.read(dealerToolsRepositoryProvider).deleteReel(reel.id);
                          ref.invalidate(dealerReelsProvider);
                          ref.invalidate(dealerStatsProvider);
                          if (context.mounted) showMessage(context, strings.deleted);
                        } catch (e) {
                          if (context.mounted) showMessage(context, errorMessage(e, strings));
                        }
                      },
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

class _NewReelDialog extends ConsumerStatefulWidget {
  const _NewReelDialog();

  @override
  ConsumerState<_NewReelDialog> createState() => _NewReelDialogState();
}

class _NewReelDialogState extends ConsumerState<_NewReelDialog> {
  final _caption = TextEditingController();
  PickedMedia? _video;
  String? _uploadedUrl;
  String _carId = '';
  double? _progress;
  String? _error;
  bool _busy = false;

  @override
  void dispose() {
    _caption.dispose();
    super.dispose();
  }

  Future<void> _pick(AppStrings strings) async {
    final picked = await ref.read(mediaPickerProvider).pickVideo();
    if (!mounted || picked == null) return;
    if (!UploadRules.videoAllowed(picked)) return setState(() => _error = strings.videoRejected);
    setState(() {
      _video = picked;
      _uploadedUrl = null;
      _error = null;
    });
  }

  Future<void> _submit(AppStrings strings) async {
    if (_video == null) return setState(() => _error = strings.chooseVideo);
    setState(() {
      _busy = true;
      _error = null;
    });
    final repo = ref.read(dealerToolsRepositoryProvider);
    try {
      _uploadedUrl ??= await repo.uploadVideo(
        _video!,
        onProgress: (f) {
          if (mounted) setState(() => _progress = f);
        },
      );
      await repo.createReel(videoUrl: _uploadedUrl!, caption: _caption.text.trim(), carId: int.tryParse(_carId));
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      if (mounted) setState(() => _error = errorMessage(e, strings));
    } finally {
      if (mounted) {
        setState(() {
          _busy = false;
          _progress = null;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final strings = ref.watch(stringsProvider);
    final cars = ref.watch(dealerCarsProvider).valueOrNull ?? const [];
    return AlertDialog(
      title: Text(strings.newReel),
      content: SizedBox(
        width: 400,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              OutlinedButton.icon(
                key: const Key('reel-pick'),
                onPressed: _busy ? null : () => _pick(strings),
                icon: Icon(_video == null ? Icons.video_library_outlined : Icons.check_circle_outline_rounded),
                label: Text(_video == null ? strings.chooseVideo : _video!.name, overflow: TextOverflow.ellipsis),
              ),
              const SizedBox(height: 8),
              Text(strings.videoRules, style: const TextStyle(fontSize: 11, color: AppColors.gray500)),
              LabeledField(key: const Key('reel-caption'), label: strings.caption, controller: _caption, maxLines: 2),
              LabeledDropdown(
                label: strings.linkedCar,
                value: _carId,
                items: {
                  '': strings.noLinkedCar,
                  for (final car in cars) '${car.id}': '${car.make} ${car.model} ${car.year}',
                },
                onChanged: (v) => _carId = v,
              ),
              if (_progress != null)
                Padding(
                  padding: const EdgeInsets.only(top: 16),
                  child: LinearProgressIndicator(value: _progress, color: AppColors.black),
                ),
              if (_error != null)
                Padding(
                  padding: const EdgeInsets.only(top: 12),
                  child: Text(_error!, style: const TextStyle(color: AppColors.red500, fontWeight: FontWeight.w700, fontSize: 13)),
                ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(onPressed: _busy ? null : () => Navigator.pop(context, false), child: Text(strings.cancel)),
        TextButton(
          key: const Key('reel-submit'),
          onPressed: _busy ? null : () => _submit(strings),
          child: Text(_busy ? strings.uploading : strings.uploadReel),
        ),
      ],
    );
  }
}
