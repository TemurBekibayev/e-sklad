import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiService {
  final String baseUrl;

  ApiService(this.baseUrl);

  // Health check
  Future<bool> checkHealth() async {
    try {
      final response = await http.get(Uri.parse('$baseUrl/health')).timeout(const Duration(seconds: 3));
      return response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  // Fetch all tenants
  Future<List<dynamic>> fetchTenants() async {
    final response = await http.get(Uri.parse('$baseUrl/api/tenants'));
    if (response.statusCode == 200) {
      return jsonDecode(response.body) as List<dynamic>;
    } else {
      throw Exception(jsonDecode(response.body)['error'] ?? 'Failed to load tenants');
    }
  }

  // Fetch tenant users list
  Future<List<dynamic>> fetchUsers(String tenantId) async {
    final response = await http.get(Uri.parse('$baseUrl/api/auth/users?tenantId=$tenantId'));
    if (response.statusCode == 200) {
      return jsonDecode(response.body) as List<dynamic>;
    } else {
      throw Exception(jsonDecode(response.body)['error'] ?? 'Failed to load users');
    }
  }

  // Login
  Future<Map<String, dynamic>> login(String? userId, String passwordOrPin, {String? login}) async {
    final Map<String, dynamic> body = {
      'password': passwordOrPin,
      'pin': passwordOrPin,
    };
    if (userId != null && userId.isNotEmpty) body['userId'] = userId;
    if (login != null && login.isNotEmpty) body['login'] = login;

    final response = await http.post(
      Uri.parse('$baseUrl/api/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(body),
    );
    if (response.statusCode == 200) {
      return jsonDecode(response.body) as Map<String, dynamic>;
    } else {
      final decoded = jsonDecode(response.body);
      throw Exception(decoded['error'] ?? decoded['message'] ?? decoded['detail'] ?? 'Noto\'g\'ri login yoki parol');
    }
  }

  // Products CRUD
  Future<List<dynamic>> fetchProducts(String tenantId) async {
    final response = await http.get(Uri.parse('$baseUrl/api/products?tenantId=$tenantId'));
    if (response.statusCode == 200) {
      return jsonDecode(response.body) as List<dynamic>;
    } else {
      throw Exception(jsonDecode(response.body)['error'] ?? 'Failed to load products');
    }
  }

  Future<Map<String, dynamic>> createProduct(Map<String, dynamic> body) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/products'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(body),
    );
    if (response.statusCode == 201) {
      return jsonDecode(response.body) as Map<String, dynamic>;
    } else {
      throw Exception(jsonDecode(response.body)['error'] ?? 'Failed to create product');
    }
  }

  Future<Map<String, dynamic>> updateProduct(String id, Map<String, dynamic> body) async {
    final response = await http.patch(
      Uri.parse('$baseUrl/api/products/$id'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(body),
    );
    if (response.statusCode == 200) {
      return jsonDecode(response.body) as Map<String, dynamic>;
    } else {
      throw Exception(jsonDecode(response.body)['error'] ?? 'Failed to update product');
    }
  }

  Future<void> deleteProduct(String id) async {
    final response = await http.delete(Uri.parse('$baseUrl/api/products/$id'));
    if (response.statusCode != 200) {
      throw Exception(jsonDecode(response.body)['error'] ?? 'Failed to delete product');
    }
  }

  // Active Baskets for Manager
  Future<List<dynamic>> fetchActiveBaskets(String tenantId) async {
    final response = await http.get(Uri.parse('$baseUrl/api/baskets?tenantId=$tenantId'));
    if (response.statusCode == 200) {
      return jsonDecode(response.body) as List<dynamic>;
    } else {
      throw Exception(jsonDecode(response.body)['error'] ?? 'Failed to load active baskets');
    }
  }

  // Save/Create basket online
  Future<Map<String, dynamic>> createBasket(String tenantId, String workerId, String clientName) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/baskets'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'tenantId': tenantId, 'workerId': workerId, 'clientName': clientName}),
    );
    if (response.statusCode == 201) {
      return jsonDecode(response.body) as Map<String, dynamic>;
    } else {
      throw Exception(jsonDecode(response.body)['error'] ?? 'Failed to create basket');
    }
  }

  // Basket item online CRUD
  Future<void> addBasketItem(String basketId, String productId, double quantity, String scannedBy) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/baskets/$basketId/items'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'productId': productId, 'quantity': quantity, 'scannedBy': scannedBy}),
    );
    if (response.statusCode != 200) {
      throw Exception(jsonDecode(response.body)['error'] ?? 'Failed to add item');
    }
  }

  Future<void> removeBasketItem(String basketId, String itemId) async {
    final response = await http.delete(Uri.parse('$baseUrl/api/baskets/$basketId/items/$itemId'));
    if (response.statusCode != 200) {
      throw Exception(jsonDecode(response.body)['error'] ?? 'Failed to remove item');
    }
  }

  Future<void> cancelBasket(String basketId) async {
    final response = await http.patch(
      Uri.parse('$baseUrl/api/baskets/$basketId'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'status': 'cancelled'}),
    );
    if (response.statusCode != 200) {
      throw Exception(jsonDecode(response.body)['error'] ?? 'Failed to cancel basket');
    }
  }

  // Finalize Transaction
  Future<Map<String, dynamic>> finalizeTransaction(Map<String, dynamic> body) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/transactions'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(body),
    );
    if (response.statusCode == 201) {
      return jsonDecode(response.body) as Map<String, dynamic>;
    } else {
      throw Exception(jsonDecode(response.body)['error'] ?? 'Failed to complete transaction');
    }
  }

  // Debts
  Future<List<dynamic>> fetchDebts(String tenantId) async {
    final response = await http.get(Uri.parse('$baseUrl/api/debts?tenantId=$tenantId'));
    if (response.statusCode == 200) {
      return jsonDecode(response.body) as List<dynamic>;
    } else {
      throw Exception(jsonDecode(response.body)['error'] ?? 'Failed to load debts');
    }
  }

  Future<Map<String, dynamic>> payDebt(String clientId, double amount, String managerId) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/debts/$clientId/pay'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'amount': amount, 'managerId': managerId}),
    );
    if (response.statusCode == 200) {
      return jsonDecode(response.body) as Map<String, dynamic>;
    } else {
      throw Exception(jsonDecode(response.body)['error'] ?? 'Failed to process payment');
    }
  }

  // Stats
  Future<Map<String, dynamic>> fetchDashboardStats(String tenantId) async {
    final response = await http.get(Uri.parse('$baseUrl/api/stats/tenant-dashboard/$tenantId'));
    if (response.statusCode == 200) {
      return jsonDecode(response.body) as Map<String, dynamic>;
    } else {
      throw Exception(jsonDecode(response.body)['error'] ?? 'Failed to load dashboard stats');
    }
  }
}
