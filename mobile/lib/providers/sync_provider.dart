import 'dart:async';
import 'dart:io';
import 'dart:convert';
import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../services/db_service.dart';

class SyncProvider extends ChangeNotifier {
  final String tenantId;
  final String serverUrl;

  List<dynamic> _products = [];
  List<dynamic> _debts = [];
  List<dynamic> _syncQueue = [];
  List<dynamic> _baskets = []; // Local worker baskets
  String? _activeBasketId;
  
  Map<String, dynamic>? _dashboardStats;
  List<dynamic> _allWorkersBaskets = []; // Baskets list for manager view
  
  bool _isSyncing = false;
  bool _isLoading = false;

  Timer? _syncTimer;
  WebSocket? _webSocket;

  // Getters
  List<dynamic> get products => _products;
  List<dynamic> get debts => _debts;
  List<dynamic> get syncQueue => _syncQueue;
  List<dynamic> get baskets => _baskets;
  String? get activeBasketId => _activeBasketId;
  Map<String, dynamic>? get dashboardStats => _dashboardStats;
  List<dynamic> get allWorkersBaskets => _allWorkersBaskets;
  bool get isSyncing => _isSyncing;
  bool get isLoading => _isLoading;

  ApiService get api => ApiService(serverUrl);

  SyncProvider({required this.tenantId, required this.serverUrl}) {
    _startSyncTimer();
  }

  // WebSocket connection and room join
  void initSocket(String userId) {
    try {
      _webSocket?.close();
      final wsUrl = serverUrl.replaceAll('http://', 'ws://').replaceAll('https://', 'wss://') + '/ws/tenant/$tenantId';
      debugPrint('Connecting to WebSocket: $wsUrl');
      WebSocket.connect(wsUrl).then((ws) {
        _webSocket = ws;
        debugPrint('WebSocket connected to server');
        
        ws.listen((message) {
          try {
            debugPrint('WebSocket received message: $message');
            final data = jsonDecode(message);
            if (data['event'] == 'basket-updated') {
              debugPrint('WebSocket received basket-updated relay');
              refreshManagerOverview();
            }
          } catch (e) {
            debugPrint('Error parsing WebSocket message: $e');
          }
        }, onDone: () {
          debugPrint('WebSocket disconnected');
        }, onError: (e) {
          debugPrint('WebSocket error: $e');
        });
      }).catchError((e) {
        debugPrint('WebSocket connection failed: $e');
      });
    } catch (e) {
      debugPrint('WebSocket init failed: $e');
    }
  }

  // Periodic Timer for background sync and managers polling
  void _startSyncTimer() {
    _syncTimer?.cancel();
    _syncTimer = Timer.periodic(const Duration(seconds: 10), (timer) {
      syncQueueToServer();
      if (_allWorkersBaskets.isNotEmpty || _dashboardStats != null) {
        refreshManagerOverview();
      }
    });
  }

  @override
  void dispose() {
    _syncTimer?.cancel();
    _webSocket?.close();
    super.dispose();
  }

  // Load initial caches
  Future<void> loadCache() async {
    _products = await DbService.getProducts(tenantId);
    _debts = await DbService.getDebts(tenantId);
    _syncQueue = await DbService.getSyncQueue(tenantId);
    notifyListeners();
  }

