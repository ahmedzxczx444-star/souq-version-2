// A store build must never ship pointing at a developer machine.
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_app/core/network/api_endpoints.dart';

void main() {
  String? check(String url, {bool release = true, bool mobile = true}) =>
      ApiConfig.releaseProblem(url: url, release: release, mobile: mobile);

  test('mobile release builds reject development addresses', () {
    expect(check('http://127.0.0.1:3000'), contains('development address'));
    expect(check('http://localhost:3000'), contains('development address'));
    expect(check('http://10.0.2.2:3000'), contains('development address'));
    expect(check('https://127.0.0.1'), contains('development address'));
  });

  test('mobile release builds require HTTPS and a real URL', () {
    expect(check('http://api.example.com'), contains('HTTPS'));
    expect(check(''), isNotNull);
    expect(check('not a url'), isNotNull);
  });

  test('a production HTTPS URL is accepted', () {
    expect(check('https://api.example.com'), isNull);
    expect(check('https://api.example.com/'), isNull);
  });

  test('debug and desktop builds keep working against a local backend', () {
    expect(check('http://127.0.0.1:3000', release: false), isNull);
    expect(check('http://10.0.2.2:3000', release: false), isNull);
    expect(check('http://127.0.0.1:3000', mobile: false), isNull);
  });
}
