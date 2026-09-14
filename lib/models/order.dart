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
  });

  double get itemPrice => unitPrice + modifiersExtraPrice;
  double get totalPrice => itemPrice * quantity;

  factory OrderItem.fromJson(Map<String, dynamic> json) {
    return OrderItem(
      id: json['id']?.toString() ?? '',
      productId: json['product_id']?.toString() ?? '',
      productName: json['product_name'] ?? '',
      unitPrice: (json['unit_price'] as num?)?.toDouble() ?? 0.0,
      quantity: json['quantity'] ?? 1,
      selectedModifiers: (json['selected_modifiers'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      modifiersExtraPrice: (json['modifiers_extra_price'] as num?)?.toDouble() ?? 0.0,
      comment: json['comment'],
      status: OrderItemStatus.values.firstWhere(
        (e) => e.name == json['status'],
        orElse: () => OrderItemStatus.draft,
      ),
      course: json['course'] ?? 1,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'product_id': productId,
    'product_name': productName,
    'unit_price': unitPrice,
    'quantity': quantity,
    'selected_modifiers': selectedModifiers,
    'modifiers_extra_price': modifiersExtraPrice,
    'comment': comment,
    'status': status.name,
    'course': course,
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
    this.serviceFeePercent = 10.0, // Masalan 10% servis haqi
    this.discountPercent = 0.0,
    DateTime? createdAt,
  })  : items = items ?? [],
        createdAt = createdAt ?? DateTime.now();

  double get subtotal => items
      .where((i) => i.status != OrderItemStatus.cancelled)
      .fold(0.0, (sum, item) => sum + item.totalPrice);

  double get serviceAmount => subtotal * (serviceFeePercent / 100);
  double get discountAmount => subtotal * (discountPercent / 100);
  double get grandTotal => subtotal + serviceAmount - discountAmount;

  // Oshxonaga yuborilmagan yangi taomlar soni
  int get draftItemsCount => items.where((i) => i.status == OrderItemStatus.draft).length;

  factory RestaurantOrder.fromJson(Map<String, dynamic> json) {
    return RestaurantOrder(
      id: json['id']?.toString() ?? '',
      tableId: json['table_id']?.toString() ?? '',
      tableName: json['table_name'] ?? '',
      waiterId: json['waiter_id']?.toString() ?? '',
      waiterName: json['waiter_name'] ?? '',
      guestCount: json['guest_count'] ?? 1,
      items: (json['items'] as List<dynamic>?)
              ?.map((item) => OrderItem.fromJson(item))
              .toList() ??
          [],
      serviceFeePercent: (json['service_fee_percent'] as num?)?.toDouble() ?? 10.0,
      discountPercent: (json['discount_percent'] as num?)?.toDouble() ?? 0.0,
      createdAt: json['created_at'] != null ? DateTime.parse(json['created_at']) : DateTime.now(),
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
