class BasketItem {
  final String id;
  final String basketId;
  final String productId;
  final String productName;
  final String saleUnit;
  double quantity;
  double unitPrice;

  BasketItem({
    required this.id,
    required this.basketId,
    required this.productId,
    required this.productName,
    required this.saleUnit,
    required this.quantity,
    required this.unitPrice,
  });

  double get totalPrice => quantity * unitPrice;

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'basketId': basketId,
      'productId': productId,
      'productName': productName,
      'saleUnit': saleUnit,
      'quantity': quantity,
      'unitPrice': unitPrice,
    };
  }

  factory BasketItem.fromMap(Map<String, dynamic> map) {
    return BasketItem(
      id: map['id'],
      basketId: map['basketId'],
      productId: map['productId'],
      productName: map['productName'] ?? '',
      saleUnit: map['saleUnit'] ?? 'Dona',
      quantity: (map['quantity'] as num?)?.toDouble() ?? 1.0,
      unitPrice: (map['unitPrice'] as num?)?.toDouble() ?? 0.0,
    );
  }
}
