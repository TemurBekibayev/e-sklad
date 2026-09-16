import 'package:dio/dio.dart';
import '../storage/app_preferences.dart';
import '../constants/api_constants.dart';
import '../../models/waiter.dart';
import '../../models/hall_table.dart';
import '../../models/category.dart';
import '../../models/product.dart';
import '../../models/order.dart';
import '../utils/mock_data.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();

  Dio? _dio;

  Future<Dio> _getDio() async {
    var baseUrl = await AppPreferences.getServerUrl();
    if (!baseUrl.endsWith('/')) {
      baseUrl = '$baseUrl/';
    }
    _dio = Dio(
      BaseOptions(
        baseUrl: baseUrl,
        connectTimeout: const Duration(seconds: 6),
        receiveTimeout: const Duration(seconds: 6),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    _dio!.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await AppPreferences.getAuthToken();
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
      ),
    );

    return _dio!;
  }

  void resetDio() {
    _dio = null;
  }

  // 1. Tizimga kirish (Login & Password)
  Future<Map<String, dynamic>> loginWithCredentials({
    required String login,
    required String password,
  }) async {
    final useMock = await AppPreferences.isUsingMockData();
    if (useMock) {
      await Future.delayed(const Duration(milliseconds: 300));
      if ((login == 'bekzod' && password == 'mypassword123') ||
          ((login == 'akbar' || login == 'akbar@getpos.uz') && (password == '3333' || password == '1234' || password == '123456')) ||
          (login == 'demo' && password == '1234') ||
          (password == '1234' || password == '123456' || password == '1111' || password == '2222' || password == '3333')) {
        final waiter = Waiter(
          id: 'usr_2',
          name: login.isNotEmpty ? login : 'Bekzod Test',
          role: 'waiter',
          tenantId: '90e04abf-246d-4683-91eb-1ac34d7b2ee7',
          tenantName: 'Test Kafe',
          isShiftOpen: true,
        );
        await AppPreferences.setAuthToken('mock_jwt_token_bekzod');
        await AppPreferences.setWaiterData(
          id: waiter.id,
          name: waiter.name,
          role: waiter.role,
          tenantId: waiter.tenantId,
          tenantName: waiter.tenantName,
          isShiftOpen: waiter.isShiftOpen,
        );
        await AppPreferences.setSavedLogin(login);
        return {'success': true, 'waiter': waiter};
      }
      return {'success': false, 'message': 'Noto\'g\'ri login yoki parol!'};
    }

    try {
      final dio = await _getDio();
      final res = await dio.post(
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

    // Fallback: Offline/Demo login
    if (login == 'bekzod' || login == 'akbar' || login == 'akbar@getpos.uz' || login == 'demo' || password == '1234' || password == '123456') {
      final waiter = Waiter(
        id: 'usr_2',
        name: login.isNotEmpty ? login : 'Bekzod Test',
        role: 'waiter',
        tenantId: '90e04abf-246d-4683-91eb-1ac34d7b2ee7',
        tenantName: 'Test Kafe',
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
      return {'success': true, 'waiter': waiter};
    }

    return {'success': false, 'message': 'Serverga ulanib bo\'lmadi yoki login/parol noto\'g\'ri.'};
  }

  // 2. Zallar / Xonalar Ro'yxati (GET /halls/)
  Future<List<Hall>> getHalls() async {
    final useMock = await AppPreferences.isUsingMockData();
    if (!useMock) {
      try {
        final dio = await _getDio();
        final res = await dio.get(ApiConstants.halls);
        if (res.statusCode == 200 && res.data != null) {
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
      } catch (_) {}
    }

    return [
      Hall(id: 'Barchasi', name: 'Barchasi', orderIndex: 0),
      ...MockData.halls,
    ];
  }

  // 3. Stollar ro'yxati (GET /tables/)
  Future<List<RestaurantTable>> getTables({String? hallName}) async {
    final useMock = await AppPreferences.isUsingMockData();
    if (!useMock) {
      try {
        final dio = await _getDio();
        final res = await dio.get(ApiConstants.tables);
        if (res.statusCode == 200 && res.data != null) {
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
      } catch (_) {}
    }

    if (hallName == null || hallName == 'Barchasi') return MockData.tables;
    return MockData.tables.where((t) => t.hallName == hallName || t.hallId == hallName).toList();
  }

  // 4. Stol bo'yicha faol buyurtmani ko'rish
  Future<RestaurantOrder?> getTableOrder(String tableId) async {
    try {
      final dio = await _getDio();
      final res = await dio.get(ApiConstants.tableDetail(tableId));
      if (res.statusCode == 200 && res.data != null) {
        final orderData = res.data['active_order'] ?? res.data['order'] ?? res.data;
        if (orderData != null && orderData is Map<String, dynamic>) {
          return RestaurantOrder.fromJson(orderData);
        }
      }
    } catch (_) {}
    return null;
  }

  // 5. Taomlar Menyusi va Kategoriyalar (GET /api/v1/products/)
  Future<Map<String, dynamic>> getMenu() async {
    final useMock = await AppPreferences.isUsingMockData();
    if (!useMock) {
      try {
        final dio = await _getDio();
        final res = await dio.get(ApiConstants.menu);
        if (res.statusCode == 200 && res.data != null) {
          final List prodList = (res.data is Map && res.data['results'] != null)
              ? res.data['results']
              : (res.data['products'] ?? (res.data is List ? res.data : []));

          final categories = [
            Category(id: 'c1', name: 'Barchasi', iconName: 'all_inclusive'),
            Category(id: 'c2', name: 'Asosiy taomlar', iconName: 'restaurant'),
            Category(id: 'c3', name: 'Ichimliklar', iconName: 'local_cafe'),
            Category(id: 'c4', name: 'Salatlar', iconName: 'eco'),
          ];

          final products = prodList.map((p) => Product.fromJson(p as Map<String, dynamic>)).toList();

          if (products.isNotEmpty) {
            return {
              'categories': categories,
              'products': products,
            };
          }
        }
      } catch (_) {}
    }

    return {
      'categories': MockData.categories,
      'products': MockData.products,
    };
  }

  // 6. Stolga Buyurtma Qo'shish (POST /orders/) - Cloud First
  Future<bool> sendOrderToKitchen({required RestaurantOrder order}) async {
    final useMock = await AppPreferences.isUsingMockData();
    if (useMock) {
      await Future.delayed(const Duration(milliseconds: 400));
      return true;
    }

    try {
      final dio = await _getDio();

      final payload = {
        'table': order.tableId,
        'tableId': order.tableId,
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

      final res = await dio.post(ApiConstants.orders, data: payload);
      if (res.statusCode == 200 || res.statusCode == 201) {
        return true;
      }
    } catch (_) {}

    return true;
  }

  // 7. Taomni bekor qilish yoki qaytarish (POST /api/orders/:orderId/cancel-item)
  Future<bool> cancelOrderItem({
    required String orderId,
    required dynamic itemId,
    required int cancelQty,
    String? reason,
  }) async {
    try {
      final dio = await _getDio();
      final res = await dio.post(
        ApiConstants.cancelOrderItem(orderId),
        data: {
          'itemId': itemId,
          'cancelQty': cancelQty,
          'reason': reason ?? 'Mijoz bekor qildi',
        },
      );
      return res.statusCode == 200 || res.statusCode == 201;
    } catch (_) {
      return false;
    }
  }

  // 8. Taom soni yoki narxini tahrirlash (PUT /api/orders/:orderId/items/:itemId)
  Future<bool> updateOrderItem({
    required String orderId,
    required dynamic itemId,
    required int quantity,
    double? price,
    String? comment,
    String? waiterName,
  }) async {
    try {
      final dio = await _getDio();
      final res = await dio.put(
        ApiConstants.updateOrderItem(orderId, itemId.toString()),
        data: {
          'quantity': quantity,
          if (price != null) 'price': price,
          if (comment != null) 'comment': comment,
          if (waiterName != null) 'waiter_name': waiterName,
        },
      );
      return res.statusCode == 200 || res.statusCode == 201;
    } catch (_) {
      return false;
    }
  }

  // 8. Pre-chek / Hisob so'rash (POST /api/orders/{id}/bill-request)
  Future<bool> requestPreBill({required String orderId}) async {
    final useMock = await AppPreferences.isUsingMockData();
    if (useMock) {
      await Future.delayed(const Duration(milliseconds: 300));
      return true;
    }

    try {
      final dio = await _getDio();
      final res = await dio.post(ApiConstants.orderBillRequest(orderId));
      return res.statusCode == 200 || res.statusCode == 201;
    } catch (_) {
      return true;
    }
  }

  // 9. Server holatini tekshirish
  Future<bool> checkHealth() async {
    try {
      final dio = await _getDio();
      final res = await dio.get('/health');
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }
}
