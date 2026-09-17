import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../services/db_service.dart';

class AuthProvider extends ChangeNotifier {
  String _serverUrl = 'http://10.0.2.2:4000'; // Fallback Android Emulator address
  String _tenantId = '';
  String _tenantName = '';
  
  bool _isOnline = true;
  bool _isLoading = false;
  
  List<dynamic> _usersList = [];
  dynamic _selectedUser;
  Map<String, dynamic>? _currentUser;

  // Getters
  String get serverUrl => _serverUrl;
  String get tenantId => _tenantId;
  String get tenantName => _tenantName;
  bool get isOnline => _isOnline;
  bool get isLoading => _isLoading;
  List<dynamic> get usersList => _usersList;
  dynamic get selectedUser => _selectedUser;
  Map<String, dynamic>? get currentUser => _currentUser;

  ApiService get api => ApiService(_serverUrl);

  // Initialize
  Future<void> init() async {
    _isLoading = true;
    notifyListeners();

    try {
      String? savedUrl = await DbService.getServerUrl();
      if (savedUrl == null) {
        // Automatically pre-fill noutbuk local IP for MVP convenience
        savedUrl = 'http://192.168.1.30:4000';
        await DbService.saveServerUrl(savedUrl);
      }
      _serverUrl = savedUrl;

      var tenantConfig = await DbService.getActiveTenant();
      if (tenantConfig['id'] == null || tenantConfig['name'] == null) {
        // Automatically pre-fill default Premium Sement & Gips Store
        final defaultId = '0615b132-51e1-402f-a1b1-ebcbf4cae490';
        final defaultName = 'Premium Sement & Gips';
        await DbService.saveActiveTenant(defaultId, defaultName);
        tenantConfig = {'id': defaultId, 'name': defaultName};
      }

      _tenantId = tenantConfig['id']!;
      _tenantName = tenantConfig['name']!;
      
      // Load users cache
      _usersList = await DbService.getUsers(_tenantId);
      
      // Trigger async connection test and cache update
      checkConnectionAndSync();
    } catch (e) {
      debugPrint('Error initializing AuthProvider: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Set Server URL and Tenant ID
  Future<bool> connectTenant(String url, String tId) async {
    _isLoading = true;
    notifyListeners();

    try {
      final apiService = ApiService(url);
      final health = await apiService.checkHealth();
      
      if (!health) {
        _isLoading = false;
        notifyListeners();
        return false;
      }

      final tenants = await apiService.fetchTenants();
      final tenant = tenants.firstWhere((t) => t['id'] == tId.trim(), orElse: () => null);

      if (tenant == null) {
        _isLoading = false;
        notifyListeners();
        return false;
      }

      if (tenant['status'] != 'active') {
        _isLoading = false;
        notifyListeners();
        throw Exception('Ushbu do\'kon tizim ma\'muri tomonidan bloklangan');
      }

      // Save configurations
      _serverUrl = url;
      _tenantId = tenant['id'];
      _tenantName = tenant['name'];
      _isOnline = true;

      await DbService.saveServerUrl(url);
      await DbService.saveActiveTenant(_tenantId, _tenantName);

      // Fetch users list and save to cache
      final users = await apiService.fetchUsers(_tenantId);
      _usersList = users;
      await DbService.saveUsers(_tenantId, users);

      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }

  // Trigger cache refresh
  Future<void> checkConnectionAndSync() async {
    try {
      final health = await api.checkHealth();
      _isOnline = health;
      notifyListeners();

      if (health && _tenantId.isNotEmpty) {
        // Refresh users list
        final users = await api.fetchUsers(_tenantId);
        _usersList = users;
        await DbService.saveUsers(_tenantId, users);
        notifyListeners();
      }
    } catch (_) {
      _isOnline = false;
      notifyListeners();
    }
  }

  // Select profile
  void selectUser(dynamic user) {
    _selectedUser = user;
    notifyListeners();
  }

  // Direct Private Login via Login + Password / PIN
  Future<bool> login(String passwordOrPin, {String? loginVal}) async {
    _isLoading = true;
    notifyListeners();

    try {
      if (_isOnline) {
        final session = await api.login(null, passwordOrPin.trim(), login: loginVal?.trim());
        _currentUser = session['user'] ?? session;
        _selectedUser = _currentUser;
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        // Offline validation
        final pass = passwordOrPin.trim();
        final lVal = loginVal?.trim().toLowerCase();
        
        final matchingUser = _usersList.firstWhere(
          (u) {
            final uName = (u['name'] ?? '').toString().toLowerCase();
            final uLogin = (u['login'] ?? '').toString().toLowerCase();
            final uEmail = (u['email'] ?? '').toString().toLowerCase();
            final uPhone = (u['phone'] ?? u['phone_number'] ?? '').toString();
            
            final isLoginMatch = (lVal == null || lVal.isEmpty) ||
                (uName == lVal || uLogin == lVal || uEmail == lVal || uPhone == lVal);
            
            final uPass = (u['password'] ?? u['plain_password'] ?? '').toString();
            final uPin = (u['pin'] ?? u['plain_pin'] ?? '').toString();
            final isPassMatch = (uPass == pass || uPin == pass);
            
            return isLoginMatch && isPassMatch;
          },
          orElse: () => null,
        );

        if (matchingUser != null) {
          _currentUser = {
            'id': matchingUser['id'] ?? matchingUser['user_code'],
            'name': matchingUser['name'],
            'role': matchingUser['role'],
            'tenantId': _tenantId,
            'tenantName': _tenantName,
          };
          _selectedUser = _currentUser;
          _isLoading = false;
          notifyListeners();
          return true;
        } else {
          _isLoading = false;
          notifyListeners();
          return false;
        }
      }
    } catch (e) {
      debugPrint('[AuthProvider] Login error: $e');
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  // Logout
  void logout() {
    _currentUser = null;
    _selectedUser = null;
    notifyListeners();
  }

  // Clear config completely (e.g. switch shops)
  Future<void> disconnectShop() async {
    _tenantId = '';
    _tenantName = '';
    _usersList = [];
    _selectedUser = null;
    _currentUser = null;
    await DbService.clearTenantConfig();
    notifyListeners();
  }
}
