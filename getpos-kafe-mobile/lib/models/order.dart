enum OrderItemStatus {
  draft, // Yangi qo'shilgan, oshxonaga ketmagan
  sent,  // Oshxonaga yuborilgan (KDS / printer)
  ready, // Oshxona tayyorlagan
  cancelled;

  String get label {
    switch (this) {
      case OrderItemStatus.draft:
        return 'Yangi';
      case OrderItemStatus.sent:
        return 'Oshxonada';
      case OrderItemStatus.ready:
        return 'Tayyor';
      case OrderItemStatus.cancelled:
        return 'Bekor qilingan';
    }
  }
}

class OrderItem {
  final String id;
  final String productId;
  final String productName;
  final double unitPrice;
  int quantity;
  final List<String> selectedModifiers;
  final double modifiersExtraPrice;
  String? comment;
  OrderItemStatus status;
  int course; // 1-kurs, 2-kurs
  String? waiterId;
  String? waiterName;
  bool isCancelled;
  String? cancelReason;

  OrderItem({
    required this.id,
    required this.productId,
    required this.productName,
    required this.unitPrice,
    this.quantity = 1,
    this.selectedModifiers = const [],
    this.modifiersExtraPrice = 0.0,
    this.comment,
    this.status = OrderItemStatus.draft,
    this.course = 1,
    this.waiterId,
    this.waiterName,
    this.isCancelled = false,
    this.cancelReason,
  });

  double get itemPrice => unitPrice + modifiersExtraPrice;
  double get totalPrice => itemPrice * quantity;

  factory OrderItem.fromJson(Map<String, dynamic> json) {
    final priceVal = json['price'] ?? json['unit_price'] ?? 0.0;
    final isCanc = json['is_cancelled'] == 1 || json['is_cancelled'] == true || json['status'] == 'cancelled';

    return OrderItem(
      id: json['id']?.toString() ?? '',
      productId: json['product_id']?.toString() ?? json['productId']?.toString() ?? '',
      productName: json['product_name'] ?? json['productName'] ?? json['name'] ?? '',
      unitPrice: (priceVal as num).toDouble(),
      quantity: (json['quantity'] as num?)?.toInt() ?? 1,
      selectedModifiers: (json['selected_modifiers'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      modifiersExtraPrice: (json['modifiers_extra_price'] as num?)?.toDouble() ?? 0.0,
      comment: json['comment'],
      status: isCanc
          ? OrderItemStatus.cancelled
          : OrderItemStatus.values.firstWhere(
              (e) => e.name == json['status'],
              orElse: () => OrderItemStatus.sent,
            ),
      course: json['course'] ?? 1,
      waiterId: json['waiter_id']?.toString() ?? json['waiterId']?.toString(),
      waiterName: json['waiter_name'] ?? json['waiterName'],
      isCancelled: isCanc,
      cancelReason: json['cancel_reason'] ?? json['cancelReason'] ?? json['reason'],
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'product_id': productId,
    'product_name': productName,
    'price': itemPrice,
    'quantity': quantity,
    'selected_modifiers': selectedModifiers,
    'comment': comment,
    'status': status.name,
    'course': course,
    'waiter_id': waiterId,
    'waiter_name': waiterName,
    'is_cancelled': isCancelled ? 1 : 0,
    'cancel_reason': cancelReason,
  };

  OrderItem copyWith({
    String? id,
    String? productId,
    String? productName,
    double? unitPrice,
    int? quantity,
    List<String>? selectedModifiers,
    double? modifiersExtraPrice,
    String? comment,
    OrderItemStatus? status,
    int? course,
    String? waiterId,
    String? waiterName,
    bool? isCancelled,
  }) {
    return OrderItem(
      id: id ?? this.id,
      productId: productId ?? this.productId,
      productName: productName ?? this.productName,
      unitPrice: unitPrice ?? this.unitPrice,
      quantity: quantity ?? this.quantity,
      selectedModifiers: selectedModifiers ?? this.selectedModifiers,
      modifiersExtraPrice: modifiersExtraPrice ?? this.modifiersExtraPrice,
      comment: comment ?? this.comment,
      status: status ?? this.status,
      course: course ?? this.course,
      waiterId: waiterId ?? this.waiterId,
      waiterName: waiterName ?? this.waiterName,
      isCancelled: isCancelled ?? this.isCancelled,
    );
  }
}

class RestaurantOrder {
  final String id;
  final String tableId;
  final String tableName;
  final String waiterId;
  final String waiterName;
  int guestCount;
  List<OrderItem> items;
  double serviceFeePercent;
  double discountPercent;
  DateTime createdAt;

  RestaurantOrder({
    required this.id,
    required this.tableId,
    required this.tableName,
    required this.waiterId,
    required this.waiterName,
    this.guestCount = 2,
    List<OrderItem>? items,
    this.serviceFeePercent = 10.0,
    this.discountPercent = 0.0,
    DateTime? createdAt,
  })  : items = items ?? [],
        createdAt = createdAt ?? DateTime.now();

  double get subtotal => items
      .where((i) => !i.isCancelled && i.status != OrderItemStatus.cancelled)
      .fold(0.0, (sum, item) => sum + item.totalPrice);

  double get serviceAmount => subtotal * (serviceFeePercent / 100);
  double get discountAmount => subtotal * (discountPercent / 100);
  double get grandTotal => subtotal + serviceAmount - discountAmount;

  int get draftItemsCount => items.where((i) => i.status == OrderItemStatus.draft).length;

  factory RestaurantOrder.fromJson(Map<String, dynamic> json) {
    return RestaurantOrder(
      id: json['id']?.toString() ?? json['order_id']?.toString() ?? '',
      tableId: json['table_id']?.toString() ?? json['tableId']?.toString() ?? '',
      tableName: json['table_name'] ?? json['tableName'] ?? 'Stol',
      waiterId: json['waiter_id']?.toString() ?? json['waiterId']?.toString() ?? '',
      waiterName: json['waiter_name'] ?? json['waiterName'] ?? 'Ofitsiant',
      guestCount: json['guest_count'] ?? json['guestCount'] ?? 1,
      items: ((json['items'] ?? json['order_items'] ?? json['products']) as List<dynamic>?)
              ?.map((item) => OrderItem.fromJson(item))
              .toList() ??
          [],
      serviceFeePercent: (json['service_fee_percent'] as num?)?.toDouble() ?? 10.0,
      discountPercent: (json['discount_percent'] as num?)?.toDouble() ?? 0.0,
      createdAt: json['order_created_at'] != null || json['created_at'] != null
          ? DateTime.tryParse(json['order_created_at'] ?? json['created_at']) ?? DateTime.now()
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'table_id': tableId,
    'table_name': tableName,
    'waiter_id': waiterId,
    'waiter_name': waiterName,
    'guest_count': guestCount,
    'items': items.map((e) => e.toJson()).toList(),
    'service_fee_percent': serviceFeePercent,
    'discount_percent': discountPercent,
    'created_at': createdAt.toIso8601String(),
  };
}
