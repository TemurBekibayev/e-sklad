import 'package:flutter/material.dart';
import '../core/storage/app_preferences.dart';
import '../core/network/api_service.dart';
import '../core/network/server_discovery_service.dart';
import '../core/localization/app_translations.dart';
import '../core/constants/app_theme.dart';

class SettingsProvider extends ChangeNotifier {
  String _serverUrl = 'https://getpos.uz/api/v1/cafe';
  String _localKassaUrl = 'http://192.168.1.8:4000/api';
  bool _useMockData = false;
  String _language = 'uz';
  bool _isHapticEnabled = true;
  bool _isKitchenNotificationEnabled = true;
  bool _isDarkMode = false;
  String _colorTheme = 'blue';
  String _menuLayout = 'grid2'; // 'grid2', 'grid3', 'list'
  bool _isServerOnline = false;
  bool _isDiscovering = false;
  ServerConnectionType _connectionType = ServerConnectionType.cloud;
  String _serverStatusLabel = 'Tekshirilmoqda...';

  String get serverUrl => _serverUrl;
  String get localKassaUrl => _localKassaUrl;
  bool get useMockData => _useMockData;
  String get language => _language;
  String get currentLanguage => _language;
  bool get isHapticEnabled => _isHapticEnabled;
  bool get isKitchenNotificationEnabled => _isKitchenNotificationEnabled;
  bool get isDarkMode => _isDarkMode;
  String get colorTheme => _colorTheme;
  ThemePalette get currentPalette => AppTheme.getPalette(_colorTheme);
  String get menuLayout => _menuLayout;
  bool get isServerOnline => _isServerOnline;
  bool get isDiscovering => _isDiscovering;
  ServerConnectionType get connectionType => _connectionType;
  String get serverStatusLabel => _serverStatusLabel;

  String tr(String key) => AppTranslations.get(key, _language);

  Future<void> init() async {
    _serverUrl = await AppPreferences.getServerUrl();
    _localKassaUrl = await AppPreferences.getLocalKassaUrl();
    _useMockData = false;
    await AppPreferences.setUseMockData(false);
    _language = await AppPreferences.getLanguage();
    _isHapticEnabled = await AppPreferences.isHapticEnabled();
    _isKitchenNotificationEnabled = await AppPreferences.isKitchenNotificationEnabled();
    _isDarkMode = await AppPreferences.isDarkMode();
    _colorTheme = await AppPreferences.getColorTheme();
    _menuLayout = await AppPreferences.getMenuLayout();
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

    if (status == ServerConnectionType.cloud || _isServerOnline) {
      _serverStatusLabel = '☁️ Bulut Serveri (getpos.uz) — Online';
    } else {
      _serverStatusLabel = '⚠️ Internet aloqasi yo\'q';
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

  Future<void> setLanguage(String lang) async {
    _language = lang;
    await AppPreferences.setLanguage(lang);
    notifyListeners();
  }

  Future<void> setHapticEnabled(bool val) async {
    _isHapticEnabled = val;
    await AppPreferences.setHapticEnabled(val);
    notifyListeners();
  }

  Future<void> setKitchenNotificationEnabled(bool val) async {
    _isKitchenNotificationEnabled = val;
    await AppPreferences.setKitchenNotificationEnabled(val);
    notifyListeners();
  }

  Future<void> setDarkMode(bool isDark) async {
    _isDarkMode = isDark;
    await AppPreferences.setDarkMode(isDark);
    notifyListeners();
  }

  Future<void> setColorTheme(String theme) async {
    _colorTheme = theme;
    await AppPreferences.setColorTheme(theme);
    notifyListeners();
  }

  Future<void> setMenuLayout(String layout) async {
    _menuLayout = layout;
    await AppPreferences.setMenuLayout(layout);
    notifyListeners();
  }
}

