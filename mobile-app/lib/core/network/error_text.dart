import '../l10n/app_strings.dart';
import 'api_exception.dart';

/// The text to show a user for [error]: the server's own message when it
/// sent one, a translated connection or timeout message when it never
/// answered, and a generic message for anything else (never a raw
/// exception string).
String errorMessage(Object error, AppStrings strings) {
  if (error is ApiException) {
    switch (error.kind) {
      case ApiErrorKind.network:
        return strings.networkError;
      case ApiErrorKind.timeout:
        return strings.timeoutError;
      case ApiErrorKind.server:
        return error.message.trim().isEmpty ? strings.genericError : error.message;
    }
  }
  return strings.genericError;
}
