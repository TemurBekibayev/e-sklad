class WaiterDailyStats {
  final String date; // 'yyyy-MM-dd'
  final double totalSales;
  final int tablesCount;
  final int guestsCount;
  final Map<String, int> dishCounts;
  final List<String> servedTableNumbers;

  WaiterDailyStats({
    required this.date,
    this.totalSales = 0.0,
    this.tablesCount = 0,
    this.guestsCount = 0,
    this.dishCounts = const {},
    this.servedTableNumbers = const [],
  });

  double get averageCheck => tablesCount > 0 ? (totalSales / tablesCount) : 0.0;
  double get serviceFee10 => totalSales * 0.10;
  double get serviceFee15 => totalSales * 0.15;

  Map<String, dynamic> toJson() => {
    'date': date,
    'totalSales': totalSales,
    'tablesCount': tablesCount,
    'guestsCount': guestsCount,
    'dishCounts': dishCounts,
    'servedTableNumbers': servedTableNumbers,
  };

  factory WaiterDailyStats.fromJson(Map<String, dynamic> json) {
    final rawDishCounts = json['dishCounts'];
    Map<String, int> parsedDishes = {};
    if (rawDishCounts is Map) {
      rawDishCounts.forEach((k, v) {
        parsedDishes[k.toString()] = int.tryParse(v.toString()) ?? 0;
      });
    }

    final rawTables = json['servedTableNumbers'];
    List<String> parsedTables = [];
    if (rawTables is List) {
      parsedTables = rawTables.map((e) => e.toString()).toList();
    }

    return WaiterDailyStats(
      date: json['date']?.toString() ?? '',
      totalSales: double.tryParse(json['totalSales']?.toString() ?? '0') ?? 0.0,
      tablesCount: int.tryParse(json['tablesCount']?.toString() ?? '0') ?? 0,
      guestsCount: int.tryParse(json['guestsCount']?.toString() ?? '0') ?? 0,
      dishCounts: parsedDishes,
      servedTableNumbers: parsedTables,
    );
  }
}
