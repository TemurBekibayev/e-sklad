import 'package:flutter/material.dart';
import '../models/hall_table.dart';
import '../core/network/api_service.dart';

class TablesProvider extends ChangeNotifier {
  final ApiService _apiService = ApiService();

  List<Hall> _halls = [];
  List<RestaurantTable> _allTables = [];
  String _selectedHallName = 'Barchasi';
  TableStatus? _filterStatus;
  bool _isLoading = false;

  List<Hall> get halls => _halls;
  String get selectedHallName => _selectedHallName;
  TableStatus? get filterStatus => _filterStatus;
  bool get isLoading => _isLoading;

  List<RestaurantTable> get filteredTables {
    var list = _allTables;
    if (_selectedHallName != 'Barchasi') {
      list = list.where((t) => t.hallName == _selectedHallName).toList();
    }
    if (_filterStatus != null) {
      list = list.where((t) => t.status == _filterStatus).toList();
    }
    return list;
  }

  int get freeTablesCount => _allTables.where((t) => t.status == TableStatus.free).length;
  int get busyTablesCount => _allTables.where((t) => t.status == TableStatus.busy).length;
  int get billTablesCount => _allTables.where((t) => t.status == TableStatus.billRequested).length;

  Future<void> init() async {
    _isLoading = true;
    notifyListeners();

    try {
      await _loadHallsAndTables();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> _loadHallsAndTables() async {
    final fetchedHalls = await _apiService.getHalls();
    _allTables = await _apiService.getTables();
    if (fetchedHalls.isNotEmpty) {
      _halls = [
        Hall(id: 'all', name: 'Barchasi', orderIndex: 0),
        ...fetchedHalls,
      ];
    } else {
      _extractHalls();
    }
  }

  void _extractHalls() {
    final hallNames = <String>{'Barchasi'};
    for (var t in _allTables) {
      if (t.hallName.isNotEmpty) {
        hallNames.add(t.hallName);
      }
    }
    _halls = hallNames
        .toList()
        .asMap()
        .entries
        .map((e) => Hall(id: e.value, name: e.value, orderIndex: e.key))
        .toList();
  }

  void selectHall(String hallName) {
    _selectedHallName = hallName;
    notifyListeners();
  }

  void setFilterStatus(TableStatus? status) {
    _filterStatus = status;
    notifyListeners();
  }

  RestaurantTable? getTableById(String id) {
    try {
      return _allTables.firstWhere((t) => t.id == id);
    } catch (_) {
      return null;
    }
  }

  void updateTableAfterOrder({
    required String tableId,
    required double totalAmount,
    required int guestCount,
    required String waiterName,
    TableStatus status = TableStatus.busy,
  }) {
    final index = _allTables.indexWhere((t) => t.id == tableId);
    if (index != -1) {
      final table = _allTables[index];
      table.status = status;
      table.totalAmount = totalAmount;
      table.guestCount = guestCount;
      table.activeWaiterName = waiterName;
      table.openedAt ??= DateTime.now();
      notifyListeners();
    }
  }

  void setTableBillRequested(String tableId) {
    final index = _allTables.indexWhere((t) => t.id == tableId);
    if (index != -1) {
      _allTables[index].status = TableStatus.billRequested;
      notifyListeners();
    }
  }

  void closeTable(String tableId) {
    final index = _allTables.indexWhere((t) => t.id == tableId);
    if (index != -1) {
      final table = _allTables[index];
      table.status = TableStatus.free;
      table.totalAmount = 0;
      table.guestCount = null;
      table.activeOrderId = null;
      table.activeWaiterName = null;
      table.openedAt = null;
      notifyListeners();
    }
  }

  Future<void> refresh() async {
    await _loadHallsAndTables();
    notifyListeners();
  }
}
