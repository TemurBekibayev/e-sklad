import 'package:flutter/material.dart';
import '../core/storage/app_preferences.dart';
import '../core/network/api_service.dart';
import '../core/network/server_discovery_service.dart';

class SettingsProvider extends ChangeNotifier {
  String _serverUrl = '';
  bool _useMockData = false;
  String _language = 'uz';
  bool _isServerOnline = false;
  bool _isDiscovering = false;
  ServerConnectionType _connectionType = ServerConnectionType.offline;
  String _serverStatusLabel = 'Tekshirilmoqda...';

  String get serverUrl => _serverUrl;
  bool get useMockData => _useMockData;
  String get language => _language;
  bool get isServerOnline => _isServerOnline;
  bool get isDiscovering => _isDiscovering;
  ServerConnectionType get connectionType => _connectionType;
  String get serverStatusLabel => _serverStatusLabel;

  Future<void> init() async {
    _serverUrl = await AppPreferences.getServerUrl();
    _useMockData = await AppPreferences.isUsingMockData();
    await autoDiscoverServer();
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
    if (_isServerOnline) {
      final isLocal = _serverUrl.contains('192.168.') || _serverUrl.contains('10.') || _serverUrl.contains('localhost') || _serverUrl.contains('127.0.0.1');
      _connectionType = isLocal ? ServerConnectionType.local : ServerConnectionType.cloud;
      _serverStatusLabel = isLocal ? 'Kafedagi Kassa (Faol)' : 'Online Bulut (Faol)';
    } else {
      _connectionType = ServerConnectionType.offline;
      _serverStatusLabel = 'Offline (Ulanib bo\'lmadi)';
    }
    notifyListeners();
    return _isServerOnline;
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

