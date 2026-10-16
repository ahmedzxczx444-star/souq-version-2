import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/l10n/app_strings.dart';
import '../../../core/l10n/dealer_strings.dart';
import '../../../core/l10n/market_strings.dart';
import '../../../core/network/error_text.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/models/car.dart';
import '../../../shared/providers/core_providers.dart';
import '../../../shared/providers/language_provider.dart';
import '../../../shared/widgets/web_layout.dart';
import '../data/ai_search_repository.dart';

/// Smart AI search (src/screens/SmartAIScreen.tsx): a chat with
/// POST /api/ai-search/chat. Each reply can carry matching cars, shown as
/// cards that open the listing. The server keeps the conversation's memory
/// in `slots`, which are sent back with every message.
class AiSearchScreen extends ConsumerStatefulWidget {
  const AiSearchScreen({super.key});

  @override
  ConsumerState<AiSearchScreen> createState() => _AiSearchScreenState();
}

class _AiSearchScreenState extends ConsumerState<AiSearchScreen> {
  final _input = TextEditingController();
  final _scroll = ScrollController();
  final _messages = <AiChatMessage>[];
  Map<String, dynamic> _slots = {};
  bool _busy = false;
  String? _error;
  String? _failedMessage;

  @override
  void dispose() {
    _input.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _send([String? text]) async {
    final message = (text ?? _input.text).trim();
    if (message.isEmpty || _busy) return;
    final strings = ref.read(stringsProvider);
    // A retry resends the user's last message, which is already on screen.
    final isRetry = _messages.isNotEmpty && _messages.last.isUser && _messages.last.content == message;
    final history = List<AiChatMessage>.from(isRetry ? _messages.sublist(0, _messages.length - 1) : _messages);
    setState(() {
      _busy = true;
      _error = null;
      _failedMessage = null;
      if (!isRetry) _messages.add(AiChatMessage(role: 'user', content: message));
      _input.clear();
    });
    _scrollToEnd();
    try {
      final reply = await ref.read(aiSearchRepositoryProvider).chat(message, history, _slots);
      if (!mounted) return;
      setState(() {
        _slots = reply.slots;
        _messages.add(AiChatMessage(role: 'assistant', content: reply.text, cars: reply.cars));
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = errorMessage(e, strings);
        _failedMessage = message;
      });
    } finally {
      if (mounted) setState(() => _busy = false);
      _scrollToEnd();
    }
  }

  void _reset() => setState(() {
        _messages.clear();
        _slots = {};
        _error = null;
        _failedMessage = null;
      });

  void _scrollToEnd() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scroll.hasClients) {
        _scroll.animateTo(_scroll.position.maxScrollExtent, duration: const Duration(milliseconds: 250), curve: Curves.easeOut);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final strings = ref.watch(stringsProvider);
    return Scaffold(
      appBar: AppBar(
        title: Text(strings.smartAi),
        actions: [
          if (_messages.isNotEmpty)
            IconButton(key: const Key('ai-reset'), tooltip: strings.newChat, onPressed: _busy ? null : _reset, icon: const Icon(Icons.refresh_rounded)),
        ],
      ),
      body: WebColumn(
        child: Column(
          children: [
            Expanded(
              child: ListView(
                controller: _scroll,
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
                children: [
                  _Bubble(text: strings.smartAiIntro, isUser: false),
                  if (_messages.isEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          for (final s in [strings.suggestion1, strings.suggestion2, strings.suggestion3])
                            ActionChip(label: Text(s), onPressed: () => _send(s)),
                        ],
                      ),
                    ),
                  for (final m in _messages) ...[
                    _Bubble(text: m.content, isUser: m.isUser),
                    if (m.cars.isNotEmpty) _CarStrip(cars: m.cars, strings: strings),
                  ],
                  if (_busy)
                    Padding(
                      key: const Key('ai-thinking'),
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      child: Row(
                        children: [
                          const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.emerald500)),
                          const SizedBox(width: 12),
                          Text(strings.thinking, style: const TextStyle(color: AppColors.gray500, fontWeight: FontWeight.w700)),
                        ],
                      ),
                    ),
                  if (_error != null)
                    Container(
                      key: const Key('ai-error'),
                      margin: const EdgeInsets.only(top: 8),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(color: AppColors.rose100, borderRadius: BorderRadius.circular(16)),
                      child: Row(
                        children: [
                          Expanded(child: Text(_error!, style: const TextStyle(color: AppColors.rose600, fontWeight: FontWeight.w700, fontSize: 13))),
                          TextButton(key: const Key('ai-retry'), onPressed: () => _send(_failedMessage), child: Text(strings.retry)),
                        ],
                      ),
                    ),
                ],
              ),
            ),
            SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        key: const Key('ai-input'),
                        controller: _input,
                        enabled: !_busy,
                        textInputAction: TextInputAction.send,
                        onSubmitted: (_) => _send(),
                        decoration: InputDecoration(hintText: strings.smartAiHint),
                      ),
                    ),
                    const SizedBox(width: 8),
                    IconButton.filled(
                      key: const Key('ai-send'),
                      tooltip: strings.send,
                      style: IconButton.styleFrom(backgroundColor: AppColors.emeraldDeep),
                      onPressed: _busy ? null : () => _send(),
                      icon: const Icon(Icons.send_rounded),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Bubble extends StatelessWidget {
  const _Bubble({required this.text, required this.isUser});

  final String text;
  final bool isUser;

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: isUser ? AlignmentDirectional.centerEnd : AlignmentDirectional.centerStart,
      child: Container(
        constraints: const BoxConstraints(maxWidth: 320),
        margin: const EdgeInsets.symmetric(vertical: 4),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: isUser ? AppColors.emeraldDeep : AppColors.gray100,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          text,
          style: TextStyle(color: isUser ? AppColors.white : AppColors.gray900, fontWeight: FontWeight.w600, height: 1.5),
        ),
      ),
    );
  }
}

class _CarStrip extends StatelessWidget {
  const _CarStrip({required this.cars, required this.strings});

  final List<Car> cars;
  final AppStrings strings;

  static final _price = NumberFormat.decimalPattern();

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 200,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(vertical: 8),
        itemCount: cars.length,
        separatorBuilder: (_, _) => const SizedBox(width: 12),
        itemBuilder: (context, i) {
          final car = cars[i];
          return InkWell(
            key: Key('ai-car-${car.id}'),
            borderRadius: BorderRadius.circular(20),
            onTap: () => context.push('/car/${car.id}'),
            child: Container(
              width: 180,
              decoration: BoxDecoration(
                color: AppColors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppColors.gray100),
              ),
              clipBehavior: Clip.antiAlias,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: car.coverImage.isEmpty
                        ? Container(color: AppColors.gray100, child: const Center(child: Icon(Icons.directions_car_rounded, color: AppColors.gray400)))
                        : CachedNetworkImage(
                            imageUrl: car.coverImage,
                            width: double.infinity,
                            fit: BoxFit.cover,
                            errorWidget: (_, _, _) => Container(color: AppColors.gray100),
                          ),
                  ),
                  Padding(
                    padding: const EdgeInsets.all(10),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('${car.make} ${car.model} ${car.year}',
                            maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13)),
                        const SizedBox(height: 2),
                        Text('${_price.format(car.price)} ${strings.currency}',
                            style: const TextStyle(color: AppColors.emerald600, fontWeight: FontWeight.w800, fontSize: 12)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
