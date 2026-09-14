enum TableStatus {
  free,
  busy,
  billRequested,
  reserved;

  String get label {
    switch (this) {
      case TableStatus.free:
        return 'Bo\'sh';
      case TableStatus.busy:
        return 'Band';
      case TableStatus.billRequested:
        return 'Hisob so\'ralgan';
      case TableStatus.reserved:
        return 'Band qilingan';
    }
  }

  static TableStatus fromString(String? val) {
    switch (val?.toLowerCase()) {
      case 'busy':
        return TableStatus.busy;
      case 'bill_requested':
      case 'billrequested':
        return TableStatus.billRequested;
      case 'reserved':
        return TableStatus.reserved;
      case 'free':
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
  });

  factory RestaurantTable.fromJson(Map<String, dynamic> json) {
    final numVal = json['name'] ?? (json['number'] != null ? 'Stol ${json['number']}' : '');
    final seatsVal = json['capacity'] ?? json['seats'] ?? 4;
    final totalVal = json['totalAmount'] ?? json['total'] ?? json['total_amount'] ?? 0.0;
    final hallVal = json['hall'] ?? json['hall_name'] ?? 'Asosiy Zal';

    return RestaurantTable(
      id: json['id']?.toString() ?? '',
      hallId: hallVal.toString(),
      hallName: hallVal.toString(),
      number: numVal.toString(),
      seats: (seatsVal as num).toInt(),
      status: TableStatus.fromString(json['status']),
      activeOrderId: json['activeOrderId']?.toString() ?? json['active_order_id']?.toString(),
      activeWaiterName: json['activeWaiterName'] ?? json['active_waiter_name'] ?? json['waiter'],
      guestCount: json['guest_count'] ?? json['guestCount'],
      totalAmount: (totalVal as num).toDouble(),
      openedAt: json['opened_at'] != null ? DateTime.tryParse(json['opened_at']) : null,
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
