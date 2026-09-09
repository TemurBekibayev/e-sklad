class PurchaseItem {
  final String productId;
  final String productName;
  final double quantity;
  final double costPrice;
  final double salePrice;

  PurchaseItem({
    required this.productId,
    required this.productName,
    required this.quantity,
    required this.costPrice,
    required this.salePrice,
  });

  double get totalCost => quantity * costPrice;

  Map<String, dynamic> toMap() {
    return {
      'product_id': productId,
      'product_name': productName,
      'quantity': quantity,
      'cost_price': costPrice,
      'sale_price': salePrice,
    };
  }

  factory PurchaseItem.fromMap(Map<String, dynamic> map) {
    return PurchaseItem(
      productId: map['product_id'] ?? '',
      productName: map['product_name'] ?? '',
      quantity: (map['quantity'] as num?)?.toDouble() ?? 0.0,
      costPrice: (map['cost_price'] as num?)?.toDouble() ?? 0.0,
      salePrice: (map['sale_price'] as num?)?.toDouble() ?? 0.0,
    );
  }
}

class Purchase {
  final String id;
  final String supplierName;
  final String invoiceNumber;
  final String notes;
  final double paidAmount;
  final List<PurchaseItem> items;
  final DateTime createdAt;

  Purchase({
    required this.id,
    required this.supplierName,
    required this.invoiceNumber,
    required this.notes,
    required this.paidAmount,
    required this.items,
    required this.createdAt,
  });

  double get totalAmount => items.fold(0.0, (sum, item) => sum + item.totalCost);

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'supplier_name': supplierName,
      'invoice_number': invoiceNumber,
      'notes': notes,
      'paid_amount': paidAmount,
      'total_amount': totalAmount,
      'created_at': createdAt.toIso8601String(),
      'items': items.map((i) => i.toMap()).toList(),
    };
  }

  factory Purchase.fromMap(Map<String, dynamic> map) {
    var itemsList = <PurchaseItem>[];
    if (map['items'] is List) {
      itemsList = (map['items'] as List).map((i) => PurchaseItem.fromMap(Map<String, dynamic>.from(i))).toList();
    }
    return Purchase(
      id: map['id']?.toString() ?? '',
      supplierName: map['supplier_name'] ?? '',
      invoiceNumber: map['invoice_number'] ?? '',
      notes: map['notes'] ?? '',
      paidAmount: (map['paid_amount'] as num?)?.toDouble() ?? 0.0,
      items: itemsList,
      createdAt: map['created_at'] != null ? DateTime.tryParse(map['created_at']) ?? DateTime.now() : DateTime.now(),
    );
  }
}
