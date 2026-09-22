import 'package:flutter/material.dart';
import '../models/waiter.dart';
import '../core/network/api_service.dart';
import '../core/storage/app_preferences.dart';

class AuthProvider extends ChangeNotifier {
  final ApiService _apiService = ApiService();

  Waiter? _currentWaiter;
  bool _isLoading = false;
  String? _errorMessage;
  String? _savedLogin;

  Waiter? get currentWaiter => _currentWaiter;
  bool get isAuthenticated => _currentWaiter != null;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  String? get savedLogin => _savedLogin;

  Future<void> init() async {
    _savedLogin = await AppPreferences.getSavedLogin();
    await checkAuthStatus();
  }

  Future<void> checkAuthStatus() async {
    final token = await AppPreferences.getAuthToken();
    final name = await AppPreferences.getWaiterName();
    final id = await AppPreferences.getWaiterId();
    final role = await AppPreferences.getWaiterRole();
    final tenantId = await AppPreferences.getTenantId();
    final tenantName = await AppPreferences.getTenantName();
    final isShiftOpen = await AppPreferences.isShiftOpen();

    if (token != null && name != null) {
      _currentWaiter = Waiter(
        id: id ?? 'usr_1',
        name: name,
        role: role ?? 'waiter',
        tenantId: tenantId,
        tenantName: tenantName,
        isShiftOpen: isShiftOpen,
      );
      notifyListeners();
    }
  }

  Future<bool> login({
    required String login,
    required String password,
  }) async {
    if (login.trim().isEmpty || password.trim().isEmpty) {
      _errorMessage = 'Iltimos, login va parolni kiriting';
      notifyListeners();
      return false;
    }

    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final result = await _apiService.loginWithCredentials(
        login: login,
        password: password,
      );

      _isLoading = false;

      if (result['success'] == true && result['waiter'] != null) {
        _currentWaiter = result['waiter'] as Waiter;
        _errorMessage = null;
        notifyListeners();
        return true;
      } else {
        _errorMessage = result['message'] ?? 'Noto\'g\'ri login yoki parol!';
        notifyListeners();
        return false;
      }
    } catch (e) {
      _isLoading = false;
      _errorMessage = 'Internet aloqasini tekshiring yoki qayta urinib ko\'ring.';
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    await AppPreferences.clearAuth();
    _currentWaiter = null;
    _errorMessage = null;
    notifyListeners();
  }
}
