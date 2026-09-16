import 'package:shared_preferences/shared_preferences.dart';
import '../constants/api_constants.dart';

class AppPreferences {
  static const String _keyServerUrl = 'pos_server_url';
  static const String _keyLocalKassaUrl = 'pos_local_kassa_url';
  static const String _keyAccessToken = 'pos_access_token';
  static const String _keySavedLogin = 'pos_saved_login';
  static const String _keyWaiterId = 'pos_waiter_id';
  static const String _keyWaiterName = 'pos_waiter_name';
  static const String _keyWaiterRole = 'pos_waiter_role';
  static const String _keyTenantId = 'pos_tenant_id';
  static const String _keyTenantName = 'pos_tenant_name';
  static const String _keyIsShiftOpen = 'pos_is_shift_open';
  static const String _keyUseMockData = 'pos_use_mock_data';

  static Future<String> getServerUrl() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_keyServerUrl) ?? ApiConstants.defaultBaseUrl;
  }

  static Future<void> setServerUrl(String url) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyServerUrl, url);
  }

  static Future<String> getLocalKassaUrl() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_keyLocalKassaUrl) ?? 'http://192.168.1.8:4000/api';
  }

  static Future<void> setLocalKassaUrl(String url) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyLocalKassaUrl, url);
  }

  static Future<String?> getSavedLogin() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_keySavedLogin);
  }

  static Future<void> setSavedLogin(String login) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keySavedLogin, login);
  }

  static Future<String?> getAuthToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_keyAccessToken);
  }

  static Future<void> setAuthToken(String? token) async {
    final prefs = await SharedPreferences.getInstance();
    if (token == null) {
      await prefs.remove(_keyAccessToken);
    } else {
      await prefs.setString(_keyAccessToken, token);
    }
  }

  static Future<void> setWaiterData({
    required String id,
    required String name,
    required String role,
    String? tenantId,
    String? tenantName,
    bool isShiftOpen = true,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyWaiterId, id);
    await prefs.setString(_keyWaiterName, name);
    await prefs.setString(_keyWaiterRole, role);
    if (tenantId != null) await prefs.setString(_keyTenantId, tenantId);
    if (tenantName != null) await prefs.setString(_keyTenantName, tenantName);
    await prefs.setBool(_keyIsShiftOpen, isShiftOpen);
  }

  static Future<String?> getWaiterName() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_keyWaiterName);
  }

  static Future<String?> getWaiterId() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_keyWaiterId);
  }

  static Future<String?> getWaiterRole() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_keyWaiterRole);
  }

  static Future<String?> getTenantId() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_keyTenantId);
  }

  static Future<String?> getTenantName() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_keyTenantName);
  }

  static Future<bool> isShiftOpen() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_keyIsShiftOpen) ?? true;
  }

  static Future<void> clearAuth() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_keyAccessToken);
    await prefs.remove(_keyWaiterId);
    await prefs.remove(_keyWaiterName);
    await prefs.remove(_keyWaiterRole);
  }

  static Future<bool> isUsingMockData() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_keyUseMockData) ?? false;
  }

  static Future<void> setUseMockData(bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keyUseMockData, value);
  }
}
