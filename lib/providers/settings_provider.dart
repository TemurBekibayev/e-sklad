import 'package:flutter/material.dart';
import '../core/storage/app_preferences.dart';
import '../core/network/api_service.dart';

class SettingsProvider extends ChangeNotifier {
  String _serverUrl = '';
  bool _useMockData = false;
  String _language = 'uz';
  bool _isServerOnline = false;

  String get serverUrl => _serverUrl;
  bool get useMockData => _useMockData;
  String get language => _language;
  bool get isServerOnline => _isServerOnline;

  Future<void> init() async {
    _serverUrl = await AppPreferences.getServerUrl();
    _useMockData = await AppPreferences.isUsingMockData();
    await checkHealth();
    notifyListeners();
  }

  Future<bool> checkHealth() async {
    _isServerOnline = await ApiService().checkHealth();
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
