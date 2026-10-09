import 'api_endpoints.dart';

/// A logo/avatar URL in a form Flutter's image codecs can load, or null when
/// there is none.
///
/// The backend's default dealer logos are DiceBear SVG avatars (server.ts),
/// which a browser renders natively but `Image` cannot ("Invalid image
/// data"); DiceBear serves the identical avatar as PNG from the sibling
/// `/png` endpoint. Server-relative paths are resolved against the API base.
String? displayImageUrl(String? url) {
  if (url == null || url.isEmpty) return null;
  final uri = Uri.tryParse(url);
  if (uri != null && uri.host == 'api.dicebear.com' && uri.path.endsWith('/svg')) {
    return uri.replace(path: '${uri.path.substring(0, uri.path.length - 3)}png').toString();
  }
  return ApiConfig.resolveUrl(url);
}
