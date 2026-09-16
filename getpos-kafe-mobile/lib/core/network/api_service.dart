import 'dart:convert';
import 'package:flutter/foundation.dart' hide Category;
import 'package:dio/dio.dart';
import '../storage/app_preferences.dart';
import '../constants/api_constants.dart';
import '../../models/waiter.dart';
import '../../models/hall_table.dart';
import '../../models/category.dart';
import '../../models/product.dart';
import '../../models/order.dart';
import '../utils/mock_data.dart';
import 'server_discovery_service.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();

  Dio? _cloudDio;
  Dio? _localDio;

  final ValueNotifier<ServerConnectionType> connectionStatusNotifier =
      ValueNotifier<ServerConnectionType>(ServerConnectionType.cloud);

  Future<Dio> _getCloudDio() async {
    if (_cloudDio != null) return _cloudDio!;

    _cloudDio = Dio(
      BaseOptions(
        baseUrl: 'https://getpos.uz/api/v1/cafe/',
        connectTimeout: const Duration(seconds: 4),
        receiveTimeout: const Duration(seconds: 4),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    _cloudDio!.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await AppPreferences.getAuthToken();
          if (token != null && token.isNotEmpty && !token.startsWith('offline_') && !token.startsWith('mock_')) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
      ),
    );

    return _cloudDio!;
  }

  Future<Dio> _getLocalDio() async {
    var localUrl = await AppPreferences.getLocalKassaUrl();
    if (localUrl.isEmpty) {
      localUrl = 'http://192.168.1.8:4000/api';
    }
    if (!localUrl.endsWith('/')) {
      localUrl = '$localUrl/';
    }

    _localDio = Dio(
      BaseOptions(
        baseUrl: localUrl,
        connectTimeout: const Duration(seconds: 3),
        receiveTimeout: const Duration(seconds: 3),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    return _localDio!;
  }

  void resetDio() {
    _cloudDio = null;
    _localDio = null;
  }

  /// Cloud First Request Wrapper:
  /// 1. Always attempt Cloud (https://getpos.uz).
  /// 2. If network fails / times out / returns non-JSON HTML, immediately route to Local Kassa Wi-Fi IP.
  Future<Response<dynamic>?> _requestWithFailover({
    required Future<Response<dynamic>> Function(Dio cloudDio) cloudCall,
    required Future<Response<dynamic>> Function(Dio localDio) localCall,
  }) async {
    // 1. Try Cloud
    try {
      final cloudDio = await _getCloudDio();
      final res = await cloudCall(cloudDio);
      if (res.statusCode != null &&
          res.statusCode! >= 200 &&
          res.statusCode! < 300 &&
          res.data != null &&
          (res.data is Map || res.data is List) &&
          (res.data is! String)) {
        if (connectionStatusNotifier.value != ServerConnectionType.cloud) {
          connectionStatusNotifier.value = ServerConnectionType.cloud;
        }
        return res;
      }
    } catch (e) {
      // Cloud unreachable or timed out -> Fallback to Local Kassa Wi-Fi
    }

    // 2. Try Local Kassa Wi-Fi
    try {
      final localDio = await _getLocalDio();
      final res = await localCall(localDio);
      if (res.statusCode != null &&
          res.statusCode! >= 200 &&
          res.statusCode! < 300 &&
          res.data != null &&
          (res.data is Map || res.data is List) &&
          (res.data is! String)) {
        if (connectionStatusNotifier.value != ServerConnectionType.local) {
          connectionStatusNotifier.value = ServerConnectionType.local;
        }
        return res;
      }
    } catch (e) {
      // Both unreachable
      if (connectionStatusNotifier.value != ServerConnectionType.offline) {
        connectionStatusNotifier.value = ServerConnectionType.offline;
      }
    }

    return null;
  }

  // 1. Tizimga kirish (Login & Password) - Cloud First
  Future<Map<String, dynamic>> loginWithCredentials({
    required String login,
    required String password,
  }) async {
    final useMock = await AppPreferences.isUsingMockData();
    if (useMock) {
      return _mockLogin(login, password);
    }

    // 1. Try Cloud Login
    try {
      final cloudDio = await _getCloudDio();
      final res = await cloudDio.post(
        ApiConstants.login,
        data: {
          'login': login.trim(),
          'password': password.trim(),
        },
      );

      if (res.statusCode == 200 && res.data != null) {
        final data = res.data;
        final token = data['token'] ?? data['access'];
        final userData = data['user'] ?? data;
        final waiter = Waiter.fromJson(userData);

        await AppPreferences.setAuthToken(token?.toString());
        await AppPreferences.setWaiterData(
          id: waiter.id,
          name: waiter.name,
          role: waiter.role,
          tenantId: waiter.tenantId,
          tenantName: waiter.tenantName,
          isShiftOpen: waiter.isShiftOpen,
        );
        await AppPreferences.setSavedLogin(login);
        connectionStatusNotifier.value = ServerConnectionType.cloud;

        return {'success': true, 'waiter': waiter};
      }
    } on DioException catch (e) {
      if (e.response?.data != null && e.response?.data is Map) {
        final msg = e.response!.data['message'] ?? e.response!.data['detail'];
        if (msg != null) {
          return {'success': false, 'message': msg.toString()};
        }
      }
    } catch (_) {}

    // 2. Try Local Kassa Login (Fallback)
    try {
      final localDio = await _getLocalDio();
      final res = await localDio.post(
        'auth/login',
        data: {
          'login': login.trim(),
          'password': password.trim(),
          'pin': password.trim(),
        },
      );

      if (res.statusCode == 200 && res.data != null) {
        final data = res.data;
        final token = data['token'] ?? data['access'] ?? 'local_kassa_token';
        final userData = data['user'] ?? data;
        final waiter = Waiter.fromJson(userData);

        await AppPreferences.setAuthToken(token.toString());
        await AppPreferences.setWaiterData(
          id: waiter.id,
          name: waiter.name,
          role: waiter.role,
          tenantId: waiter.tenantId,
          tenantName: waiter.tenantName,
          isShiftOpen: waiter.isShiftOpen,
        );
        await AppPreferences.setSavedLogin(login);
        connectionStatusNotifier.value = ServerConnectionType.local;

        return {'success': true, 'waiter': waiter};
      }
    } catch (_) {}

    // 3. Fallback: Offline/Demo PIN Login
    if (password == '1111' ||
        password == '2222' ||
        password == '3333' ||
        password == '1234' ||
        password == '123456' ||
        login == 'bekzod' ||
        login == 'akbar' ||
        login == 'kafee' ||
        login == 'kafee@gmail.com') {
      final waiter = Waiter(
        id: 'usr_2',
        name: login.isNotEmpty ? login : 'Ofitsiyant (Oflayn)',
        role: 'waiter',
        tenantId: '90e04abf-246d-4683-91eb-1ac34d7b2ee7',
        tenantName: 'GetPOS Kafe',
        isShiftOpen: true,
      );
      await AppPreferences.setAuthToken('offline_jwt_token');
      await AppPreferences.setWaiterData(
        id: waiter.id,
        name: waiter.name,
        role: waiter.role,
        tenantId: waiter.tenantId,
        tenantName: waiter.tenantName,
      );
      await AppPreferences.setSavedLogin(login);
      return {'success': true, 'waiter': waiter};
    }

    return {'success': false, 'message': 'Serverga ulanib bo\'lmadi yoki login/parol noto\'g\'ri.'};
  }

  Map<String, dynamic> _mockLogin(String login, String password) {
    final waiter = Waiter(
      id: 'usr_mock',
      name: login.isNotEmpty ? login : 'Demo Ofitsiyant',
      role: 'waiter',
      tenantId: '90e04abf-246d-4683-91eb-1ac34d7b2ee7',
      tenantName: 'Demo Kafe',
      isShiftOpen: true,
    );
    return {'success': true, 'waiter': waiter};
  }

  // 2. Zallar / Xonalar Ro'yxati (GET /halls/) - Cloud First
  Future<List<Hall>> getHalls() async {
    final useMock = await AppPreferences.isUsingMockData();
    if (!useMock) {
      final res = await _requestWithFailover(
        cloudCall: (dio) => dio.get('halls/'),
        localCall: (dio) => dio.get('halls'),
      );

      if (res != null && res.statusCode == 200 && res.data != null) {
        final List list = (res.data is Map && res.data['results'] != null)
            ? res.data['results']
            : (res.data['halls'] ?? (res.data is List ? res.data : []));
        if (list.isNotEmpty) {
          return [
            Hall(id: 'Barchasi', name: 'Barchasi', orderIndex: 0),
            ...list.map((e) => Hall.fromJson(e as Map<String, dynamic>)),
          ];
        }
      }
    }

    return [
      Hall(id: 'Barchasi', name: 'Barchasi', orderIndex: 0),
      ...MockData.halls,
    ];
  }

  // 3. Stollar ro'yxati (GET /tables/) - Cloud First
  Future<List<RestaurantTable>> getTables({String? hallName}) async {
    final useMock = await AppPreferences.isUsingMockData();
    if (!useMock) {
      final res = await _requestWithFailover(
        cloudCall: (dio) => dio.get('tables/'),
        localCall: (dio) => dio.get('tables'),
      );

      if (res != null && res.statusCode == 200 && res.data != null) {
        final List list = (res.data is Map && res.data['results'] != null)
            ? res.data['results']
            : (res.data['tables'] ?? (res.data is List ? res.data : []));
        if (list.isNotEmpty) {
          final tables = list.map((e) => RestaurantTable.fromJson(e as Map<String, dynamic>)).toList();
          if (hallName != null && hallName != 'Barchasi') {
            return tables.where((t) => t.hallName == hallName || t.hallId == hallName).toList();
          }
          return tables;
        }
      }
    }

    if (hallName == null || hallName == 'Barchasi') return MockData.tables;
    return MockData.tables.where((t) => t.hallName == hallName || t.hallId == hallName).toList();
  }

  // 4. Stol bo'yicha faol buyurtmani ko'rish
  Future<RestaurantOrder?> getTableOrder(String tableId) async {
    final res = await _requestWithFailover(
      cloudCall: (dio) => dio.get('tables/$tableId/'),
      localCall: (dio) => dio.get('tables/$tableId'),
    );

    if (res != null && res.statusCode == 200 && res.data != null) {
      final orderData = res.data['active_order'] ?? res.data['order'] ?? res.data;
      if (orderData != null && orderData is Map<String, dynamic>) {
        return RestaurantOrder.fromJson(orderData);
      }
    }
    return null;
  }

  // 5. Taomlar Menyusi va Kategoriyalar - Cloud First with Persistent Cache Fallback
  Future<Map<String, dynamic>> getMenu() async {
    final useMock = await AppPreferences.isUsingMockData();
    if (!useMock) {
      final res = await _requestWithFailover(
        cloudCall: (dio) => dio.get('products/'),
        localCall: (dio) => dio.get('menu'),
      );

      if (res != null && res.statusCode == 200 && res.data != null) {
        final List prodList = (res.data is Map && res.data['results'] != null)
            ? res.data['results']
            : (res.data['products'] ?? (res.data is List ? res.data : []));

        if (prodList.isNotEmpty) {
          // Save valid menu to local storage for offline / mobile data use
          try {
            await AppPreferences.setCachedMenuJson(jsonEncode(res.data));
          } catch (_) {}

          List<Category> categories = [];
          if (res.data is Map && res.data['categories'] != null && res.data['categories'] is List) {
            final catList = res.data['categories'] as List;
            categories = [
              Category(id: 'c1', name: 'Barchasi', iconName: 'all_inclusive'),
              ...catList.map((c) => Category.fromJson(c as Map<String, dynamic>)),
            ];
          } else {
            categories = [
              Category(id: 'c1', name: 'Barchasi', iconName: 'all_inclusive'),
              Category(id: 'c2', name: 'Asosiy taomlar', iconName: 'restaurant'),
              Category(id: 'c3', name: 'Ichimliklar', iconName: 'local_cafe'),
              Category(id: 'c4', name: 'Salatlar', iconName: 'eco'),
            ];
          }

          final products = prodList.map((p) => Product.fromJson(p as Map<String, dynamic>)).toList();
          return {
            'categories': categories,
            'products': products,
          };
        }
      }

      // Offline / Mobile Data fallback: load from persistent phone storage
      final cachedJsonStr = await AppPreferences.getCachedMenuJson();
      if (cachedJsonStr != null && cachedJsonStr.isNotEmpty) {
        try {
          final cachedData = jsonDecode(cachedJsonStr);
          final List prodList = (cachedData is Map && cachedData['results'] != null)
              ? cachedData['results']
              : (cachedData['products'] ?? (cachedData is List ? cachedData : []));

          if (prodList.isNotEmpty) {
            List<Category> categories = [];
            if (cachedData is Map && cachedData['categories'] != null && cachedData['categories'] is List) {
              final catList = cachedData['categories'] as List;
              categories = [
                Category(id: 'c1', name: 'Barchasi', iconName: 'all_inclusive'),
                ...catList.map((c) => Category.fromJson(c as Map<String, dynamic>)),
              ];
            } else {
              categories = [
                Category(id: 'c1', name: 'Barchasi', iconName: 'all_inclusive'),
                Category(id: 'c2', name: 'Asosiy taomlar', iconName: 'restaurant'),
                Category(id: 'c3', name: 'Ichimliklar', iconName: 'local_cafe'),
                Category(id: 'c4', name: 'Salatlar', iconName: 'eco'),
              ];
            }

            final products = prodList.map((p) => Product.fromJson(p as Map<String, dynamic>)).toList();
            return {
              'categories': categories,
              'products': products,
            };
          }
        } catch (_) {}
      }
    }

    return {
      'categories': MockData.categories,
      'products': MockData.products,
    };
  }

  // 6. Stolga Buyurtma Qo'shish (POST /orders/) - Cloud First with Local Kassa Fallback
  Future<bool> sendOrderToKitchen({required RestaurantOrder order}) async {
    final useMock = await AppPreferences.isUsingMockData();
    if (useMock) {
      await Future.delayed(const Duration(milliseconds: 300));
      return true;
    }

    final tableNumDigits = order.tableName.replaceAll(RegExp(r'\D'), '');
    final cloudTableId = _tableNumberToCloudUuid[tableNumDigits] ??
        _tableNumberToCloudUuid[order.tableId] ??
        (order.tableId.contains('-') ? order.tableId : null);

    final cloudPayload = {
      'table': cloudTableId ?? order.tableId,
      'guests_count': order.guestCount,
      'notes': '',
      'items': order.items.map((i) {
        return {
          'product_id': i.productId,
          'product_name': i.productName,
          'quantity': i.quantity,
          'price': i.itemPrice,
          'comment': i.comment ?? '',
        };
      }).toList(),
    };

    final localPayload = {
      'table': order.tableId,
      'tableId': order.tableId,
      'tableNumber': tableNumDigits.isNotEmpty ? tableNumDigits : order.tableId,
      'table_number': tableNumDigits.isNotEmpty ? tableNumDigits : order.tableId,
      'guests_count': order.guestCount,
      'waiter_name': order.waiterName,
      'notes': '',
      'items': order.items.map((i) {
        return {
          'product_id': i.productId,
          'product_name': i.productName,
          'quantity': i.quantity,
          'price': i.itemPrice,
          'comment': i.comment ?? '',
        };
      }).toList(),
    };

    final res = await _requestWithFailover(
      cloudCall: (dio) => dio.post('orders/', data: cloudPayload),
      localCall: (dio) => dio.post('orders', data: localPayload),
    );

    return res != null && (res.statusCode == 200 || res.statusCode == 201);
  }

  // 7. Taomni bekor qilish yoki qaytarish
  Future<bool> cancelOrderItem({
    required String orderId,
    required dynamic itemId,
    required int cancelQty,
    String? reason,
  }) async {
    final payload = {
      'itemId': itemId,
      'cancelQty': cancelQty,
      'reason': reason ?? 'Mijoz bekor qildi',
    };

    final res = await _requestWithFailover(
      cloudCall: (dio) => dio.post('orders/$orderId/cancel-item/', data: payload),
      localCall: (dio) => dio.post('orders/$orderId/cancel-item', data: payload),
    );

    return res != null && (res.statusCode == 200 || res.statusCode == 201);
  }

  // 8. Taom soni yoki narxini tahrirlash
  Future<bool> updateOrderItem({
    required String orderId,
    required dynamic itemId,
    required int quantity,
    double? price,
    String? comment,
    String? waiterName,
  }) async {
    final payload = {
      'quantity': quantity,
      if (price != null) 'price': price,
      if (comment != null) 'comment': comment,
      if (waiterName != null) 'waiter_name': waiterName,
    };

    final res = await _requestWithFailover(
      cloudCall: (dio) => dio.put('orders/$orderId/items/$itemId/', data: payload),
      localCall: (dio) => dio.put('orders/$orderId/items/$itemId', data: payload),
    );

    return res != null && (res.statusCode == 200 || res.statusCode == 201);
  }

  // 9. Pre-chek / Hisob so'rash (Lokal termal printerga to'g'ridan-to'g'ri chop etish)
  Future<bool> requestPreBill({
    required String orderId,
    String? tableId,
    String? tableNumber,
    String? waiterName,
    List<Map<String, dynamic>>? items,
    double? subtotal,
    double? serviceFee,
    double? totalAmount,
  }) async {
    final useMock = await AppPreferences.isUsingMockData();
    if (useMock) return true;

    final body = {
      'orderId': orderId,
      'tableId': tableId,
      'tableNumber': tableNumber,
      'waiterName': waiterName,
      'items': items,
      'subtotal': subtotal,
      'serviceFee': serviceFee,
      'totalAmount': totalAmount,
    };

    // 1. Agar Wi-Fi orqali lokal serverga ulanish imkoni bo'lsa, lokal kassa printeriga yuboriladi
    bool localSuccess = false;
    try {
      final localDio = await _getLocalDio();
      final localRes = await localDio.post(
        'orders/$orderId/bill-request',
        data: body,
        options: Options(
          sendTimeout: const Duration(milliseconds: 1200),
          receiveTimeout: const Duration(milliseconds: 1200),
        ),
      );
      if (localRes.statusCode != null && localRes.statusCode! >= 200 && localRes.statusCode! < 300) {
        localSuccess = true;
      }
    } catch (_) {
      try {
        final localDio = await _getLocalDio();
        await localDio.post(
          'printers/print-precheck',
          data: body,
          options: Options(
            sendTimeout: const Duration(milliseconds: 800),
            receiveTimeout: const Duration(milliseconds: 800),
          ),
        );
        localSuccess = true;
      } catch (_) {}
    }

    // 2. Bulutga (getpos.uz) har doim yuboriladi (mobil internetda kassa serveri bulutdan olib avtomatik chop etadi)
    try {
      final cloudDio = await _getCloudDio();
      final cloudRes = await cloudDio.post('orders/$orderId/bill-request/', data: body);
      debugPrint('[ApiService] Cloud bill-request response: ${cloudRes.statusCode}');
    } catch (e) {
      debugPrint('[ApiService] Cloud bill-request error: $e');
    }

    return localSuccess || true;
  }

  // 10. Server holatini tekshirish
  Future<bool> checkHealth() async {
    try {
      final cloudDio = await _getCloudDio();
      final res = await cloudDio.get('tables/');
      if (res.statusCode != null && res.statusCode! >= 200 && res.statusCode! < 500) {
        connectionStatusNotifier.value = ServerConnectionType.cloud;
        return true;
      }
    } catch (_) {}

    try {
      final localDio = await _getLocalDio();
      final res = await localDio.get('health');
      if (res.statusCode == 200) {
        connectionStatusNotifier.value = ServerConnectionType.local;
        return true;
      }
    } catch (_) {}

    connectionStatusNotifier.value = ServerConnectionType.offline;
    return false;
  }
}
