class ProductModifier {
  final String id;
  final String name;
  final double extraPrice;

  ProductModifier({
    required this.id,
    required this.name,
    this.extraPrice = 0.0,
  });

  factory ProductModifier.fromJson(Map<String, dynamic> json) {
    final rawPrice = json['extra_price'] ?? 0.0;
    return ProductModifier(
      id: json['id']?.toString() ?? '',
      name: json['name'] ?? '',
      extraPrice: double.tryParse(rawPrice.toString()) ?? 0.0,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'extra_price': extraPrice,
  };
}

class Product {
  final String id;
  final String categoryId;
  final String name;
  final double price;
  final String unit;
  final String? barcode;
  final double currentStock;
  final String? description;
  final String? imageUrl;
  final bool isAvailable;
  final bool isStopList;
  final List<ProductModifier> modifiers;

  Product({
    required this.id,
    required this.categoryId,
    required this.name,
    required this.price,
    this.unit = 'dona',
    this.barcode,
    this.currentStock = 0.0,
    this.description,
    this.imageUrl,
    this.isAvailable = true,
    this.isStopList = false,
    this.modifiers = const [],
  });

  factory Product.fromJson(Map<String, dynamic> json) {
    double parsedPrice = 0.0;
    if (json['price'] != null) {
      parsedPrice = (json['price'] as num).toDouble();
    } else if (json['price_per_sale_unit'] != null) {
      parsedPrice = double.tryParse(json['price_per_sale_unit'].toString()) ?? 0.0;
    }

    double parsedStock = 0.0;
    if (json['stock_quantity'] != null) {
      parsedStock = (json['stock_quantity'] as num).toDouble();
    } else if (json['current_stock'] != null) {
      parsedStock = double.tryParse(json['current_stock'].toString()) ?? 0.0;
    }

    final catId = json['category_id']?.toString() ?? json['category']?.toString() ?? '1';
    final available = json['is_available'] ?? true;

    return Product(
      id: json['id']?.toString() ?? '',
      categoryId: catId,
      name: json['name'] ?? '',
      price: parsedPrice,
      unit: json['unit'] ?? json['sale_unit'] ?? 'dona',
      barcode: json['barcode']?.toString(),
      currentStock: parsedStock,
      description: json['description'],
      imageUrl: json['image'] ?? json['image_url'],
      isAvailable: available,
      isStopList: !available || (json['is_stop_list'] ?? false),
      modifiers: (json['modifiers'] as List<dynamic>?)
              ?.map((m) => ProductModifier.fromJson(m))
              .toList() ??
          [],
    );
  }

  String? get fullImageUrl {
    if (imageUrl == null || imageUrl!.trim().isEmpty) return null;
    final url = imageUrl!.trim();
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    if (url.startsWith('/')) {
      return 'https://getpos.uz$url';
    }
    return 'https://getpos.uz/$url';
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'category_id': categoryId,
    'name': name,
    'price': price,
    'unit': unit,
    'stock_quantity': currentStock,
    'image': imageUrl,
    'is_available': isAvailable,
    'modifiers': modifiers.map((m) => m.toJson()).toList(),
  };
}
