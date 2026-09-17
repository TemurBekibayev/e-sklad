import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_cache_manager/flutter_cache_manager.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../models/product.dart';

class ImageCacheService {
  static final ImageCacheService _instance = ImageCacheService._internal();
  factory ImageCacheService() => _instance;
  ImageCacheService._internal();

  final BaseCacheManager _cacheManager = DefaultCacheManager();
  static const String _keySavedImagesMap = 'pos_saved_dish_images_map';
  bool _isSyncing = false;

  /// Extract unified cache key from image URL so disk cache matches offline & online,
  /// while preserving version/hash query parameters to catch server updates.
  static String? getCacheKey(String? rawUrl) {
    if (rawUrl == null || rawUrl.trim().isEmpty) return null;
    final url = rawUrl.trim();

    final uri = Uri.tryParse(url);
    if (uri != null) {
      final pathWithQuery = uri.hasQuery ? '${uri.path}?${uri.query}' : uri.path;
      if (pathWithQuery.contains('uploads/') || pathWithQuery.contains('media/')) {
        final match = RegExp(r'(uploads\/[^\s]+|media\/[^\s]+)', caseSensitive: false).firstMatch(pathWithQuery);
        if (match != null) {
          return match.group(1);
        }
      }
      if (uri.pathSegments.isNotEmpty) {
        final lastSeg = uri.pathSegments.last;
        return uri.hasQuery ? '$lastSeg?${uri.query}' : lastSeg;
      }
    }

    final match = RegExp(r'(dish_[^\s\/]+|uploads\/[^\s]+|[^\/\s]+\.(jpg|jpeg|png|webp)(\?[^\s]*)?)', caseSensitive: false).firstMatch(url);
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

  /// Autonomous background synchronization:
  /// - Automatically downloads all dish photos into phone cache upon app install / startup
  /// - If a dish image was changed on the server, evicts old cache and downloads the updated photo
  /// - If new dishes are added, pulls and caches their photos
  Future<Map<String, int>> syncProductImages(List<Product> products) async {
    if (_isSyncing) return {'status': 0};
    _isSyncing = true;

    int successCount = 0;
    int skippedCount = 0;
    int errorCount = 0;

    try {
      final prefs = await SharedPreferences.getInstance();
      final savedJson = prefs.getString(_keySavedImagesMap);
      Map<String, dynamic> savedMap = {};
      if (savedJson != null) {
        try {
          savedMap = jsonDecode(savedJson) as Map<String, dynamic>;
        } catch (_) {}
      }

      final Map<String, String> updatedMap = Map<String, String>.from(savedMap);

      for (final product in products) {
        final currentUrl = product.imageUrl?.trim() ?? '';
        final resolvedUrl = product.fullImageUrl ?? resolveProductImageUrl(product.imageUrl, 'https://getpos.uz');

        if (resolvedUrl == null || resolvedUrl.isEmpty) {
          skippedCount++;
          continue;
        }

        final key = getCacheKey(resolvedUrl) ?? resolvedUrl;
        final previousUrl = savedMap[product.id]?.toString();

        // If image URL changed on the server for this dish, evict old cached version
        if (previousUrl != null && previousUrl != currentUrl && previousUrl.isNotEmpty) {
          final oldKey = getCacheKey(previousUrl) ?? previousUrl;
          try {
            await _cacheManager.removeFile(oldKey);
            await _cacheManager.removeFile(previousUrl);
          } catch (_) {}
        }

        try {
          final alreadyCached = await isImageCached(key) || await isImageCached(resolvedUrl);
          if (alreadyCached && (previousUrl == currentUrl || previousUrl == null)) {
            successCount++;
            updatedMap[product.id] = currentUrl;
            continue;
          }

          // Fetch fresh image and cache it locally
          final file = await _cacheManager.getSingleFile(resolvedUrl, key: key).timeout(
            const Duration(seconds: 8),
            onTimeout: () => throw TimeoutException('Timeout: $resolvedUrl'),
          );

          if (file.existsSync()) {
            successCount++;
            updatedMap[product.id] = currentUrl;
          } else {
            errorCount++;
          }
        } catch (e) {
          if (kDebugMode) {
            print('[ImageCacheService] Auto-sync failed for $resolvedUrl: $e');
          }
          errorCount++;
        }
      }

      await prefs.setString(_keySavedImagesMap, jsonEncode(updatedMap));
    } catch (e) {
      if (kDebugMode) {
        print('[ImageCacheService] syncProductImages error: $e');
      }
    } finally {
      _isSyncing = false;
    }

    return {
      'cached': successCount,
      'skipped': skippedCount,
      'errors': errorCount,
    };
  }

  /// Backward-compatible wrapper for preloading
  Future<Map<String, int>> preloadProductImages(List<Product> products) {
    return syncProductImages(products);
  }

  /// Clear disk cache if needed
  Future<void> clearCache() async {
    await _cacheManager.emptyCache();
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_keySavedImagesMap);
  }
}
