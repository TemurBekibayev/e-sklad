import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

class DbService {
  static const String _keyPrefix = 'esklad_';

  // Products Cache
  static Future<void> saveProducts(String tenantId, List<dynamic> products) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('${_keyPrefix}products_$tenantId', jsonEncode(products));
  }

  static Future<List<dynamic>> getProducts(String tenantId) async {
    final prefs = await SharedPreferences.getInstance();
    final data = prefs.getString('${_keyPrefix}products_$tenantId');
    if (data == null) return [];
    return jsonDecode(data) as List<dynamic>;
  }

  // Debts Cache
  static Future<void> saveDebts(String tenantId, List<dynamic> debts) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('${_keyPrefix}debts_$tenantId', jsonEncode(debts));
  }

  static Future<List<dynamic>> getDebts(String tenantId) async {
    final prefs = await SharedPreferences.getInstance();
    final data = prefs.getString('${_keyPrefix}debts_$tenantId');
    if (data == null) return [];
    return jsonDecode(data) as List<dynamic>;
  }

  // Users Cache (for offline login profiles)
  static Future<void> saveUsers(String tenantId, List<dynamic> users) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('${_keyPrefix}users_$tenantId', jsonEncode(users));
  }

  static Future<List<dynamic>> getUsers(String tenantId) async {
    final prefs = await SharedPreferences.getInstance();
    final data = prefs.getString('${_keyPrefix}users_$tenantId');
    if (data == null) return [];
    return jsonDecode(data) as List<dynamic>;
  }

  // Sync Queue
  static Future<void> addToSyncQueue(String tenantId, Map<String, dynamic> action) async {
    final prefs = await SharedPreferences.getInstance();
    final queue = await getSyncQueue(tenantId);
    
    // Add unique timestamp id
    action['id'] = DateTime.now().millisecondsSinceEpoch.toString();
    action['tenantId'] = tenantId;
    
    queue.add(action);
    await prefs.setString('${_keyPrefix}sync_queue_$tenantId', jsonEncode(queue));
  }

  static Future<List<dynamic>> getSyncQueue(String tenantId) async {
    final prefs = await SharedPreferences.getInstance();
    final data = prefs.getString('${_keyPrefix}sync_queue_$tenantId');
    if (data == null) return [];
    return jsonDecode(data) as List<dynamic>;
  }

  static Future<void> saveSyncQueue(String tenantId, List<dynamic> queue) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('${_keyPrefix}sync_queue_$tenantId', jsonEncode(queue));
  }

  static Future<void> clearSyncQueue(String tenantId) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('${_keyPrefix}sync_queue_$tenantId');
  }

  // Local Worker Baskets (Workarounds for multiple parallel client checkout lanes)
  static Future<void> saveLocalBaskets(String tenantId, String workerId, List<dynamic> baskets) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('${_keyPrefix}baskets_${tenantId}_$workerId', jsonEncode(baskets));
  }

  static Future<List<dynamic>> getLocalBaskets(String tenantId, String workerId) async {
    final prefs = await SharedPreferences.getInstance();
    final data = prefs.getString('${_keyPrefix}baskets_${tenantId}_$workerId');
    if (data == null) return [];
    return jsonDecode(data) as List<dynamic>;
  }

  // Server URL settings persistence
  static Future<void> saveServerUrl(String url) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('${_keyPrefix}server_url', url);
  }

  static Future<String?> getServerUrl() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('${_keyPrefix}server_url');
  }

  // Active Tenant Settings
  static Future<void> saveActiveTenant(String id, String name) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('${_keyPrefix}active_tenant_id', id);
    await prefs.setString('${_keyPrefix}active_tenant_name', name);
  }

  static Future<Map<String, String?>> getActiveTenant() async {
    final prefs = await SharedPreferences.getInstance();
    return {
      'id': prefs.getString('${_keyPrefix}active_tenant_id'),
      'name': prefs.getString('${_keyPrefix}active_tenant_name'),
    };
  }

  // Remove Tenant Config
  static Future<void> clearTenantConfig() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('${_keyPrefix}active_tenant_id');
    await prefs.remove('${_keyPrefix}active_tenant_name');
  }
}
