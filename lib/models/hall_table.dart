import 'order.dart';
import '../core/storage/app_preferences.dart';
import '../core/localization/app_translations.dart';

enum TableStatus {
  free,
  busy,
  billRequested,
  reserved;

  String get label {
    final lang = AppPreferences.cachedLanguage;
    switch (this) {
      case TableStatus.free:
        return AppTranslations.get('free', lang);
      case TableStatus.busy:
        return AppTranslations.get('busy', lang);
      case TableStatus.billRequested:
        return AppTranslations.get('bill_requested', lang);
      case TableStatus.reserved:
        return AppTranslations.get('reserved', lang);
    }
  }

  static TableStatus fromString(String? val) {
    switch (val?.toLowerCase().trim()) {
      case 'busy':
      case 'occupied':
      case 'band':
      case 'open':
        return TableStatus.busy;
      case 'bill_requested':
      case 'billrequested':
      case 'bill_request':
      case 'hisob':
      case 'hisob_soralgan':
        return TableStatus.billRequested;
      case 'reserved':
      case 'band_qilingan':
        return TableStatus.reserved;
      case 'free':
      case 'bosh':
      case 'bo\'sh':
      default:
        return TableStatus.free;
    }
  }
}

class Hall {
  final String id;
  final String name;
  final int orderIndex;

  Hall({
    required this.id,
    required this.name,
    this.orderIndex = 0,
  });

  factory Hall.fromJson(Map<String, dynamic> json) {
    return Hall(
      id: json['id']?.toString() ?? json['name'] ?? '',
      name: json['name'] ?? '',
      orderIndex: json['order_index'] ?? 0,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'order_index': orderIndex,
  };
}

class RestaurantTable {
  final String id;
  final String hallId;
  final String hallName;
  final String number;
  final int seats;
  TableStatus status;
  String? activeOrderId;
  String? activeWaiterName;
  int? guestCount;
  double totalAmount;
  DateTime? openedAt;
  List<OrderItem> items;

  RestaurantTable({
    required this.id,
    required this.hallId,
    this.hallName = 'Asosiy Zal',
    required this.number,
    required this.seats,
    this.status = TableStatus.free,
    this.activeOrderId,
    this.activeWaiterName,
    this.guestCount,
    this.totalAmount = 0.0,
    this.openedAt,
    this.items = const [],
  });

  factory RestaurantTable.fromJson(Map<String, dynamic> json) {
    final activeOrderObj = json['active_order'] is Map<String, dynamic> ? json['active_order'] as Map<String, dynamic> : null;
    final numVal = json['name'] ?? (json['number'] != null ? 'Stol ${json['number']}' : '');
    final seatsVal = json['capacity'] ?? json['seats'] ?? 4;
    final rawTotal = json['totalAmount'] ?? json['total'] ?? json['total_amount'] ?? activeOrderObj?['total_amount'] ?? activeOrderObj?['subtotal'] ?? 0.0;
    final totalVal = double.tryParse(rawTotal.toString()) ?? 0.0;
    final hallVal = json['hall_name'] ?? json['hall'] ?? 'Asosiy Zal';
    final rawItems = json['items'] ?? json['order_items'] ?? json['products'] ?? activeOrderObj?['items'];
    final itemsList = (rawItems is List)
        ? rawItems.map((i) => OrderItem.fromJson(i as Map<String, dynamic>)).toList()
        : <OrderItem>[];

    final parsedOrderId = json['activeOrderId']?.toString() ??
        json['active_order_id']?.toString() ??
        activeOrderObj?['id']?.toString() ??
        json['order_id']?.toString() ??
        json['orderId']?.toString();

    final parsedWaiter = json['activeWaiterName'] ??
        json['active_waiter_name'] ??
        activeOrderObj?['waiter_name'] ??
        json['waiter_name'] ??
        json['waiterName'] ??
        json['waiter'];

    var parsedStatus = TableStatus.fromString(json['status']?.toString() ?? activeOrderObj?['status']?.toString());
    if (parsedStatus == TableStatus.free && (totalVal > 0 || parsedOrderId != null)) {
      parsedStatus = TableStatus.busy;
    }

    return RestaurantTable(
      id: json['id']?.toString() ?? '',
      hallId: hallVal.toString(),
      hallName: hallVal.toString(),
      number: numVal.toString(),
      seats: (seatsVal is num) ? seatsVal.toInt() : (int.tryParse(seatsVal.toString()) ?? 4),
      status: parsedStatus,
      activeOrderId: parsedOrderId,
      activeWaiterName: parsedWaiter?.toString(),
      guestCount: json['guest_count'] ?? json['guestCount'] ?? activeOrderObj?['guests_count'],
      totalAmount: totalVal,
      openedAt: json['opened_at'] != null ? DateTime.tryParse(json['opened_at'].toString()) : null,
      items: itemsList,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'hall': hallName,
    'name': number,
    'number': number,
    'capacity': seats,
    'status': status == TableStatus.billRequested ? 'bill_requested' : status.name,
    'activeOrderId': activeOrderId,
    'activeWaiterName': activeWaiterName,
    'totalAmount': totalAmount,
    'opened_at': openedAt?.toIso8601String(),
  };

  RestaurantTable copyWith({
    String? id,
    String? hallId,
    String? hallName,
    String? number,
    int? seats,
    TableStatus? status,
    String? activeOrderId,
    String? activeWaiterName,
    int? guestCount,
    double? totalAmount,
    DateTime? openedAt,
  }) {
    return RestaurantTable(
      id: id ?? this.id,
      hallId: hallId ?? this.hallId,
      hallName: hallName ?? this.hallName,
      number: number ?? this.number,
      seats: seats ?? this.seats,
      status: status ?? this.status,
      activeOrderId: activeOrderId ?? this.activeOrderId,
      activeWaiterName: activeWaiterName ?? this.activeWaiterName,
      guestCount: guestCount ?? this.guestCount,
      totalAmount: totalAmount ?? this.totalAmount,
      openedAt: openedAt ?? this.openedAt,
    );
  }
}
