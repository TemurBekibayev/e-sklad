import 'dart:async';
import 'package:dio/dio.dart';
import '../storage/app_preferences.dart';
import '../constants/api_constants.dart';

enum ServerConnectionType {
  local,
  cloud,
  offline,
}

class DiscoveredServer {
  final String url;
  final ServerConnectionType type;
  final String label;

  DiscoveredServer({
    required this.url,
    required this.type,
    required this.label,
  });
}

class ServerDiscoveryService {
  static final ServerDiscoveryService _instance = ServerDiscoveryService._internal();
  factory ServerDiscoveryService() => _instance;
  ServerDiscoveryService._internal();

  /// Server /health manziliga tezkor so'rov yuborib tekshiradi
  Future<bool> _pingServer(String baseUrl, {int timeoutMs = 1200}) async {
    try {
      final dio = Dio(
        BaseOptions(
          connectTimeout: Duration(milliseconds: timeoutMs),
          receiveTimeout: Duration(milliseconds: timeoutMs),
          headers: {'Accept': 'application/json'},
        ),
      );

      // baseUrl odatda 'http://ip:port/api' shaklida bo'ladi
      final rootUrl = baseUrl.endsWith('/api')
          ? baseUrl.substring(0, baseUrl.length - 4)
          : baseUrl;

      // Avval /health, keyin /api/health tekshirib ko'riladi
      final res = await dio.get('$rootUrl/health');
      if (res.statusCode == 200) return true;
    } catch (_) {
      try {
        final dio = Dio(
          BaseOptions(
            connectTimeout: Duration(milliseconds: timeoutMs),
            receiveTimeout: Duration(milliseconds: timeoutMs),
          ),
        );
        final res = await dio.get('$baseUrl/health');
        if (res.statusCode == 200) return true;
      } catch (_) {}
    }
    return false;
  }

  /// Eng yaxshi serverni avtomatik aniqlash va sozlash (Cloud First)
  Future<DiscoveredServer> autoDiscoverBestServer({bool forceRescan = false}) async {
    final savedUrl = await AppPreferences.getServerUrl();

    // 1. Cloud First: Asosiy bulut serverini (https://getpos.uz) tekshirish
    const cloudUrl = ApiConstants.defaultBaseUrl; // 'https://getpos.uz/api/v1/cafe'
    final isCloudHealthy = await _pingServer(cloudUrl, timeoutMs: 2500);
    if (isCloudHealthy) {
      await AppPreferences.setServerUrl(cloudUrl);
      return DiscoveredServer(
        url: cloudUrl,
        type: ServerConnectionType.cloud,
        label: 'Online Bulut Serveri (getpos.uz)',
      );
    }

    // 2. Agar avval saqlangan manzil bo'lsa va ishlayotgan bo'lsa
    if (!forceRescan && savedUrl.isNotEmpty) {
      final isSavedHealthy = await _pingServer(savedUrl, timeoutMs: 1200);
      if (isSavedHealthy) {
        final isLocal = savedUrl.contains('192.168.') || savedUrl.contains('10.') || savedUrl.contains('localhost') || savedUrl.contains('127.0.0.1');
        return DiscoveredServer(
          url: savedUrl,
          type: isLocal ? ServerConnectionType.local : ServerConnectionType.cloud,
          label: isLocal ? 'Kafedagi Lokal Kassa ($savedUrl)' : 'Online Bulut Serveri',
        );
      }
    }

    // 3. Internet bo'lmaganda lokal Wi-Fi tarmog'idagi Kassa serverini tekshirish
    final candidateUrls = [
      'http://192.168.1.8:4000/api',
      'http://10.0.2.2:4000/api',
      'http://localhost:4000/api',
      'http://192.168.1.12:4000/api',
      'http://192.168.1.5:4000/api',
      'http://192.168.1.10:4000/api',
      'http://192.168.1.2:4000/api',
      'http://192.168.1.3:4000/api',
      'http://192.168.1.4:4000/api',
      'http://192.168.1.6:4000/api',
      'http://192.168.1.7:4000/api',
      'http://192.168.1.9:4000/api',
      'http://192.168.1.11:4000/api',
      'http://192.168.1.14:4000/api',
      'http://192.168.1.15:4000/api',
      'http://192.168.1.20:4000/api',
    ];

    final localServerCompleter = Completer<String?>();
    int pending = candidateUrls.length;

    for (final url in candidateUrls) {
      _pingServer(url, timeoutMs: 1500).then((isOk) {
        if (isOk && !localServerCompleter.isCompleted) {
          localServerCompleter.complete(url);
        } else {
          pending--;
          if (pending == 0 && !localServerCompleter.isCompleted) {
            localServerCompleter.complete(null);
          }
        }
      }).catchError((_) {
        pending--;
        if (pending == 0 && !localServerCompleter.isCompleted) {
          localServerCompleter.complete(null);
        }
      });
    }

    final foundLocalUrl = await localServerCompleter.future;

    if (foundLocalUrl != null) {
      await AppPreferences.setServerUrl(foundLocalUrl);
      return DiscoveredServer(
        url: foundLocalUrl,
        type: ServerConnectionType.local,
        label: 'Kafedagi Lokal Kassa ($foundLocalUrl)',
      );
    }

    // 4. Hech qaysi serverga ulanib bo'lmasa -> Offline / Demo
    return DiscoveredServer(
      url: savedUrl.isNotEmpty ? savedUrl : ApiConstants.defaultBaseUrl,
      type: ServerConnectionType.offline,
      label: 'Offline Rejim (Tarmoq mavjud emas)',
    );
  }
}
