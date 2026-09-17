import '../core/storage/app_preferences.dart';

enum OrderItemStatus {
  draft, // Yangi qo'shilgan, oshxonaga ketmagan
  sent,  // Oshxonaga yuborilgan (KDS / printer)
  ready, // Oshxona tayyorlagan
  cancelled;

  String get label {
    final lang = AppPreferences.cachedLanguage;
    switch (this) {
      case OrderItemStatus.draft:
        return lang == 'oz' ? 'Янги' : (lang == 'ru' ? 'Новый' : 'Yangi');
      case OrderItemStatus.sent:
        return lang == 'oz' ? 'Ошхонада' : (lang == 'ru' ? 'На кухне' : 'Oshxonada');
      case OrderItemStatus.ready:
        return lang == 'oz' ? 'Тайёр' : (lang == 'ru' ? 'Готово' : 'Tayyor');
      case OrderItemStatus.cancelled:
        return lang == 'oz' ? 'Бекор қилинган' : (lang == 'ru' ? 'Отменено' : 'Bekor qilingan');
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
    final rawPrice = json['price'] ?? json['unit_price'] ?? json['item_price'] ?? 0.0;
    final priceVal = double.tryParse(rawPrice.toString()) ?? 0.0;
    final isCanc = json['is_cancelled'] == 1 || json['is_cancelled'] == true || json['status'] == 'cancelled';
    final rawQty = json['quantity'] ?? json['qty'] ?? 1;
    final qty = int.tryParse(rawQty.toString()) ?? (rawQty is num ? rawQty.toInt() : 1);
    final rawExtra = json['modifiers_extra_price'] ?? 0.0;
    final extraPrice = double.tryParse(rawExtra.toString()) ?? 0.0;
    final rawCourse = json['course'] ?? 1;
    final courseVal = int.tryParse(rawCourse.toString()) ?? (rawCourse is num ? rawCourse.toInt() : 1);

    return OrderItem(
      id: json['id']?.toString() ?? '',
      productId: json['product_id']?.toString() ?? json['productId']?.toString() ?? '',
      productName: json['product_name'] ?? json['productName'] ?? json['name'] ?? '',
      unitPrice: priceVal,
      quantity: qty,
      selectedModifiers: (json['selected_modifiers'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      modifiersExtraPrice: extraPrice,
      comment: json['comment'],
      status: isCanc
          ? OrderItemStatus.cancelled
          : OrderItemStatus.values.firstWhere(
              (e) => e.name == json['status'],
              orElse: () => OrderItemStatus.sent,
            ),
      course: courseVal,
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

  RestaurantOrder copyWith({
    String? id,
    String? tableId,
    String? tableName,
    String? waiterId,
    String? waiterName,
    int? guestCount,
    List<OrderItem>? items,
    double? serviceFeePercent,
    double? discountPercent,
    DateTime? createdAt,
  }) {
    return RestaurantOrder(
      id: id ?? this.id,
      tableId: tableId ?? this.tableId,
      tableName: tableName ?? this.tableName,
      waiterId: waiterId ?? this.waiterId,
      waiterName: waiterName ?? this.waiterName,
      guestCount: guestCount ?? this.guestCount,
      items: items ?? List.from(this.items),
      serviceFeePercent: serviceFeePercent ?? this.serviceFeePercent,
      discountPercent: discountPercent ?? this.discountPercent,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  factory RestaurantOrder.fromJson(Map<String, dynamic> json) {
    final rawFee = json['service_fee_percent'] ?? json['serviceFeePercent'] ?? 10.0;
    final feePercent = double.tryParse(rawFee.toString()) ?? 10.0;
    final rawDisc = json['discount_percent'] ?? json['discountPercent'] ?? 0.0;
    final discPercent = double.tryParse(rawDisc.toString()) ?? 0.0;
    final rawGuests = json['guest_count'] ?? json['guestCount'] ?? json['guests_count'] ?? 1;
    final guests = int.tryParse(rawGuests.toString()) ?? (rawGuests is num ? rawGuests.toInt() : 1);

    return RestaurantOrder(
      id: json['id']?.toString() ?? json['order_id']?.toString() ?? '',
      tableId: json['table']?.toString() ?? json['table_id']?.toString() ?? json['tableId']?.toString() ?? '',
      tableName: json['table_name'] ?? json['tableName'] ?? 'Stol',
      waiterId: json['waiter']?.toString() ?? json['waiter_id']?.toString() ?? json['waiterId']?.toString() ?? '',
      waiterName: json['waiter_name'] ?? json['waiterName'] ?? 'Ofitsiant',
      guestCount: guests,
      items: ((json['items'] ?? json['order_items'] ?? json['products']) as List<dynamic>?)
              ?.map((item) => OrderItem.fromJson(item as Map<String, dynamic>))
              .toList() ??
          [],
      serviceFeePercent: feePercent,
      discountPercent: discPercent,
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
