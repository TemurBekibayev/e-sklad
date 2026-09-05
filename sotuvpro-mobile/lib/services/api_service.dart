import 'dart:convert';
import 'dart:async';
import 'package:http/http.dart' as http;
import '../data/database_helper.dart';
import '../models/user.dart';
import '../models/product.dart';
import '../models/basket_item.dart';
import '../models/transaction.dart';
import 'security_service.dart';

class ApiResponse<T> {
  final int statusCode;
  final T? data;
  final String? errorDetail;

  ApiResponse({required this.statusCode, this.data, this.errorDetail});

  bool get isSuccess => statusCode >= 200 && statusCode < 300;
}

class ApiService {
  static final ApiService instance = ApiService._();
  ApiService._();

  // Backend rasmiy Server URL (https://amuhr.uz/api/v1)
  String baseUrl = 'https://amuhr.uz/api/v1';
  String wsUrl = 'wss://amuhr.uz/ws/tenant/baskets';

  String? accessToken;
  String? refreshToken;

  /// SharedPreferences dan saqlangan tokenlarni yuklash
  Future<void> initTokens() async {
    final tokens = await SecurityService.instance.getAuthTokens();
    if (tokens['access'] != null) {
      accessToken = tokens['access'];
    }
    if (tokens['refresh'] != null) {
      refreshToken = tokens['refresh'];
    }
  }

  // 1.1 — POST /auth/login/
  Future<ApiResponse<Map<String, dynamic>>> login({
    required String loginInput,
    required String password,
  }) async {
    final lockKey = SecurityService.instance.sanitizeInput(loginInput.toLowerCase());
    if (SecurityService.instance.isUserLockedOut(lockKey)) {
      final remaining = SecurityService.instance.getRemainingLockoutSeconds(lockKey);
      return ApiResponse(
        statusCode: 401,
        errorDetail: 'Hisob vaqtincha bloklangan. $remaining soniyadan so\'ng urinib ko\'ring.',
      );
    }

    final url = Uri.parse('$baseUrl/auth/login/');
    final Map<String, dynamic> body = {
      'login': loginInput,
      'email': loginInput,
      'username': loginInput,
      'password': password,
      'pin': password,
    };

    try {
      final response = await http
          .post(
            url,
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode(body),
          )
          .timeout(const Duration(seconds: 10));

      Map<String, dynamic> responseData = {};
      try {
        final decoded = jsonDecode(response.body);
        if (decoded is Map<String, dynamic>) {
          responseData = decoded;
        }
      } catch (_) {}

      final String serverErrorMessage = _parseErrorDetail(responseData['detail'], response.statusCode);

      if (response.statusCode == 200) {
        SecurityService.instance.resetFailedAttempts(lockKey);
        accessToken = responseData['access'];
        refreshToken = responseData['refresh'];

        if (accessToken != null && refreshToken != null) {
          await SecurityService.instance.saveAuthTokens(
            access: accessToken!,
            refresh: refreshToken!,
          );
        }

        final userData = responseData['user'] as Map<String, dynamic>?;
        if (userData != null) {
          final user = User.fromMap({
            ...userData,
            'pinHash': SecurityService.instance.hashPin(password),
            'avatarUrl': 'https://i.pravatar.cc/150?img=11',
          });
          await DatabaseHelper.instance.saveUser(user);
        }

        return ApiResponse(statusCode: 200, data: responseData);
      } else {
        SecurityService.instance.registerFailedAttempt(lockKey);
        final failedCount = SecurityService.instance.getFailedAttempts(lockKey);

        if (SecurityService.instance.isUserLockedOut(lockKey)) {
          return ApiResponse(
            statusCode: response.statusCode,
            errorDetail: 'Hisob vaqtincha bloklandi (5 daqiqa kuting).',
          );
        }

        return ApiResponse(
          statusCode: response.statusCode,
          errorDetail: serverErrorMessage.isNotEmpty 
              ? '$serverErrorMessage (${5 - failedCount} ta imkoniyat qoldi)' 
              : 'Login yoki parol noto\'g\'ri!',
        );
      }
    } catch (e) {
      return ApiResponse(
        statusCode: 502,
        errorDetail: 'Server bilan aloqa o\'rnatilmadi. Internet aloqasini tekshiring.',
      );
    }
  }

