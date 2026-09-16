import 'package:flutter/foundation.dart' hide Category;
import 'package:dio/dio.dart';
import '../storage/app_preferences.dart';
import 'server_discovery_service.dart';
import '../../models/waiter.dart';
import '../../models/hall_table.dart';
import '../../models/category.dart';
import '../../models/product.dart';
import '../../models/order.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();

  Dio? _dio;
  final Map<String, String> _tableNumberToCloudUuid = {};

  final ValueNotifier<ServerConnectionType> connectionStatusNotifier =
      ValueNotifier<ServerConnectionType>(ServerConnectionType.cloud);

  Future<Dio> _getDio() async {
    if (_dio != null) return _dio!;

    _dio = Dio(
      BaseOptions(
        baseUrl: 'https://getpos.uz/api/v1/cafe/',
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
          if (token != null && token.isNotEmpty && !token.startsWith('offline_') && !token.startsWith('mock_')) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (DioException error, handler) {
          if (error.type == DioExceptionType.connectionTimeout ||
              error.type == DioExceptionType.receiveTimeout ||
              error.type == DioExceptionType.connectionError) {
            connectionStatusNotifier.value = ServerConnectionType.offline;
          }
          return handler.next(error);
        },
      ),
    );

    return _dio!;
  }

  void resetDio() {
    _dio = null;
  }

  // 1. Tizimga kirish (Login & Password) - Pure Online getpos.uz
  Future<Map<String, dynamic>> loginWithCredentials({
    required String login,
    required String password,
  }) async {
    try {
      final dio = await _getDio();

      Response<dynamic>? res;
      try {
        res = await dio.post(
          'https://getpos.uz/api/v1/auth/login/',
          data: {
            'login': login.trim(),
            'password': password.trim(),
          },
        );
      } catch (_) {
        res = await dio.post(
          'https://getpos.uz/api/auth/login/',
          data: {
            'login': login.trim(),
            'password': password.trim(),
          },
        );
      }

      if ((res.statusCode == 200 || res.statusCode == 201) && res.data != null) {
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
        final msg = e.response!.data['message'] ?? e.response!.data['detail'] ?? e.response!.data['error'];
        if (msg != null) {
          return {'success': false, 'message': msg.toString()};
        }
      }
      return {'success': false, 'message': 'Internet aloqasi mavjud emas yoki server javob bermadi.'};
    } catch (e) {
      return {'success': false, 'message': 'Tizimga ulanishda xatolik: ${e.toString()}'};
    }

    return {'success': false, 'message': 'Noto\'g\'ri login yoki parol!'};
  }

  // 2. Zallar / Xonalar Ro'yxati (GET https://getpos.uz/api/v1/cafe/halls/)
  Future<List<Hall>> getHalls() async {
    try {
      final dio = await _getDio();
      final res = await dio.get('halls/');

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
    } catch (e) {
      debugPrint('[ApiService] getHalls error: $e');
    }

    return [
      Hall(id: 'Barchasi', name: 'Barchasi', orderIndex: 0),
    ];
  }

  // 3. Stollar ro'yxati (GET https://getpos.uz/api/v1/cafe/tables/)
  Future<List<RestaurantTable>> getTables({String? hallName}) async {
    try {
      final dio = await _getDio();
      final res = await dio.get('tables/');

      if (res.statusCode == 200 && res.data != null) {
        final List list = (res.data is Map && res.data['results'] != null)
            ? res.data['results']
            : (res.data['tables'] ?? (res.data is List ? res.data : []));
        if (list.isNotEmpty) {
          for (final raw in list) {
            if (raw is Map) {
              final rawId = raw['id']?.toString();
              final rawNum = raw['number']?.toString();
              final rawName = raw['name']?.toString();
              if (rawId != null && rawId.contains('-')) {
                if (rawNum != null && rawNum.isNotEmpty) _tableNumberToCloudUuid[rawNum] = rawId;
                if (rawName != null && rawName.isNotEmpty) {
                  final digits = rawName.replaceAll(RegExp(r'\D'), '');
                  if (digits.isNotEmpty) _tableNumberToCloudUuid[digits] = rawId;
                }
              }
            }
          }
          final tables = list.map((e) => RestaurantTable.fromJson(e as Map<String, dynamic>)).toList();
          if (hallName != null && hallName != 'Barchasi') {
            return tables.where((t) => t.hallName == hallName || t.hallId == hallName).toList();
          }
          return tables;
        }
      }
    } catch (e) {
      debugPrint('[ApiService] getTables error: $e');
    }

    return [];
  }

  // 4. Stol bo'yicha faol buyurtmani ko'rish
  Future<RestaurantOrder?> getTableOrder(String tableId) async {
    try {
      final dio = await _getDio();
      final res = await dio.get('tables/$tableId/');

      if (res.statusCode == 200 && res.data != null) {
        final orderData = res.data['active_order'] ?? res.data['order'] ?? res.data;
        if (orderData != null && orderData is Map<String, dynamic>) {
          return RestaurantOrder.fromJson(orderData);
        }
      }
    } catch (e) {
      debugPrint('[ApiService] getTableOrder error: $e');
    }
    return null;
  }

  // 5. Taomlar Menyusi va Kategoriyalar (GET https://getpos.uz/api/v1/products/)
  Future<Map<String, dynamic>> getMenu() async {
    try {
      final dio = await _getDio();
      final res = await dio.get('https://getpos.uz/api/v1/products/?page_size=100');

      if (res.statusCode == 200 && res.data != null) {
        final List prodList = (res.data is Map && res.data['results'] != null)
            ? res.data['results']
            : (res.data['products'] ?? (res.data is List ? res.data : []));

        if (prodList.isNotEmpty) {
          final products = prodList.map((p) => Product.fromJson(p as Map<String, dynamic>)).toList();
          
          final Map<String, Category> categoriesMap = {
            'c1': Category(id: 'c1', name: 'Barchasi', iconName: 'all_inclusive'),
          };

          for (final p in products) {
            final catName = p.categoryId.isNotEmpty ? p.categoryId : 'Taomlar';
            if (!categoriesMap.containsKey(catName)) {
              categoriesMap[catName] = Category(
                id: catName,
                name: catName,
                iconName: 'restaurant',
              );
            }
          }

          return {
            'categories': categoriesMap.values.toList(),
            'products': products,
          };
        }
      }
    } catch (e) {
      debugPrint('[ApiService] getMenu online error: $e');
    }

    return {
      'categories': <Category>[Category(id: 'c1', name: 'Barchasi', iconName: 'all_inclusive')],
      'products': <Product>[],
    };
  }

  // 6. Stolga Buyurtma Qo'shish (POST https://getpos.uz/api/v1/cafe/orders/)
  Future<bool> sendOrderToKitchen({required RestaurantOrder order}) async {
    final tableNumDigits = order.tableName.replaceAll(RegExp(r'\D'), '');
    var cloudTableId = _tableNumberToCloudUuid[tableNumDigits] ??
        _tableNumberToCloudUuid[order.tableId] ??
        (order.tableId.contains('-') ? order.tableId : null);

    final dio = await _getDio();

    if (cloudTableId == null) {
      try {
        final tRes = await dio.get('tables/');
        if (tRes.statusCode == 200 && tRes.data != null) {
          final List list = (tRes.data is Map && tRes.data['results'] != null)
              ? tRes.data['results']
              : (tRes.data['tables'] ?? (tRes.data is List ? tRes.data : []));
          for (final raw in list) {
            if (raw is Map) {
              final rawId = raw['id']?.toString();
              final rawNum = raw['number']?.toString();
              final rawName = raw['name']?.toString();
              if (rawId != null && rawId.contains('-')) {
                if (rawNum != null && rawNum.isNotEmpty) _tableNumberToCloudUuid[rawNum] = rawId;
                if (rawName != null && rawName.isNotEmpty) {
                  final digits = rawName.replaceAll(RegExp(r'\D'), '');
                  if (digits.isNotEmpty) _tableNumberToCloudUuid[digits] = rawId;
                }
              }
            }
          }
          cloudTableId = _tableNumberToCloudUuid[tableNumDigits] ??
              _tableNumberToCloudUuid[order.tableId] ??
              (order.tableId.contains('-') ? order.tableId : null);
        }
      } catch (_) {}
    }

    final cloudPayload = {
      'table': cloudTableId ?? order.tableId,
      'guests_count': order.guestCount,
      'notes': '',
      'items': order.items.map((i) {
        final numericId = int.tryParse(i.productId.replaceAll(RegExp(r'\D'), ''));
        return {
          if (numericId != null && numericId > 0) 'product_id': numericId,
          'product_name': i.productName,
          'quantity': i.quantity,
          'price': i.itemPrice,
          'comment': i.comment ?? '',
        };
      }).toList(),
    };

    try {
      final res = await dio.post('orders/', data: cloudPayload);
      return res.statusCode == 200 || res.statusCode == 201;
    } on DioException catch (e) {
      debugPrint('[ApiService] sendOrderToKitchen error: ${e.response?.data ?? e.message}');
      return false;
    } catch (e) {
      debugPrint('[ApiService] sendOrderToKitchen unknown error: $e');
      return false;
    }
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

    try {
      final dio = await _getDio();
      final res = await dio.post('orders/$orderId/cancel-item/', data: payload);
      return res.statusCode == 200 || res.statusCode == 201;
    } catch (e) {
      debugPrint('[ApiService] cancelOrderItem error: $e');
      return false;
    }
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

    try {
      final dio = await _getDio();
      final res = await dio.put('orders/$orderId/items/$itemId/', data: payload);
      return res.statusCode == 200 || res.statusCode == 201;
    } catch (e) {
      debugPrint('[ApiService] updateOrderItem error: $e');
      return false;
    }
  }

  // 9. Pre-chek / Hisob so'rash (POST https://getpos.uz/api/v1/cafe/orders/{orderId}/bill-request/)
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

    try {
      final dio = await _getDio();
      final res = await dio.post('orders/$orderId/bill-request/', data: body);
      return res.statusCode != null && res.statusCode! >= 200 && res.statusCode! < 300;
    } catch (e) {
      debugPrint('[ApiService] Cloud bill-request error: $e');
      return false;
    }
  }

  // 10. Server holatini tekshirish
  Future<bool> checkHealth() async {
    try {
      final dio = await _getDio();
      final res = await dio.get('tables/');
      if (res.statusCode != null && res.statusCode! >= 200 && res.statusCode! < 500) {
        connectionStatusNotifier.value = ServerConnectionType.cloud;
        return true;
      }
    } catch (_) {}

    connectionStatusNotifier.value = ServerConnectionType.offline;
    return false;
  }
}
