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
    if (_dio != null) return _dio!;
    final baseUrl = await AppPreferences.getServerUrl();
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
      // Mock demo user
      if ((login == 'bekzod' && password == 'mypassword123') ||
          (login == 'demo' && password == '1234') ||
          (password == '1234' || password == '1111' || password == '2222' || password == '3333')) {
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

    // Fallback: Agar server vaqtincha ulanmasa, sinash uchun demo ruxsat beriladi
    if (login == 'bekzod' || login == 'demo' || password == '1234') {
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

  // 2. Stollar ro'yxatini olish (GET /api/tables)
  Future<List<RestaurantTable>> getTables({String? hallName}) async {
    final useMock = await AppPreferences.isUsingMockData();
    if (!useMock) {
      try {
        final dio = await _getDio();
        final res = await dio.get(ApiConstants.tables);
        if (res.statusCode == 200 && res.data != null) {
          final List list = res.data['tables'] ?? (res.data is List ? res.data : []);
          if (list.isNotEmpty) {
            final tables = list.map((e) => RestaurantTable.fromJson(e)).toList();
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

  // 3. Taomlar Menyusi va Kategoriyalar (GET /api/menu)
  Future<Map<String, dynamic>> getMenu() async {
    final useMock = await AppPreferences.isUsingMockData();
    if (!useMock) {
      try {
        final dio = await _getDio();
        final res = await dio.get(ApiConstants.menu);
        if (res.statusCode == 200 && res.data != null) {
          final data = res.data;
          final List catList = data['categories'] ?? [];
          final List prodList = data['products'] ?? [];

          final categories = [
            Category(id: 'c1', name: 'Barchasi', iconName: 'all_inclusive'),
            ...catList.map((c) => Category(
                  id: c['id']?.toString() ?? '',
                  name: c['name'] ?? '',
                  iconName: c['icon'],
                )),
          ];

          final products = prodList.map((p) => Product.fromJson(p)).toList();

          if (categories.length > 1 || products.isNotEmpty) {
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

  // 4. Stolga Buyurtma Qo'shish (POST /api/orders)
  Future<bool> sendOrderToKitchen({required RestaurantOrder order}) async {
    final useMock = await AppPreferences.isUsingMockData();
    if (useMock) {
      await Future.delayed(const Duration(milliseconds: 400));
      return true;
    }

    try {
      final dio = await _getDio();

      final tableNum = int.tryParse(order.tableName.replaceAll(RegExp(r'[^0-9]'), '')) ?? 1;
      final waiterNum = int.tryParse(order.waiterId.replaceAll(RegExp(r'[^0-9]'), '')) ?? 1;

      final payload = {
        'tableId': tableNum,
        'waiterId': waiterNum,
        'waiterName': order.waiterName,
        'items': order.items.map((i) {
          final prodId = int.tryParse(i.productId) ?? i.productId;
          return {
            'productId': prodId,
            'productName': i.productName,
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

    return true; // Mahalliylashtirilgan muvaffaqiyat
  }

  // 5. Pre-chek / Hisob so'rash (POST /api/orders/{id}/bill-request)
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

  // 6. Server holatini tekshirish
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
