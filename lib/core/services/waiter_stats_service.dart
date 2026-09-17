import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../../models/waiter_stats.dart';
import '../../models/order.dart';
import '../../models/hall_table.dart';

class WaiterStatsService {
  static final WaiterStatsService _instance = WaiterStatsService._internal();
  factory WaiterStatsService() => _instance;
  WaiterStatsService._internal();

  String _todayDateStr() {
    final now = DateTime.now();
    return '${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';
  }

  String _getKey(String waiterId) => 'pos_waiter_stats_${_todayDateStr()}_$waiterId';

  Future<WaiterDailyStats> getTodayStats({
    required String waiterId,
    required String waiterName,
    List<RestaurantTable> allTables = const [],
  }) async {
    final prefs = await SharedPreferences.getInstance();
    final key = _getKey(waiterId);
    final jsonStr = prefs.getString(key);

    WaiterDailyStats baseStats;
    if (jsonStr != null) {
      try {
        baseStats = WaiterDailyStats.fromJson(jsonDecode(jsonStr));
      } catch (_) {
        baseStats = WaiterDailyStats(date: _todayDateStr());
      }
    } else {
      baseStats = WaiterDailyStats(date: _todayDateStr());
    }

    double totalSales = baseStats.totalSales;
    int tablesCount = baseStats.tablesCount;
    int guestsCount = baseStats.guestsCount;
    final dishCounts = Map<String, int>.from(baseStats.dishCounts);
    final servedTables = List<String>.from(baseStats.servedTableNumbers);

    for (final table in allTables) {
      final isMyTable = table.activeWaiterName == waiterName ||
          (waiterName.isNotEmpty && (table.activeWaiterName?.toLowerCase().contains(waiterName.toLowerCase()) ?? false));
      if (isMyTable && table.status != TableStatus.free) {
        if (!servedTables.contains(table.number)) {
          servedTables.add(table.number);
          tablesCount++;
          totalSales += table.totalAmount;
          guestsCount += (table.guestCount ?? 2);
          for (final item in table.items) {
            dishCounts[item.productName] = (dishCounts[item.productName] ?? 0) + item.quantity;
          }
        }
      }
    }

    return WaiterDailyStats(
      date: _todayDateStr(),
      totalSales: totalSales,
      tablesCount: tablesCount > 0 ? tablesCount : servedTables.length,
      guestsCount: guestsCount,
      dishCounts: dishCounts,
      servedTableNumbers: servedTables,
    );
  }

  Future<void> recordOrderSent({
    required String waiterId,
    required String tableNumber,
    required double orderTotal,
    required int guestCount,
    required List<OrderItem> items,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    final key = _getKey(waiterId);
    final jsonStr = prefs.getString(key);

    double totalSales = 0.0;
    int tablesCount = 0;
    int guestsCount = 0;
    Map<String, int> dishCounts = {};
    List<String> servedTables = [];

    if (jsonStr != null) {
      try {
        final existing = WaiterDailyStats.fromJson(jsonDecode(jsonStr));
        totalSales = existing.totalSales;
        tablesCount = existing.tablesCount;
        guestsCount = existing.guestsCount;
        dishCounts = Map<String, int>.from(existing.dishCounts);
        servedTables = List<String>.from(existing.servedTableNumbers);
      } catch (_) {}
    }

    totalSales += orderTotal;
    if (!servedTables.contains(tableNumber)) {
      servedTables.add(tableNumber);
      tablesCount++;
    }
    guestsCount += (guestCount > 0 ? guestCount : 2);

    for (final item in items) {
      dishCounts[item.productName] = (dishCounts[item.productName] ?? 0) + item.quantity;
    }

    final updated = WaiterDailyStats(
      date: _todayDateStr(),
      totalSales: totalSales,
      tablesCount: tablesCount,
      guestsCount: guestsCount,
      dishCounts: dishCounts,
      servedTableNumbers: servedTables,
    );

    await prefs.setString(key, jsonEncode(updated.toJson()));
  }
}
