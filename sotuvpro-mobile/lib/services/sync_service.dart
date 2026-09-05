import 'dart:async';
import 'package:http/http.dart' as http;
import 'api_service.dart';

class SyncService {
  static final SyncService instance = SyncService._();
  SyncService._() {
    startAutoNetworkCheck();
  }

  bool _isOnline = true;
  bool _isSyncing = false;
  Timer? _networkTimer;

  final StreamController<bool> _networkStatusController = StreamController<bool>.broadcast();
  final StreamController<bool> _syncStatusController = StreamController<bool>.broadcast();

  bool get isOnline => _isOnline;
  bool get isSyncing => _isSyncing;

  Stream<bool> get onNetworkStatusChanged => _networkStatusController.stream;
  Stream<bool> get onSyncStatusChanged => _syncStatusController.stream;

  void startAutoNetworkCheck() {
    _networkTimer?.cancel();
    // Har 15 soniyada tarmoq aloqasini avtomatik tekshirib turish
    _networkTimer = Timer.periodic(const Duration(seconds: 15), (_) {
      checkConnectivityNow();
    });
    // Birinchi marta darhol tekshirish
    checkConnectivityNow();
  }

  Future<bool> checkConnectivityNow() async {
    try {
      final url = Uri.parse('${ApiService.instance.baseUrl}/products/');
      final res = await http.get(url).timeout(const Duration(seconds: 4));
      final onlineNow = res.statusCode < 500;
      setOnlineStatus(onlineNow);
      return onlineNow;
    } catch (_) {
      setOnlineStatus(false);
      return false;
    }
  }

  void setOnlineStatus(bool online) {
    if (_isOnline != online) {
      _isOnline = online;
      _networkStatusController.add(_isOnline);
      if (_isOnline) {
        triggerBackgroundSync();
      }
    }
  }

  Future<void> triggerBackgroundSync({String tenantId = 'tenant_store_101'}) async {
    if (!_isOnline || _isSyncing) return;

    _isSyncing = true;
    _syncStatusController.add(true);

    try {
      // 1. Foniy sinxronizatsiya: Oflayn yaratilgan tovarlarni serverga yuborish (POST /api/v1/products/)
      await ApiService.instance.syncOfflineProducts(tenantId: tenantId);
      // 2. Foniy sinxronizatsiya: Oflayn yakunlangan savdo voqealarini serverga yuborish (POST /api/v1/baskets/sync-offline/)
      await ApiService.instance.syncOfflineEvents([]);
    } catch (_) {}

    _isSyncing = false;
    _syncStatusController.add(false);
  }
}

