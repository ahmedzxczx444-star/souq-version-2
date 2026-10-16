import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

import '../storage/token_storage.dart';
import 'api_endpoints.dart';
import 'api_exception.dart';

/// Thin Dio wrapper that mirrors src/services/api.ts's `getHeaders()` +
/// fetch-error-shape handling: attaches the bearer token to every request
/// and normalizes error bodies (`{error, requiresOtpVerification, email,
/// cooldownSeconds}`, as thrown by server.ts) into [ApiException].
///
/// There is no refresh-token endpoint on the backend, so a 401 here always
/// means "the session is gone" — [onUnauthorized] is called so the app can
/// clear local state and reroute to login, same as the website would force
/// a re-login rather than silently retrying.
class ApiClient {
  ApiClient(this._tokenStorage, {VoidCallback? onUnauthorized}) {
    _dio = Dio(
      BaseOptions(
        baseUrl: ApiConfig.baseUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 20),
        contentType: 'application/json',
      ),
    );

    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await _tokenStorage.readToken();
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
        onError: (error, handler) {
          if (error.response?.statusCode == 401) {
            onUnauthorized?.call();
          }
          handler.next(error);
        },
      ),
    );

    if (kDebugMode) {
      // Bodies stay out of the log: they carry passwords, OTP codes and tokens.
      _dio.interceptors.add(LogInterceptor(requestHeader: false, responseHeader: false));
    }
  }

  final TokenStorage _tokenStorage;
  late final Dio _dio;

  Future<Response<dynamic>> get(String path, {Map<String, dynamic>? query}) =>
      _run(() => _dio.get(path, queryParameters: query));

  /// [timeout] overrides the default receive timeout for slow endpoints
  /// (the AI search can take far longer than an ordinary JSON call).
  Future<Response<dynamic>> post(String path, {Object? data, Duration? timeout}) =>
      _run(() => _dio.post(path, data: data, options: timeout == null ? null : Options(receiveTimeout: timeout)));

  Future<Response<dynamic>> put(String path, {Object? data}) =>
      _run(() => _dio.put(path, data: data));

  Future<Response<dynamic>> delete(String path) => _run(() => _dio.delete(path));

  /// multipart/form-data upload of local files under one form [field]
  /// (POST /api/cars/upload "images", POST /api/reels/upload "video").
  /// The server filters on the declared MIME type, so each file carries one.
  Future<Response<dynamic>> upload(
    String path, {
    required String field,
    required List<({String path, String name, String mimeType})> files,
    void Function(int sent, int total)? onProgress,
  }) =>
      _run(() async {
        final form = FormData();
        for (final file in files) {
          form.files.add(MapEntry(
            field,
            await MultipartFile.fromFile(file.path, filename: file.name, contentType: DioMediaType.parse(file.mimeType)),
          ));
        }
        return _dio.post(
          path,
          data: form,
          onSendProgress: onProgress,
          // A 100 MB reel on a phone connection takes far longer than a JSON call.
          options: Options(sendTimeout: const Duration(minutes: 10), receiveTimeout: const Duration(minutes: 10)),
        );
      });

  Future<Response<dynamic>> _run(Future<Response<dynamic>> Function() request) async {
    try {
      return await request();
    } on DioException catch (e) {
      throw _toApiException(e);
    }
  }

  ApiException _toApiException(DioException e) {
    final response = e.response;
    if (response == null) {
      // No answer at all: keep Dio's English text out of the UI.
      final timedOut = e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.receiveTimeout ||
          e.type == DioExceptionType.sendTimeout;
      return ApiException('', kind: timedOut ? ApiErrorKind.timeout : ApiErrorKind.network);
    }
    final data = response.data;
    final body = data is Map<String, dynamic> ? data : const <String, dynamic>{};
    return ApiException(
      (body['error'] as String?) ?? '',
      statusCode: response.statusCode,
      requiresOtpVerification: body['requiresOtpVerification'] == true,
      email: body['email'] as String?,
      cooldownSeconds: body['cooldownSeconds'] as int?,
    );
  }
}