  // Fetch online data and refresh cache
  Future<void> refreshOnlineData() async {
    _isLoading = true;
    notifyListeners();

    try {
      final health = await api.checkHealth();
      if (health) {
        // Sync queue first
        await syncQueueToServer();

        // Fresh fetch
        final prods = await api.fetchProducts(tenantId);
        _products = prods;
        await DbService.saveProducts(tenantId, prods);

        final debtList = await api.fetchDebts(tenantId);
        _debts = debtList;
        await DbService.saveDebts(tenantId, debtList);
      }
    } catch (e) {
      debugPrint('SyncProvider online fetch failed, running in offline mode: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Fetch stats for Manager
  Future<void> refreshManagerOverview() async {
    try {
      final stats = await api.fetchDashboardStats(tenantId);
      _dashboardStats = stats;
      
      final workerBaskets = await api.fetchActiveBaskets(tenantId);
      _allWorkersBaskets = workerBaskets;
      notifyListeners();
    } catch (_) {
      debugPrint('Manager overview fetch failed');
    }
  }

  // --- WORKER LOCAL BASKETS MANAGEMENT ---
  Future<void> loadWorkerBaskets(String workerId) async {
    final local = await DbService.getLocalBaskets(tenantId, workerId);
    if (local.isNotEmpty) {
      _baskets = local;
      _activeBasketId = local.first['id'];
    } else {
      // Create initial basket
      final defaultBasket = {
        'id': 'basket_${DateTime.now().millisecondsSinceEpoch}',
        'clientName': 'Mijoz 1',
        'items': [],
        'status': 'active',
        'updatedAt': DateTime.now().toIso8601String()
      };
      _baskets = [defaultBasket];
      _activeBasketId = defaultBasket['id'] as String?;
      await DbService.saveLocalBaskets(tenantId, workerId, _baskets);
    }
    notifyListeners();
  }

  Future<void> createLocalBasket(String workerId) async {
    final count = _baskets.length + 1;
    final newBasket = {
      'id': 'basket_${DateTime.now().millisecondsSinceEpoch}',
      'clientName': 'Mijoz $count',
      'items': [],
      'status': 'active',
      'updatedAt': DateTime.now().toIso8601String()
    };

    _baskets.insert(0, newBasket);
    _activeBasketId = newBasket['id'] as String?;
    await DbService.saveLocalBaskets(tenantId, workerId, _baskets);
    notifyListeners();

    // Sync queue online creation
    await DbService.addToSyncQueue(tenantId, {
      'type': 'CREATE_BASKET',
      'workerId': workerId,
      'clientName': newBasket['clientName']
    });
    _syncQueue = await DbService.getSyncQueue(tenantId);
    syncQueueToServer();
  }

  Future<void> updateBasketClientName(String workerId, String bId, String newName) async {
    _baskets = _baskets.map((b) {
      if (b['id'] == bId) {
        b['clientName'] = newName;
        b['updatedAt'] = DateTime.now().toIso8601String();
      }
      return b;
    }).toList();
    await DbService.saveLocalBaskets(tenantId, workerId, _baskets);
    notifyListeners();
  }

  Future<void> addItemToBasket(String workerId, String bId, dynamic product, double qty) async {
    final basketIdx = _baskets.indexWhere((b) => b['id'] == bId);
    if (basketIdx == -1) return;

    final basket = _baskets[basketIdx];
    final items = List<dynamic>.from(basket['items']);
    final itemIdx = items.indexWhere((it) => it['productId'] == product['id']);

    if (itemIdx != -1) {
      items[itemIdx]['quantity'] = items[itemIdx]['quantity'] + qty;
    } else {
      items.add({
        'id': 'item_${DateTime.now().millisecondsSinceEpoch}',
        'productId': product['id'],
        'quantity': qty,
        'product': product
      });
    }

    basket['items'] = items;
    basket['updatedAt'] = DateTime.now().toIso8601String();
    _baskets[basketIdx] = basket;

    await DbService.saveLocalBaskets(tenantId, workerId, _baskets);

    // Reserve stock locally
    _products = _products.map((p) {
      if (p['id'] == product['id']) {
        p['reservedStock'] = (p['reservedStock'] ?? 0) + qty;
      }
      return p;
    }).toList();
    await DbService.saveProducts(tenantId, _products);
    notifyListeners();

    // Queue sync
    final targetQty = itemIdx != -1 ? items[itemIdx]['quantity'] : qty;
    await DbService.addToSyncQueue(tenantId, {
      'type': 'ADD_ITEM',
      'basketId': bId,
      'productId': product['id'],
      'quantity': targetQty,
      'scannedBy': workerId
    });
    _syncQueue = await DbService.getSyncQueue(tenantId);
    syncQueueToServer();
  }

  Future<void> removeItemFromBasket(String workerId, String bId, String itemId, String productId, double qty) async {
    final basketIdx = _baskets.indexWhere((b) => b['id'] == bId);
    if (basketIdx == -1) return;

    final basket = _baskets[basketIdx];
    final items = List<dynamic>.from(basket['items']);
    items.removeWhere((it) => it['id'] == itemId);

    basket['items'] = items;
    basket['updatedAt'] = DateTime.now().toIso8601String();
    _baskets[basketIdx] = basket;

    await DbService.saveLocalBaskets(tenantId, workerId, _baskets);

    // Adjust local reserved stock
    _products = _products.map((p) {
      if (p['id'] == productId) {
        p['reservedStock'] = double.parse(p['reservedStock'].toString()) - qty;
        if (p['reservedStock'] < 0) p['reservedStock'] = 0;
      }
      return p;
    }).toList();
    await DbService.saveProducts(tenantId, _products);
    notifyListeners();

    // Queue sync
    await DbService.addToSyncQueue(tenantId, {
      'type': 'REMOVE_ITEM',
      'basketId': bId,
      'itemId': itemId
    });
    _syncQueue = await DbService.getSyncQueue(tenantId);
    syncQueueToServer();
  }

  Future<void> cancelLocalBasket(String workerId, String bId) async {
    final basket = _baskets.firstWhere((b) => b['id'] == bId, orElse: () => null);
    if (basket == null) return;

    // Release local reserved stock
    for (final item in basket['items']) {
      final productId = item['productId'];
      final qty = item['quantity'];
      _products = _products.map((p) {
        if (p['id'] == productId) {
          p['reservedStock'] = double.parse(p['reservedStock'].toString()) - qty;
          if (p['reservedStock'] < 0) p['reservedStock'] = 0;
        }
        return p;
      }).toList();
    }
    await DbService.saveProducts(tenantId, _products);

    _baskets.removeWhere((b) => b['id'] == bId);
    if (_baskets.isNotEmpty) {
      _activeBasketId = _baskets.first['id'];
    } else {
      _activeBasketId = null;
    }

    await DbService.saveLocalBaskets(tenantId, workerId, _baskets);
    notifyListeners();

    // Queue sync
    await DbService.addToSyncQueue(tenantId, {
      'type': 'CANCEL_BASKET',
      'basketId': bId
    });
    _syncQueue = await DbService.getSyncQueue(tenantId);
    syncQueueToServer();
  }

  void setActiveBasket(String? bId) {
    _activeBasketId = bId;
    notifyListeners();
  }

  // --- MANAGER OPERATIONS ---
  Future<void> finalizeSale({
    required dynamic basket,
    required String managerId,
    required String paymentMethod,
    required double totalAmount,
    String? clientName,
    String? clientPhone,
  }) async {
    _isLoading = true;
    notifyListeners();

    try {
      final health = await api.checkHealth();
      if (health) {
        await api.finalizeTransaction({
          'tenantId': tenantId,
          'basketId': basket['id'],
          'managerId': managerId,
          'paymentMethod': paymentMethod,
          'totalAmount': totalAmount,
          'clientName': clientName,
          'clientPhone': clientPhone
        });

        // Trigger fresh fetch
        await refreshOnlineData();
        await refreshManagerOverview();
      } else {
        // Offline finalization
        // Deduct stock locally
        for (final item in basket['items']) {
          final productId = item['productId'];
          final qty = double.parse(item['quantity'].toString());
          _products = _products.map((p) {
            if (p['id'] == productId) {
              p['currentStock'] = double.parse(p['currentStock'].toString()) - qty;
              p['reservedStock'] = double.parse(p['reservedStock'].toString()) - qty;
              if (p['currentStock'] < 0) p['currentStock'] = 0;
              if (p['reservedStock'] < 0) p['reservedStock'] = 0;
            }
            return p;
          }).toList();
        }
        await DbService.saveProducts(tenantId, _products);

        // Deduct/Add debt locally if credit payment
        if (paymentMethod == 'debt') {
          // Add to local debts
          int clientIdx = _debts.indexWhere((d) => d['clientName'] == clientName);
          if (clientIdx != -1) {
            _debts[clientIdx]['totalDebt'] = double.parse(_debts[clientIdx]['totalDebt'].toString()) + totalAmount;
            _debts[clientIdx]['remainingDebt'] = double.parse(_debts[clientIdx]['remainingDebt'].toString()) + totalAmount;
          } else {
            _debts.add({
              'id': 'debt_${DateTime.now().millisecondsSinceEpoch}',
              'clientName': clientName,
              'clientPhone': clientPhone,
              'totalDebt': totalAmount,
              'remainingDebt': totalAmount,
              'updatedAt': DateTime.now().toIso8601String()
            });
          }
          await DbService.saveDebts(tenantId, _debts);
        }

        // Queue
        await DbService.addToSyncQueue(tenantId, {
          'type': 'FINALIZE_TRANSACTION',
          'basketId': basket['id'],
          'managerId': managerId,
          'paymentMethod': paymentMethod,
          'totalAmount': totalAmount,
          'clientName': clientName,
          'clientPhone': clientPhone
        });
        _syncQueue = await DbService.getSyncQueue(tenantId);
        
        // Remove locally from manager baskets
        _allWorkersBaskets.removeWhere((b) => b['id'] == basket['id']);
        notifyListeners();
      }
    } catch (_) {
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> recordDebtPayment(String clientId, double amount, String managerId) async {
    _isLoading = true;
    notifyListeners();

    try {
      final health = await api.checkHealth();
      if (health) {
        await api.payDebt(clientId, amount, managerId);
        await refreshOnlineData();
        await refreshManagerOverview();
      } else {
        // Offline repayment
        _debts = _debts.map((d) {
          if (d['id'] == clientId) {
            d['remainingDebt'] = double.parse(d['remainingDebt'].toString()) - amount;
            if (d['remainingDebt'] < 0) d['remainingDebt'] = 0;
            d['updatedAt'] = DateTime.now().toIso8601String();
          }
          return d;
        }).toList();
        await DbService.saveDebts(tenantId, _debts);
        notifyListeners();

        // Queue sync
        await DbService.addToSyncQueue(tenantId, {
          'type': 'PAY_DEBT',
          'clientId': clientId,
          'amount': amount,
          'managerId': managerId
        });
        _syncQueue = await DbService.getSyncQueue(tenantId);
      }
    } catch (_) {
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> saveProduct(Map<String, dynamic> form, dynamic editingProduct) async {
    _isLoading = true;
    notifyListeners();

    try {
      if (editingProduct != null) {
        await api.updateProduct(editingProduct['id'], form);
      } else {
        await api.createProduct({
          'tenantId': tenantId,
          ...form
        });
      }
      await refreshOnlineData();
    } catch (_) {
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> deleteProduct(String id) async {
    _isLoading = true;
    notifyListeners();

    try {
      await api.deleteProduct(id);
      await refreshOnlineData();
    } catch (_) {
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // --- BACKGROUND SYNC loop ---
  Future<void> syncQueueToServer() async {
    if (_isSyncing || _syncQueue.isEmpty) return;
    _isSyncing = true;
    notifyListeners();

    try {
      final health = await api.checkHealth();
      if (!health) {
        _isSyncing = false;
        notifyListeners();
        return;
      }

      final queue = List<dynamic>.from(_syncQueue);
      int successCount = 0;

      for (final action in queue) {
        try {
          if (action['type'] == 'CREATE_BASKET') {
            await api.createBasket(tenantId, action['workerId'], action['clientName']);
          } else if (action['type'] == 'ADD_ITEM') {
            await api.addBasketItem(action['basketId'], action['productId'], double.parse(action['quantity'].toString()), action['scannedBy']);
          } else if (action['type'] == 'REMOVE_ITEM') {
            await api.removeBasketItem(action['basketId'], action['itemId']);
          } else if (action['type'] == 'CANCEL_BASKET') {
            await api.cancelBasket(action['basketId']);
          } else if (action['type'] == 'FINALIZE_TRANSACTION') {
            await api.finalizeTransaction({
              'tenantId': tenantId,
              'basketId': action['basketId'],
              'managerId': action['managerId'],
              'paymentMethod': action['paymentMethod'],
              'totalAmount': action['totalAmount'],
              'clientName': action['clientName'],
              'clientPhone': action['clientPhone']
            });
          } else if (action['type'] == 'PAY_DEBT') {
            await api.payDebt(action['clientId'], double.parse(action['amount'].toString()), action['managerId']);
          }

          successCount++;
        } catch (e) {
          debugPrint('Error syncing queue item: $e');
          break; // Halt and retry later if network fails mid-way
        }
      }

      final remaining = queue.sublist(successCount);
      _syncQueue = remaining;
      await DbService.saveSyncQueue(tenantId, remaining);
    } catch (e) {
      debugPrint('Sync processing failed: $e');
    } finally {
      _isSyncing = false;
      notifyListeners();
    }
  }
}
