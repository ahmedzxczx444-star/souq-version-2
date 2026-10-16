import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';
import '../../../shared/models/car.dart';

/// One turn of the Smart AI conversation.
class AiChatMessage {
  const AiChatMessage({required this.role, required this.content, this.cars = const []});

  /// 'user' or 'assistant', as POST /api/ai-search/chat expects in `history`.
  final String role;
  final String content;
  final List<Car> cars;

  bool get isUser => role == 'user';

  Map<String, dynamic> toHistory() => {'role': role, 'content': content};
}

class AiChatReply {
  const AiChatReply({required this.text, required this.cars, required this.slots});

  final String text;
  final List<Car> cars;

  /// What the server understood so far (make, budget, year...). Sent back
  /// with the next message so the conversation keeps its memory.
  final Map<String, dynamic> slots;
}

/// Mirrors src/services/api.ts `aiSearch.chat` (SmartAIScreen.tsx): the
/// last ten turns go as `history`, and the server's `slots` are sent back
/// unchanged with the next message. The server answers from a deterministic
/// search when its AI key is missing or fails, so this always gets a reply.
class AiSearchRepository {
  AiSearchRepository(this._client);

  final ApiClient _client;

  static const timeout = Duration(seconds: 45);

  Future<AiChatReply> chat(String message, List<AiChatMessage> history, Map<String, dynamic> slots) async {
    final recent = history.length > 10 ? history.sublist(history.length - 10) : history;
    final res = await _client.post(
      ApiEndpoints.aiSearchChat,
      data: {'message': message, 'history': [for (final m in recent) m.toHistory()], 'slots': slots},
      timeout: timeout,
    );
    final body = res.data as Map<String, dynamic>;
    final cars = <Car>[];
    for (final raw in (body['cars'] as List?) ?? const []) {
      try {
        cars.add(Car.fromJson(raw as Map<String, dynamic>));
      } catch (_) {
        // A row the model cannot read is skipped rather than failing the reply.
      }
    }
    return AiChatReply(
      text: (body['text'] as String?) ?? '',
      cars: cars,
      slots: (body['slots'] as Map?)?.cast<String, dynamic>() ?? slots,
    );
  }
}
