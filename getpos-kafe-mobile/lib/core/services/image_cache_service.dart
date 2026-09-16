import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter_cache_manager/flutter_cache_manager.dart';
import '../storage/app_preferences.dart';
import '../../models/product.dart';

class ImageCacheService {
  static final ImageCacheService _instance = ImageCacheService._internal();
  factory ImageCacheService() => _instance;
  ImageCacheService._internal();

  final BaseCacheManager _cacheManager = DefaultCacheManager();

  /// Resolve product image URL based on local Wi-Fi Kassa or Cloud
  static String? resolveProductImageUrl(String? rawUrl, String localKassaUrl) {
    if (rawUrl == null || rawUrl.trim().isEmpty) return null;
    final url = rawUrl.trim();

    // Already full HTTP/HTTPS URL
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }

    // Local Kassa uploads: e.g. /uploads/img_123.jpg or uploads/img_123.jpg
    if (url.contains('uploads/') || url.contains('media/')) {
      var rootLocal = localKassaUrl.trim();
      if (rootLocal.endsWith('/api')) {
        rootLocal = rootLocal.substring(0, rootLocal.length - 4);
      } else if (rootLocal.endsWith('/api/')) {
        rootLocal = rootLocal.substring(0, rootLocal.length - 5);
      }
      if (rootLocal.endsWith('/')) {
        rootLocal = rootLocal.substring(0, rootLocal.length - 1);
      }

      final cleanPath = url.startsWith('/') ? url : '/$url';
      return '$rootLocal$cleanPath';
    }

    final clean = url.startsWith('/') ? url : '/$url';
    return 'https://getpos.uz$clean';
  }

  /// Check if image is already cached on local phone disk
  Future<bool> isImageCached(String url) async {
    try {
      final fileInfo = await _cacheManager.getFileFromCache(url);
      return fileInfo != null && fileInfo.file.existsSync();
    } catch (_) {
      return false;
    }
  }

  /// Preload and permanently cache all product images over local Wi-Fi
  Future<Map<String, int>> preloadProductImages(List<Product> products) async {
    final localKassaUrl = await AppPreferences.getLocalKassaUrl();
    int successCount = 0;
    int skippedCount = 0;
    int errorCount = 0;

    for (final product in products) {
      final resolvedUrl = resolveProductImageUrl(product.imageUrl, localKassaUrl);
      if (resolvedUrl == null || resolvedUrl.isEmpty) {
        skippedCount++;
        continue;
      }

      try {
        final isCached = await isImageCached(resolvedUrl);
        if (isCached) {
          successCount++;
          continue;
        }

        // Download and store in local phone storage
        final file = await _cacheManager.getSingleFile(resolvedUrl);
        if (file.existsSync()) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch (e) {
        errorCount++;
      }
    }

    if (kDebugMode) {
      print('[ImageCacheService] Preload completed:  cached,  without image,  errors');
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
