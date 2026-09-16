import 'package:flutter/material.dart';
import '../core/storage/app_preferences.dart';
import '../core/network/api_service.dart';
import '../core/network/server_discovery_service.dart';

class SettingsProvider extends ChangeNotifier {
  String _serverUrl = 'https://getpos.uz/api/v1/cafe';
  String _localKassaUrl = 'http://192.168.1.8:4000/api';
  bool _useMockData = false;
  String _language = 'uz';
  bool _isServerOnline = false;
  bool _isDiscovering = false;
  ServerConnectionType _connectionType = ServerConnectionType.cloud;
  String _serverStatusLabel = 'Tekshirilmoqda...';

  String get serverUrl => _serverUrl;
  String get localKassaUrl => _localKassaUrl;
  bool get useMockData => _useMockData;
  String get language => _language;
  bool get isServerOnline => _isServerOnline;
  bool get isDiscovering => _isDiscovering;
  ServerConnectionType get connectionType => _connectionType;
  String get serverStatusLabel => _serverStatusLabel;

  Future<void> init() async {
    _serverUrl = await AppPreferences.getServerUrl();
    _localKassaUrl = await AppPreferences.getLocalKassaUrl();
    _useMockData = await AppPreferences.isUsingMockData();
    await checkHealth();
  }

  Future<void> autoDiscoverServer({bool force = false}) async {
    _isDiscovering = true;
    notifyListeners();

    try {
      final discovered = await ServerDiscoveryService().autoDiscoverBestServer(forceRescan: force);
      _serverUrl = discovered.url;
      _connectionType = discovered.type;
      _serverStatusLabel = discovered.label;
      _isServerOnline = discovered.type != ServerConnectionType.offline;
      ApiService().resetDio();
    } catch (_) {
      await checkHealth();
    } finally {
      _isDiscovering = false;
      notifyListeners();
    }
  }

  Future<bool> checkHealth() async {
    _isServerOnline = await ApiService().checkHealth();
    final status = ApiService().connectionStatusNotifier.value;
    _connectionType = status;

    if (status == ServerConnectionType.cloud) {
      _serverStatusLabel = '☁️ Bulut Serveri (getpos.uz) — Online';
    } else if (status == ServerConnectionType.local) {
      _serverStatusLabel = '💻 Kafedagi Wi-Fi Kassa ($_localKassaUrl) — Faol';
    } else {
      _serverStatusLabel = '⚠️ Oflayn rejim (Tarmoq yo\'q)';
    }

    notifyListeners();
    return _isServerOnline;
  }

  Future<void> updateLocalKassaUrl(String url) async {
    var formatted = url.trim();
    if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
      if (formatted.contains(':')) {
        formatted = 'http://$formatted/api';
      } else {
        formatted = 'http://$formatted:4000/api';
      }
    }
    _localKassaUrl = formatted;
    await AppPreferences.setLocalKassaUrl(formatted);
    ApiService().resetDio();
    await checkHealth();
    notifyListeners();
  }

  Future<void> updateServerUrl(String url) async {
    _serverUrl = url;
    await AppPreferences.setServerUrl(url);
    ApiService().resetDio();
    await checkHealth();
    notifyListeners();
  }

  Future<void> toggleMockData(bool value) async {
    _useMockData = value;
    await AppPreferences.setUseMockData(value);
    notifyListeners();
  }

  void setLanguage(String lang) {
    _language = lang;
    notifyListeners();
  }
}

