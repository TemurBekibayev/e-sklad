import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/basket_item.dart';

class KassaHubService {
  static final KassaHubService instance = KassaHubService._();
  KassaHubService._();

  static const String defaultHubIp = 'http://192.168.1.105:8085';

  /// Saqlangan Kassa Hub IP manzilini SharedPreferences dan olish
  Future<String> getSavedHubIp() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString('kassa_hub_ip');
    if (saved != null && saved.trim().isNotEmpty) {
      String clean = saved.trim();
      if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
        clean = 'http://$clean';
      }
      if (!clean.contains(':8085') && !clean.contains(':')) {
        clean = '$clean:8085';
      }
      return clean;
    }
    return defaultHubIp;
  }

  /// Kassa Hub IP manzilini SharedPreferences da saqlash
  Future<void> saveHubIp(String ip) async {
    final prefs = await SharedPreferences.getInstance();
    String clean = ip.trim();
    if (clean.isNotEmpty) {
      if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
        clean = 'http://$clean';
      }
      if (!clean.contains(':8085') && !clean.contains(':', 8)) {
        clean = '$clean:8085';
      }
    }
    await prefs.setString('kassa_hub_ip', clean);
  }

  /// Kassa Hub bilan aloqani tekshirish (Ping: GET /hub/info)
  Future<Map<String, dynamic>> checkHubConnection([String? customIp]) async {
    final ip = customIp ?? await getSavedHubIp();
    final url = Uri.parse('$ip/hub/info');
    try {
      final response = await http.get(url).timeout(const Duration(seconds: 4));
      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        if (decoded is Map<String, dynamic>) {
          return {
            'is_connected': true,
            'status': decoded['status'] ?? 'ok',
            'store_name': decoded['store_name'] ?? 'Do\'kon Kassasi',
            'has_active_shift': decoded['has_active_shift'] == true,
            'active_shift_user': decoded['active_shift']?['user_name'] ?? 'Kassir',
          };
        }
      }
    } catch (_) {}
    return {
      'is_connected': false,
      'status': 'error',
      'store_name': 'Kassa topilmadi',
      'has_active_shift': false,
    };
  }

  /// Savatchani do'kondagi Desktop Kassaga yuborish (POST /hub/baskets)
  Future<Map<String, dynamic>> pushBasketToDesktopKassa({
    String? hubIp,
    required String clientName,
    required String sellerName,
    required List<BasketItem> items,
    required double totalAmount,
    String? note,
  }) async {
    final targetIp = hubIp ?? await getSavedHubIp();
    final url = Uri.parse('$targetIp/hub/baskets');

    final itemsPayload = items.map((it) => {
      'product_id': it.productId,
      'name': it.productName,
      'quantity': it.quantity,
      'sale_price': it.unitPrice,
      'total': it.totalPrice,
      'unit': it.saleUnit,
    }).toList();

    final payload = {
      'client_name': clientName.isNotEmpty ? clientName : 'Mijoz',
      'table_or_note': note ?? 'Mobil ilovadan uzatildi',
      'seller_name': sellerName.isNotEmpty ? sellerName : 'Konsultant',
      'items': itemsPayload,
      'total_amount': totalAmount,
    };

    try {
      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(payload),
      ).timeout(const Duration(seconds: 6));

      final decoded = jsonDecode(response.body);
      final basketId = decoded is Map ? decoded['basket_id']?.toString() ?? decoded['id']?.toString() : null;

      // Agar basket_id berilgan bo'lsa, Kassir ekraniga ovozli notification yuboramiz
      if (basketId != null) {
        await notifyDesktopKassa(targetIp, basketId);
      }

      if (response.statusCode >= 200 && response.statusCode < 300) {
        return {
          'success': true,
          'message': 'Savat Desktop Kassaga muvaffaqiyatli uzatildi!',
          'basket_id': basketId,
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Kassa Hub bilan aloqa bo\'lmadi. IP manzilini ($targetIp) tekshiring.',
      };
    }

    return {
      'success': false,
      'message': 'Kassaga uzatishda xatolik yuz berdi.',
    };
  }

  /// Kassir ekranida ovozli va pop-up bildirishnoma chiqarish (POST /hub/baskets/{id}/send-to-kassa)
  Future<void> notifyDesktopKassa(String hubIp, String basketId) async {
    final url = Uri.parse('$hubIp/hub/baskets/$basketId/send-to-kassa');
    try {
      await http.post(url).timeout(const Duration(seconds: 3));
    } catch (_) {}
  }
}
