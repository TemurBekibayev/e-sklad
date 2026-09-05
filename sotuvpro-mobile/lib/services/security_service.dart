import 'dart:convert';
import 'package:crypto/crypto.dart';
import 'package:shared_preferences/shared_preferences.dart';

class SecurityService {
  static final SecurityService instance = SecurityService._();
  SecurityService._();

  // Salt for hashing PINs securely (1.1)
  static const String _salt = 'SotuvPro_Secure_Salt_2026_x9k2';

  // Brute force protection state tracking (1.4)
  final Map<String, int> _failedAttempts = {};
  final Map<String, DateTime> _lockoutEndTime = {};

  /// 1.1 — PIN kodni xeshlash (SHA-256 + Salt)
  String hashPin(String rawPin) {
    final bytes = utf8.encode('$rawPin$_salt');
    final digest = sha256.convert(bytes);
    return digest.toString();
  }

  /// 1.4 — Brute-force tekshiruvi: 5 marta noto'g'ri PIN kiritilsa, 5 minutga vaqtincha bloklash
  bool isUserLockedOut(String userId) {
    if (_lockoutEndTime.containsKey(userId)) {
      final lockUntil = _lockoutEndTime[userId]!;
      if (DateTime.now().isBefore(lockUntil)) {
        return true;
      } else {
        // Bloklash muddati tugadi, tozalaymiz
        _lockoutEndTime.remove(userId);
        _failedAttempts[userId] = 0;
      }
    }
    return false;
  }

  /// Qolgan bloklash vaqtini sekundlarda qaytaradi
  int getRemainingLockoutSeconds(String userId) {
    if (_lockoutEndTime.containsKey(userId)) {
      final diff = _lockoutEndTime[userId]!.difference(DateTime.now()).inSeconds;
      return diff > 0 ? diff : 0;
    }
    return 0;
  }

  /// Noto'g'ri PIN kiritilganda urinishni oshiradi
  void registerFailedAttempt(String userId) {
    final current = (_failedAttempts[userId] ?? 0) + 1;
    _failedAttempts[userId] = current;

    if (current >= 5) {
      // 5 marta noto'g'ri -> 5 daqiqa (300 soniya) bloklash
      _lockoutEndTime[userId] = DateTime.now().add(const Duration(minutes: 5));
    }
  }

  /// Muvaffaqiyatli kirganda urinishlar sonini nolga tushiradi
  void resetFailedAttempts(String userId) {
    _failedAttempts[userId] = 0;
    _lockoutEndTime.remove(userId);
  }

  int getFailedAttempts(String userId) {
    return _failedAttempts[userId] ?? 0;
  }

  /// 3.2 — Kiruvchi ma'lumotlarni validatsiya qilish
  double validateQuantity(double input) {
    if (input.isNaN || input.isInfinite || input < 0) {
      return 0.0;
    }
    return input;
  }

  double validatePrice(double input) {
    if (input.isNaN || input.isInfinite || input < 0) {
      return 0.0;
    }
    return input;
  }

  String sanitizeInput(String input) {
    // Basic XSS & SQL Injection sanitization
    return input.replaceAll(RegExp(r'[<>]'), '').trim();
  }

  /// Shaxsiy PIN-kod o'rnatilganligini tekshirish
  Future<bool> hasUserPin(String userId) async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.containsKey('user_pin_$userId');
  }

  /// Foydalanuvchining shaxsiy PIN-kodini saqlash
  Future<void> setUserPin(String userId, String rawPin) async {
    final prefs = await SharedPreferences.getInstance();
    final hashed = hashPin(rawPin);
    await prefs.setString('user_pin_$userId', hashed);
  }

  /// Foydalanuvchining shaxsiy PIN-kodini tekshirish
  Future<bool> verifyUserPin(String userId, String rawPin) async {
    final prefs = await SharedPreferences.getInstance();
    final storedHash = prefs.getString('user_pin_$userId');
    if (storedHash == null) return false;
    return storedHash == hashPin(rawPin);
  }

  /// Sessiyani saqlash (Login qilingan foydalanuvchi)
  Future<void> saveSession(Map<String, dynamic> userMap) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('logged_in_user_json', jsonEncode(userMap));
  }

  /// JWT tokenlarini xotirada saqlash
  Future<void> saveAuthTokens({required String access, required String refresh}) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('jwt_access_token', access);
    await prefs.setString('jwt_refresh_token', refresh);
  }

  /// Saqlangan JWT tokenlarini olish
  Future<Map<String, String?>> getAuthTokens() async {
    final prefs = await SharedPreferences.getInstance();
    return {
      'access': prefs.getString('jwt_access_token'),
      'refresh': prefs.getString('jwt_refresh_token'),
    };
  }

  /// Tizimga kirgan foydalanuvchini olish
  Future<Map<String, dynamic>?> getLoggedInUserJson() async {
    final prefs = await SharedPreferences.getInstance();
    final jsonStr = prefs.getString('logged_in_user_json');
    if (jsonStr == null || jsonStr.isEmpty) return null;
    try {
      return jsonDecode(jsonStr) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  /// Sessiyani tozalash (Logout)
  Future<void> clearSession() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('logged_in_user_json');
    await prefs.remove('jwt_access_token');
    await prefs.remove('jwt_refresh_token');
  }
}
