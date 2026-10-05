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
      _dio.interceptors.add(LogInterceptor(requestBody: true, responseBody: true));
    }
  }

  final TokenStorage _tokenStorage;
  late final Dio _dio;

  Future<Response<dynamic>> get(String path, {Map<String, dynamic>? query}) =>
      _run(() => _dio.get(path, queryParameters: query));

  Future<Response<dynamic>> post(String path, {Object? data}) =>
      _run(() => _dio.post(path, data: data));

  Future<Response<dynamic>> put(String path, {Object? data}) =>
      _run(() => _dio.put(path, data: data));

  Future<Response<dynamic>> delete(String path) => _run(() => _dio.delete(path));

  Future<Response<dynamic>> _run(Future<Response<dynamic>> Function() request) async {
    try {
      return await request();
    } on DioException catch (e) {
      throw _toApiException(e);
    }
  }

  ApiException _toApiException(DioException e) {
    final data = e.response?.data;
    final body = data is Map<String, dynamic> ? data : const <String, dynamic>{};
    final message = (body['error'] as String?) ??
        e.message ??
        'Something went wrong. Please try again.';
    return ApiException(
      message,
      statusCode: e.response?.statusCode,
      requiresOtpVerification: body['requiresOtpVerification'] == true,
      email: body['email'] as String?,
      cooldownSeconds: body['cooldownSeconds'] as int?,
    );
  }
}
