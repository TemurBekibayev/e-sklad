import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter_cache_manager/flutter_cache_manager.dart';
import '../../models/product.dart';

class ImageCacheService {
  static final ImageCacheService _instance = ImageCacheService._internal();
  factory ImageCacheService() => _instance;
  ImageCacheService._internal();

  final BaseCacheManager _cacheManager = DefaultCacheManager();

  /// Extract unified cache key from image URL so disk cache matches offline & online
  static String? getCacheKey(String? rawUrl) {
    if (rawUrl == null || rawUrl.trim().isEmpty) return null;
    final url = rawUrl.trim();
    final match = RegExp(r'(dish_[^\s\?\/]+|uploads\/[^\s\?]+|[^\/\s\?]+\.(jpg|jpeg|png|webp))', caseSensitive: false).firstMatch(url);
    if (match != null) {
      return match.group(1);
    }
    return url;
  }

  /// Resolve product image URL based on local Wi-Fi Kassa or Cloud
  static String? resolveProductImageUrl(String? rawUrl, String localKassaUrl) {
    if (rawUrl == null || rawUrl.trim().isEmpty) return null;
    final url = rawUrl.trim();

    var rootLocal = localKassaUrl.trim();
    if (rootLocal.endsWith('/api')) {
      rootLocal = rootLocal.substring(0, rootLocal.length - 4);
    } else if (rootLocal.endsWith('/api/')) {
      rootLocal = rootLocal.substring(0, rootLocal.length - 5);
    }
    if (rootLocal.endsWith('/')) {
      rootLocal = rootLocal.substring(0, rootLocal.length - 1);
    }
    if (!rootLocal.startsWith('http://') && !rootLocal.startsWith('https://')) {
      rootLocal = 'http://$rootLocal';
    }

    // 1. If url contains uploads/ or media/
    if (url.contains('uploads/') || url.contains('media/')) {
      final match = RegExp(r'(uploads\/[^\s\?]+|media\/[^\s\?]+)').firstMatch(url);
      if (match != null) {
        return '$rootLocal/${match.group(1)}';
      }
      final cleanPath = url.startsWith('/') ? url : '/$url';
      return '$rootLocal$cleanPath';
    }

    // 2. If it is localhost / 127.0.0.1
    if (url.contains('localhost') || url.contains('127.0.0.1')) {
      final uri = Uri.tryParse(url);
      if (uri != null) {
        return '$rootLocal${uri.path}';
      }
    }

    // 3. Already full HTTP/HTTPS URL
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }

    final clean = url.startsWith('/') ? url : '/$url';
    return '$rootLocal$clean';
  }

  /// Check if image is already cached on local phone disk
  Future<bool> isImageCached(String urlOrKey) async {
    try {
      final fileInfo = await _cacheManager.getFileFromCache(urlOrKey);
      return fileInfo != null && fileInfo.file.existsSync();
    } catch (_) {
      return false;
    }
  }

  /// Preload and permanently cache all product images over Internet/Cloud
  Future<Map<String, int>> preloadProductImages(List<Product> products) async {
    int successCount = 0;
    int skippedCount = 0;
    int errorCount = 0;

    for (final product in products) {
      final resolvedUrl = product.fullImageUrl ?? resolveProductImageUrl(product.imageUrl, 'https://getpos.uz');
      if (resolvedUrl == null || resolvedUrl.isEmpty) {
        skippedCount++;
        continue;
      }

      final key = getCacheKey(resolvedUrl) ?? resolvedUrl;

      try {
        final isCached = await isImageCached(key) || await isImageCached(resolvedUrl);
        if (isCached) {
          successCount++;
          continue;
        }

        // Download and store in local phone storage with 8s timeout using key
        final file = await _cacheManager.getSingleFile(resolvedUrl, key: key).timeout(
          const Duration(seconds: 8),
          onTimeout: () => throw TimeoutException('Image download timeout: $resolvedUrl'),
        );
        if (file.existsSync()) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch (e) {
        if (kDebugMode) {
          print('[ImageCacheService] Failed downloading: $resolvedUrl ($e)');
        }
        errorCount++;
      }
    }

    if (kDebugMode) {
      print('[ImageCacheService] Preload completed: $successCount cached, $skippedCount without image, $errorCount errors');
    }

    return {
      'cached': successCount,
      'skipped': skippedCount,
      'errors': errorCount,
    };
  }

  /// Clear disk cache if needed
  Future<void> clearCache() async {
    await _cacheManager.emptyCache();
  }
}
