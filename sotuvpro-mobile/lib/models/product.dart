class Product {
  final String id;
  final String tenantId; // 2.1 - Multi-tenant isolation
  final String name;
  final String purchaseUnit;
  final String saleUnit;
  final double conversionRate;
  final double price; // Sale price (sotish narxi)
  final double costPrice; // Tan narxi / Kelish narxi (cost_price)
  final double stockQuantity;
  final String barcode;
  final String qrCode;
  final double lowStockThreshold;
  final bool isTopSeller;
  final bool isSynced;

  Product({
    required this.id,
    required this.tenantId,
    required this.name,
    required this.purchaseUnit,
    required this.saleUnit,
    required this.conversionRate,
    required this.price,
    this.costPrice = 0.0,
    required this.stockQuantity,
    required this.barcode,
    required this.qrCode,
    this.lowStockThreshold = 10.0,
    this.isTopSeller = false,
    this.isSynced = true,
  });

  bool get isLowStock => stockQuantity <= lowStockThreshold;

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'tenantId': tenantId,
      'name': name,
      'purchaseUnit': purchaseUnit,
      'saleUnit': saleUnit,
      'conversionRate': conversionRate,
      'price': price,
      'costPrice': costPrice,
      'stockQuantity': stockQuantity,
      'barcode': barcode,
      'qrCode': qrCode,
      'lowStockThreshold': lowStockThreshold,
      'isTopSeller': isTopSeller ? 1 : 0,
      'isSynced': isSynced ? 1 : 0,
    };
  }

  factory Product.fromMap(Map<String, dynamic> map) {
    return Product(
      id: map['id'],
      tenantId: map['tenantId'] ?? 'tenant_default',
      name: map['name'],
      purchaseUnit: map['purchaseUnit'] ?? 'Dona',
      saleUnit: map['saleUnit'] ?? 'Dona',
      conversionRate: (map['conversionRate'] as num?)?.toDouble() ?? 1.0,
      price: (map['price'] as num?)?.toDouble() ?? 0.0,
      costPrice: (map['costPrice'] as num?)?.toDouble() ?? (map['cost_price'] as num?)?.toDouble() ?? 0.0,
      stockQuantity: (map['stockQuantity'] as num?)?.toDouble() ?? 0.0,
      barcode: map['barcode'] ?? '',
      qrCode: map['qrCode'] ?? '',
      lowStockThreshold: (map['lowStockThreshold'] as num?)?.toDouble() ?? 10.0,
      isTopSeller: map['isTopSeller'] == 1,
      isSynced: map['isSynced'] != 0,
    );
  }
}
