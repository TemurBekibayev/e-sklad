import 'package:flutter/material.dart';
import '../models/hall_table.dart';
import '../models/product.dart';
import '../models/order.dart';
import '../core/network/api_service.dart';
import '../core/utils/mock_data.dart';
import 'tables_provider.dart';

class OrderProvider extends ChangeNotifier {
  final ApiService _apiService = ApiService();

  RestaurantOrder? _currentOrder;
  RestaurantTable? _currentTable;
  bool _isSending = false;

  RestaurantOrder? get currentOrder => _currentOrder;
  RestaurantTable? get currentTable => _currentTable;
  bool get isSending => _isSending;

  int get totalItemsCount => _currentOrder?.items.fold<int>(0, (sum, item) => sum + item.quantity) ?? 0;
  int get draftItemsCount => _currentOrder?.draftItemsCount ?? 0;
  double get subtotal => _currentOrder?.subtotal ?? 0.0;
  double get grandTotal => _currentOrder?.grandTotal ?? 0.0;

  void openTableOrder(RestaurantTable table, String waiterName, String waiterId) {
    _currentTable = table;

    if (table.activeOrderId != null) {
      _currentOrder = MockData.getInitialOrderForTable(table);
    } else {
      _currentOrder = RestaurantOrder(
        id: 'ord_${table.id}_${DateTime.now().millisecondsSinceEpoch}',
        tableId: table.id,
        tableName: table.number,
        waiterId: waiterId,
        waiterName: waiterName,
        guestCount: table.seats > 2 ? 2 : 1,
        serviceFeePercent: 10.0,
      );
    }
    notifyListeners();
  }

  void updateGuestCount(int count) {
    if (_currentOrder != null && count > 0) {
      _currentOrder!.guestCount = count;
      notifyListeners();
    }
  }

  void addProduct(
    Product product, {
    List<ProductModifier> selectedModifiers = const [],
    String? comment,
    int course = 1,
  }) {
    if (_currentOrder == null) return;

    final modNames = selectedModifiers.map((m) => m.name).toList()..sort();
    final extraPrice = selectedModifiers.fold(0.0, (sum, m) => sum + m.extraPrice);

    final existingIndex = _currentOrder!.items.indexWhere((item) {
      if (item.productId != product.id || item.status != OrderItemStatus.draft) return false;
      if (item.comment != comment || item.course != course) return false;
      final existingMods = List<String>.from(item.selectedModifiers)..sort();
      if (existingMods.length != modNames.length) return false;
      for (int i = 0; i < modNames.length; i++) {
        if (existingMods[i] != modNames[i]) return false;
      }
      return true;
    });

    if (existingIndex != -1) {
      _currentOrder!.items[existingIndex].quantity += 1;
    } else {
      final newItem = OrderItem(
        id: 'item_${DateTime.now().millisecondsSinceEpoch}_${_currentOrder!.items.length}',
        productId: product.id,
        productName: product.name,
        unitPrice: product.price,
        quantity: 1,
        selectedModifiers: modNames,
        modifiersExtraPrice: extraPrice,
        comment: comment,
        status: OrderItemStatus.draft,
        course: course,
      );
      _currentOrder!.items.add(newItem);
    }

    notifyListeners();
  }

  void incrementItem(OrderItem item) {
    item.quantity += 1;
    notifyListeners();
  }

  void decrementItem(OrderItem item) {
    if (item.quantity > 1) {
      item.quantity -= 1;
    } else {
      if (item.status == OrderItemStatus.draft) {
        _currentOrder?.items.remove(item);
      }
    }
    notifyListeners();
  }

  void removeItem(OrderItem item) {
    _currentOrder?.items.remove(item);
    notifyListeners();
  }

  // Oshxona va kassaga buyurtma yuborish (POST /api/orders)
  Future<bool> sendToKitchen(TablesProvider tablesProvider) async {
    if (_currentOrder == null || _currentTable == null) return false;

    final draftItems = _currentOrder!.items.where((i) => i.status == OrderItemStatus.draft).toList();
    if (draftItems.isEmpty && _currentOrder!.items.isEmpty) return false;

    _isSending = true;
    notifyListeners();

    try {
      final success = await _apiService.sendOrderToKitchen(order: _currentOrder!);

      if (success) {
        for (var item in draftItems) {
          item.status = OrderItemStatus.sent;
        }

        tablesProvider.updateTableAfterOrder(
          tableId: _currentTable!.id,
          totalAmount: _currentOrder!.grandTotal,
          guestCount: _currentOrder!.guestCount,
          waiterName: _currentOrder!.waiterName,
          status: TableStatus.busy,
        );

        _currentTable!.activeOrderId = _currentOrder!.id;
        _currentTable!.status = TableStatus.busy;
      }
      return success;
    } finally {
      _isSending = false;
      notifyListeners();
    }
  }

  // Pre-chek chiqarish (POST /api/orders/{id}/bill-request)
  Future<bool> requestPreBill(TablesProvider tablesProvider) async {
    if (_currentOrder == null || _currentTable == null) return false;

    _isSending = true;
    notifyListeners();

    try {
      final success = await _apiService.requestPreBill(orderId: _currentOrder!.id);
      if (success) {
        tablesProvider.setTableBillRequested(_currentTable!.id);
        _currentTable!.status = TableStatus.billRequested;
      }
      return success;
    } finally {
      _isSending = false;
      notifyListeners();
    }
  }

  // Stolni yopish (hisob-kitob tugagach)
  void closeTable(TablesProvider tablesProvider) {
    if (_currentTable != null) {
      tablesProvider.closeTable(_currentTable!.id);
      _currentOrder = null;
      _currentTable = null;
      notifyListeners();
    }
  }
}