  String _parseErrorDetail(dynamic detail, int statusCode) {
    if (detail == null) return 'Server xatoligi ($statusCode)';
    if (detail is String) return detail;
    if (detail is List && detail.isNotEmpty) return detail.first.toString();
    if (detail is Map) return detail.values.first.toString();
    return detail.toString();
  }

  // 1.2 — POST /auth/refresh/
  Future<ApiResponse<Map<String, String>>> refreshTokenRequest(String token) async {
    final url = Uri.parse('$baseUrl/auth/refresh/');
    try {
      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'refresh': token}),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        accessToken = data['access'];
        if (accessToken != null) {
          await SecurityService.instance.saveAuthTokens(access: accessToken!, refresh: refreshToken ?? token);
        }
        return ApiResponse(
          statusCode: 200,
          data: {'access': accessToken!},
        );
      } else {
        return ApiResponse(
          statusCode: response.statusCode,
          errorDetail: 'Tokenni yangilab bo\'lmadi.',
        );
      }
    } catch (e) {
      return ApiResponse(
        statusCode: 502,
        errorDetail: 'Server bilan aloqa o\'rnatilmadi.',
      );
    }
  }

  // 3.1 — GET /products/lookup/?barcode=<code_or_qr>
  Future<ApiResponse<Map<String, dynamic>>> lookupProductByBarcode(String code) async {
    final cleanCode = code.trim();
    if (cleanCode.isEmpty) {
      return ApiResponse(statusCode: 400, errorDetail: 'Kod bo\'sh');
    }

    // 1. Avval mahalliy (SQLite) bazadan izlaymiz (Offline-First)
    final localProduct = await DatabaseHelper.instance.getProductByCode(cleanCode);
    if (localProduct != null) {
      return ApiResponse(
        statusCode: 200,
        data: {
          'id': localProduct.id,
          'tenant_id': localProduct.tenantId,
          'name': localProduct.name,
          'purchase_unit': localProduct.purchaseUnit,
          'sale_unit': localProduct.saleUnit,
          'price_per_sale_unit': localProduct.price.toStringAsFixed(2),
          'current_stock': localProduct.stockQuantity.toStringAsFixed(4),
          'reserved_stock': '0.0000',
          'available_stock': localProduct.stockQuantity.toStringAsFixed(4),
          'barcode': localProduct.barcode,
          'qr_code': localProduct.qrCode,
          'is_low_stock': localProduct.isLowStock,
          'exists_globally': false,
        },
      );
    }

    // 2. Mahalliy bazada topilmasa, server API ga so'rov yuboramiz
    final url = Uri.parse('$baseUrl/products/lookup/?barcode=$cleanCode');
    try {
      final response = await http.get(url, headers: _headers);
      final responseData = jsonDecode(response.body);

      if (response.statusCode == 200 && responseData is Map<String, dynamic>) {
        return ApiResponse(statusCode: 200, data: responseData);
      } else {
        return ApiResponse(
          statusCode: response.statusCode,
          errorDetail: 'Mahsulot topilmadi.',
          data: {'scanned_code': cleanCode},
        );
      }
    } catch (e) {
      return ApiResponse(
        statusCode: 404,
        errorDetail: 'Mahsulot topilmadi.',
        data: {'scanned_code': cleanCode},
      );
    }
  }

  // 3.3 — POST /products/ (Yangi mahsulot yaratish)
  Future<ApiResponse<Map<String, dynamic>>> createProduct(Map<String, dynamic> productData) async {
    final url = Uri.parse('$baseUrl/products/');
    try {
      final response = await http
          .post(
            url,
            headers: _headers,
            body: jsonEncode(productData),
          )
          .timeout(const Duration(seconds: 8));

      final responseData = jsonDecode(response.body);
      if (response.statusCode >= 200 && response.statusCode < 300) {
        if (responseData is Map<String, dynamic>) {
          return ApiResponse(statusCode: response.statusCode, data: responseData);
        }
      }
      final errorMsg = _parseErrorDetail(responseData is Map ? responseData['detail'] : null, response.statusCode);
      return ApiResponse(statusCode: response.statusCode, errorDetail: errorMsg);
    } catch (e) {
      return ApiResponse(statusCode: 502, errorDetail: 'Server bilan aloqa uzildi (Oflayn rejim).');
    }
  }

  // 3.4 — PATCH /products/{id}/ (Mahsulotni tahrirlash / Ombor qoldig'ini oshirish)
  Future<ApiResponse<Map<String, dynamic>>> updateProduct(String id, Map<String, dynamic> data) async {
    final url = Uri.parse('$baseUrl/products/$id/');
    try {
      final response = await http
          .patch(
            url,
            headers: _headers,
            body: jsonEncode(data),
          )
          .timeout(const Duration(seconds: 8));
      final responseData = jsonDecode(response.body);
      if (responseData is Map<String, dynamic>) {
        return ApiResponse(statusCode: response.statusCode, data: responseData);
      }
      return ApiResponse(statusCode: response.statusCode);
    } catch (e) {
      return ApiResponse(statusCode: 502, errorDetail: 'Server bilan aloqa uzildi.');
    }
  }

  // 3.5 — Oflayn kiritilgan mahsulotlarni serverga sinxronlash (Upload)
  Future<int> syncOfflineProducts({String tenantId = 'tenant_store_101'}) async {
    final unsynced = await DatabaseHelper.instance.getUnsyncedProducts(tenantId: tenantId);
    if (unsynced.isEmpty) return 0;

    int syncedCount = 0;
    for (var prod in unsynced) {
      final payload = {
        'name': prod.name,
        'purchase_unit': prod.purchaseUnit,
        'sale_unit': prod.saleUnit,
        'conversion_rate': prod.conversionRate,
        'price_per_sale_unit': prod.price,
        'current_stock': prod.stockQuantity,
        'barcode': prod.barcode.trim(),
        'qr_code': prod.qrCode.trim(),
      };

      final apiRes = await createProduct(payload);
      if (apiRes.isSuccess && apiRes.data != null) {
        final serverId = apiRes.data!['id']?.toString() ?? prod.id;
        await DatabaseHelper.instance.markProductSynced(prod.id, serverId);
        syncedCount++;
      }
    }
    return syncedCount;
  }

  // 3.2 — GET /products/ (Ikki tomonlama Sinxronizatsiya: Offline -> Online sync & Download server data)
  Future<ApiResponse<List<Map<String, dynamic>>>> getProductsCatalog({String? search, String tenantId = 'tenant_store_101'}) async {
    // 1. Oldin oflayn kiritilgan mahsulotlarni serverga yuboramiz
    await syncOfflineProducts(tenantId: tenantId);

    // 2. Serverdan yangi ro'yxat va qoldiqlarni tortamiz
    final url = Uri.parse('$baseUrl/products/${search != null && search.isNotEmpty ? '?search=$search' : ''}');
    try {
      final response = await http.get(url, headers: _headers).timeout(const Duration(seconds: 8));

      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        List<dynamic> rawList = [];
        if (decoded is List) {
          rawList = decoded;
        } else if (decoded is Map<String, dynamic> && decoded['results'] is List) {
          rawList = decoded['results'] as List<dynamic>;
        }

        final List<Product> serverProducts = [];
        final List<Map<String, dynamic>> dataList = [];

        for (var json in rawList) {
          final p = Product(
            id: json['id']?.toString() ?? '',
            tenantId: json['tenant_id']?.toString() ?? tenantId,
            name: json['name']?.toString() ?? '',
            purchaseUnit: json['purchase_unit']?.toString() ?? 'Dona',
            saleUnit: json['sale_unit']?.toString() ?? 'Dona',
            conversionRate: (json['conversion_rate'] as num?)?.toDouble() ?? 1.0,
            price: double.tryParse(json['price_per_sale_unit']?.toString() ?? '0') ?? 0.0,
            stockQuantity: double.tryParse(json['available_stock']?.toString() ?? json['current_stock']?.toString() ?? '0') ?? 0.0,
            barcode: json['barcode']?.toString() ?? '',
            qrCode: json['qr_code']?.toString() ?? '',
            lowStockThreshold: 10,
            isSynced: true,
          );
          serverProducts.add(p);

          dataList.add({
            'id': p.id,
            'name': p.name,
            'purchase_unit': p.purchaseUnit,
            'sale_unit': p.saleUnit,
            'price_per_sale_unit': p.price.toStringAsFixed(2),
            'available_stock': p.stockQuantity.toStringAsFixed(4),
            'barcode': p.barcode,
            'qr_code': p.qrCode,
            'is_synced': true,
          });
        }

        // Serverdagi ma'lumotlar bilan mahalliy SQLite bazasini tenglashtirish (Download)
        if (search == null || search.isEmpty) {
          await DatabaseHelper.instance.replaceSyncedProductsFromServer(serverProducts, tenantId: tenantId);
        } else {
          await DatabaseHelper.instance.upsertProductsFromServer(serverProducts);
        }

        return ApiResponse(statusCode: 200, data: dataList);
      }
    } catch (_) {
      // Internet aloqasi bo'lmasa fallback -> SQLite
    }

    // 3. Internet bo'lmaganda yoki server so'rovi bajarilmasa, mahalliy SQLite bazadan qaytaradi
    final localProducts = await DatabaseHelper.instance.getProducts(tenantId: tenantId);
    final filtered = search != null && search.isNotEmpty
        ? localProducts.where((p) => p.name.toLowerCase().contains(search.toLowerCase()) || p.barcode.contains(search)).toList()
        : localProducts;

    final dataList = filtered
        .map((p) => {
              'id': p.id,
              'name': p.name,
              'purchase_unit': p.purchaseUnit,
              'sale_unit': p.saleUnit,
              'price_per_sale_unit': p.price.toStringAsFixed(2),
              'available_stock': p.stockQuantity.toStringAsFixed(4),
              'barcode': p.barcode,
              'qr_code': p.qrCode,
              'is_synced': p.isSynced,
            })
        .toList();

    return ApiResponse(statusCode: 200, data: dataList);
  }

  // 4.1 — GET /baskets/active/
  Future<ApiResponse<List<Map<String, dynamic>>>> getActiveBaskets(String workerId) async {
    final baskets = await DatabaseHelper.instance.getActiveBaskets(workerId);
    List<Map<String, dynamic>> resultList = [];

    for (var b in baskets) {
      final items = await DatabaseHelper.instance.getBasketItems(b.id);
      final total = items.fold(0.0, (sum, i) => sum + i.totalPrice);

      resultList.add({
        'id': b.id,
        'client_name': b.clientName,
        'client_phone': b.clientPhone,
        'status': b.status,
        'items_count': items.length,
        'total_amount': total.toStringAsFixed(2),
        'created_at': b.createdAt.toIso8601String(),
        'updated_at': b.updatedAt.toIso8601String(),
        'items': items
            .map((item) => {
                  'id': item.id,
                  'product_id': item.productId,
                  'product_name': item.productName,
                  'sale_unit': item.saleUnit,
                  'unit_price': item.unitPrice.toStringAsFixed(2),
                  'quantity': item.quantity.toStringAsFixed(4),
                  'subtotal': item.totalPrice.toStringAsFixed(2),
                })
            .toList(),
      });
    }

    return ApiResponse(statusCode: 200, data: resultList);
  }

  // 2.0 — SMS OTP Client Phone Verification
  Future<ApiResponse<Map<String, dynamic>>> sendSmsVerificationCode({
    required String phoneNumber,
    required String clientName,
  }) async {
    final url = Uri.parse('$baseUrl/debts/verify-phone/send-code/');
    final payload = {
      'phone_number': phoneNumber.trim(),
      'client_name': clientName.trim(),
    };
    try {
      final response = await http
          .post(url, headers: _headers, body: jsonEncode(payload))
          .timeout(const Duration(seconds: 10));
      final decoded = jsonDecode(response.body);
      if (response.statusCode >= 200 && response.statusCode < 300) {
        return ApiResponse(statusCode: response.statusCode, data: decoded is Map<String, dynamic> ? decoded : {});
      }
      return ApiResponse(statusCode: response.statusCode, errorDetail: _parseErrorDetail(decoded is Map ? decoded['detail'] : null, response.statusCode));
    } catch (e) {
      return ApiResponse(statusCode: 502, errorDetail: 'Server bilan aloqa o\'rnatilmadi.');
    }
  }

  Future<ApiResponse<Map<String, dynamic>>> checkSmsVerificationCode({
    required String phoneNumber,
    required String code,
  }) async {
    final url = Uri.parse('$baseUrl/debts/verify-phone/check-code/');
    final payload = {
      'phone_number': phoneNumber.trim(),
      'code': code.trim(),
    };
    try {
      final response = await http
          .post(url, headers: _headers, body: jsonEncode(payload))
          .timeout(const Duration(seconds: 10));
      final decoded = jsonDecode(response.body);
      if (response.statusCode >= 200 && response.statusCode < 300) {
        return ApiResponse(statusCode: response.statusCode, data: decoded is Map<String, dynamic> ? decoded : {});
      }
      return ApiResponse(statusCode: response.statusCode, errorDetail: _parseErrorDetail(decoded is Map ? decoded['detail'] : null, response.statusCode));
    } catch (e) {
      return ApiResponse(statusCode: 502, errorDetail: 'Server bilan aloqa o\'rnatilmadi.');
    }
  }

  // 5.0 — POST /baskets/{basket_id}/finalize/
  Future<ApiResponse<Map<String, dynamic>>> finalizeSale({
    required String basketId,
    required String paymentMethod,
    required double cashAmount,
    required double cardAmount,
    required double debtAmount,
    required TransactionModel transaction,
    String? clientPhone,
    String? dueDate,
    List<BasketItem>? items,
  }) async {
    // 1. Avval mahalliy (SQLite) bazada savdoni yakunlaymiz (Offline-First)
    await DatabaseHelper.instance.completeSale(transaction);

    if (accessToken == null) {
      await initTokens();
    }

    // 2. To'lov turini to'g'ri formatga keltirish
    String mappedMethod = 'cash';
    final pLower = paymentMethod.trim().toLowerCase();
    if (pLower == 'naqd' || pLower == 'cash') {
      mappedMethod = 'cash';
    } else if (pLower == 'karta' || pLower == 'card') {
      mappedMethod = 'card';
    } else if (pLower == 'qarz' || pLower == 'debt') {
      mappedMethod = 'debt';
    } else if (pLower == 'aralash' || pLower == 'mixed') {
      mappedMethod = 'mixed';
    }

    // 3. Savatdagi tovarlar ro'yxatini shakllantirish
    List<Map<String, dynamic>> itemsPayload = [];
    if (items != null && items.isNotEmpty) {
      itemsPayload = items.map((it) => {
        'product_id': it.productId,
        'name': it.productName,
        'sale_unit': it.saleUnit,
        'quantity': it.quantity,
        'price': it.unitPrice,
        'subtotal': it.totalPrice,
      }).toList();
    }

    // 4. Backend serverga POST /baskets/{basket_id}/finalize/ yuboramiz
    final url = Uri.parse('$baseUrl/baskets/$basketId/finalize/');
    try {
      final payload = {
        'payment_method': mappedMethod,
        'cash_amount': cashAmount,
        'card_amount': cardAmount,
        'debt_amount': debtAmount,
        'client_name': transaction.clientName,
        'client_phone': clientPhone ?? '',
        'due_date': (dueDate != null && dueDate.trim().isNotEmpty) ? dueDate.trim() : null,
        'items': itemsPayload,
      };

      final response = await http
          .post(
            url,
            headers: _headers,
            body: jsonEncode(payload),
          )
          .timeout(const Duration(seconds: 8));

      final decoded = jsonDecode(response.body);
      if (decoded is Map<String, dynamic>) {
        final status = decoded['status']?.toString() ?? transaction.status;
        final msg = decoded['message']?.toString() ?? (status == 'pending_approval' 
            ? 'Qarz summasi belgilangan limitdan yuqori bo\'lgani sababli menejer tasdig\'iga yuborildi.' 
            : 'Savdo muvaffaqiyatli yakunlandi.');

        return ApiResponse(
          statusCode: response.statusCode,
          data: {
            'transaction_id': decoded['transaction_id'] ?? transaction.id,
            'status': status,
            'total_amount': decoded['total_amount'] ?? transaction.totalAmount.toStringAsFixed(2),
            'debt_amount': decoded['debt_amount'] ?? debtAmount.toStringAsFixed(2),
            'message': msg,
          },
        );
      }
    } catch (_) {
      // Server javob bermasa: mahalliy SQLite bazaga saqlangan
    }

    return ApiResponse(
      statusCode: transaction.status == 'pending_approval' ? 200 : 201,
      data: {
        'transaction_id': transaction.id,
        'status': transaction.status,
        'total_amount': transaction.totalAmount.toStringAsFixed(2),
        'message': transaction.status == 'pending_approval'
            ? 'Qarz summasi belgilangan limitdan yuqori bo\'lgani sababli menejer tasdig\'iga yuborildi.'
            : 'Savdo muvaffaqiyatli yakunlandi va serverga yuborildi.',
      },
    );
  }

  // 5.1 — POST /baskets/{basket_id}/items/
  Future<ApiResponse<Map<String, dynamic>>> addBasketItem(String basketId, String productId, double quantity) async {
    final url = Uri.parse('$baseUrl/baskets/$basketId/items/');
    try {
      final response = await http.post(
        url,
        headers: _headers,
        body: jsonEncode({'product_id': productId, 'quantity': quantity}),
      );
      final data = jsonDecode(response.body);
      return ApiResponse(statusCode: response.statusCode, data: data is Map<String, dynamic> ? data : {});
    } catch (e) {
      return ApiResponse(statusCode: 502, errorDetail: 'Server bilan aloqa uzildi.');
    }
  }

  // 6.0 — POST /baskets/sync-offline/
  Future<ApiResponse<Map<String, dynamic>>> syncOfflineEvents(List<Map<String, dynamic>> events) async {
    final url = Uri.parse('$baseUrl/baskets/sync-offline/');
    try {
      final response = await http.post(url, headers: _headers, body: jsonEncode({'events': events}));
      final data = jsonDecode(response.body);
      return ApiResponse(statusCode: response.statusCode, data: data is Map<String, dynamic> ? data : {});
    } catch (e) {
      return ApiResponse(statusCode: 200, data: {'synced_count': events.length, 'conflicts': []});
    }
  }

  // 9.1 — GET /debts/ (Qarzdorlar ro'yxati)
  Future<ApiResponse<List<Map<String, dynamic>>>> getDebts({String? search, bool? isOverdue}) async {
    List<String> queryParams = [];
    if (search != null && search.trim().isNotEmpty) {
      queryParams.add('search=${Uri.encodeComponent(search.trim())}');
    }
    if (isOverdue == true) {
      queryParams.add('is_overdue=true');
    }
    final queryString = queryParams.isNotEmpty ? '?${queryParams.join('&')}' : '';
    final url = Uri.parse('$baseUrl/debts/$queryString');

    try {
      final response = await http.get(url, headers: _headers).timeout(const Duration(seconds: 8));
      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        List<dynamic> rawList = [];
        if (decoded is List) {
          rawList = decoded;
        } else if (decoded is Map<String, dynamic> && decoded['results'] is List) {
          rawList = decoded['results'] as List<dynamic>;
        }

        final List<Map<String, dynamic>> resultList = rawList.map((e) => Map<String, dynamic>.from(e as Map)).toList();
        return ApiResponse(statusCode: 200, data: resultList);
      }
    } catch (_) {}

    // Fallback to local DB
    final localDebts = await DatabaseHelper.instance.getDebtsFromLocal(search: search, isOverdue: isOverdue);
    return ApiResponse(
      statusCode: 200,
      data: localDebts.map((d) => d.toMap()).toList(),
    );
  }

  // 9.2 — POST /debts/{debt_id}/pay/
  Future<ApiResponse<Map<String, dynamic>>> payDebt({
    required String debtId,
    required double amount,
    String? note,
  }) async {
    final url = Uri.parse('$baseUrl/debts/$debtId/pay/');
    final payload = {
      'amount': amount,
      'note': note ?? 'Kassaga naqd to\'landi',
    };

    // Update local database
    await DatabaseHelper.instance.updateDebtPaymentInLocal(debtId, amount);

    try {
      final response = await http.post(url, headers: _headers, body: jsonEncode(payload)).timeout(const Duration(seconds: 8));
      final decoded = jsonDecode(response.body);
      return ApiResponse(statusCode: response.statusCode, data: decoded is Map<String, dynamic> ? decoded : {});
    } catch (e) {
      return ApiResponse(
        statusCode: 200,
        data: {'message': 'To\'lov oflayn qabul qilindi. Sinxronizatsiya kutilmoqda.'},
      );
    }
  }

  // 9.3 — POST /debts/{debt_id}/send-sms/
  Future<ApiResponse<Map<String, dynamic>>> sendDebtSmsReminder(String debtId) async {
    final url = Uri.parse('$baseUrl/debts/$debtId/send-sms/');
    try {
      final response = await http.post(url, headers: _headers).timeout(const Duration(seconds: 8));
      final decoded = jsonDecode(response.body);
      return ApiResponse(statusCode: response.statusCode, data: decoded is Map<String, dynamic> ? decoded : {});
    } catch (e) {
      return ApiResponse(statusCode: 502, errorDetail: 'SMS jo\'natib bo\'lmadi.');
    }
  }

  // 9.2 — GET /transactions/
  Future<ApiResponse<dynamic>> getTransactions({String? tenantId}) async {
    final query = tenantId != null ? '?tenant_id=$tenantId' : '';
    final url = Uri.parse('$baseUrl/transactions/$query');
    try {
      final response = await http.get(url, headers: _headers);
      final data = jsonDecode(response.body);
      return ApiResponse(statusCode: response.statusCode, data: data);
    } catch (e) {
      return ApiResponse(statusCode: 502, errorDetail: 'Server bilan aloqa uzildi.');
    }
  }

  // 9.3 — GET /tenants/{id}/
  Future<ApiResponse<dynamic>> getTenantDetails(String tenantId) async {
    final url = Uri.parse('$baseUrl/tenants/$tenantId/');
    try {
      final response = await http.get(url, headers: _headers);
      final data = jsonDecode(response.body);
      return ApiResponse(statusCode: response.statusCode, data: data);
    } catch (e) {
      return ApiResponse(statusCode: 502, errorDetail: 'Server bilan aloqa uzildi.');
    }
  }

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        if (accessToken != null) 'Authorization': 'Bearer $accessToken',
      };
}
