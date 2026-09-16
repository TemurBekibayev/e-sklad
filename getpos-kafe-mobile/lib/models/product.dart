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

    final rawImage = json['image'] ?? json['image_url'] ?? json['imageUrl'];
    final finalImageUrl = (rawImage != null && rawImage.toString().trim().isNotEmpty)
        ? rawImage.toString().trim()
        : _resolveDefaultImage(json['name']?.toString() ?? '');

    return Product(
      id: json['id']?.toString() ?? '',
      categoryId: catId,
      name: json['name'] ?? '',
      price: parsedPrice,
      unit: json['unit'] ?? json['sale_unit'] ?? 'dona',
      barcode: json['barcode']?.toString(),
      currentStock: parsedStock,
      description: json['description'],
      imageUrl: finalImageUrl,
      isAvailable: available,
      isStopList: !available || (json['is_stop_list'] ?? false),
      modifiers: (json['modifiers'] as List<dynamic>?)
              ?.map((m) => ProductModifier.fromJson(m))
              .toList() ??
          [],
    );
  }

  static String? _resolveDefaultImage(String name) {
    final lower = name.toLowerCase().trim();
    if (lower.contains('chuchvara sho') || lower.contains('sho\'rva') || lower.contains('shorva')) {
      return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80';
    }
    if (lower.contains('chuchvara')) {
      return 'https://images.unsplash.com/photo-1541832676-9b763b0239ab?w=300&auto=format&fit=crop&q=80';
    }
    if (lower.contains('osh') || lower.contains('palov')) {
      return 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80';
    }
    if (lower.contains('lag\'mon') || lower.contains('lagmon')) {
      return 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&auto=format&fit=crop&q=80';
    }
    if (lower.contains('qozon kabob') || lower.contains('qozon')) {
      return 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80';
    }
    if (lower.contains('shashlik') || lower.contains('kuskavoy') || lower.contains('qiyma')) {
      return 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&auto=format&fit=crop&q=80';
    }
    if (lower.contains('cheeseburger')) {
      return 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80';
    }
    if (lower.contains('chickenburger')) {
      return 'https://images.unsplash.com/photo-1521305916504-4a1121188589?w=600&auto=format&fit=crop&q=80';
    }
    if (lower.contains('burger') || lower.contains('hamburger')) {
      return 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=600&auto=format&fit=crop&q=80';
    }
    if (lower.contains('tandir lavash') || lower.contains('lavash')) {
      return 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=600&auto=format&fit=crop&q=80';
    }
    if (lower.contains('kartoshka free') || lower.contains('free') || lower.contains('fri')) {
      return 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&auto=format&fit=crop&q=80';
    }
    if (lower.contains('tovuq oyoq') || lower.contains('qanot')) {
      return 'https://images.unsplash.com/photo-1562967914-608f82629710?w=600&auto=format&fit=crop&q=80';
    }
    if (lower.contains('hotdog') || lower.contains('hot-dog')) {
      return 'https://images.unsplash.com/photo-1619740455993-9e612b1af08a?w=600&auto=format&fit=crop&q=80';
    }
    if (lower.contains('coca-cola') || lower.contains('cola') || lower.contains('pepsi')) {
      return 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80';
    }
    if (lower.contains('fanta')) {
      return 'https://images.unsplash.com/photo-1624517452488-04869289c4ca?w=600&auto=format&fit=crop&q=80';
    }
    if (lower.contains('lipton') || lower.contains('choy') || lower.contains('tea')) {
      return 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=600&auto=format&fit=crop&q=80';
    }
    if (lower.contains('suv') || lower.contains('water')) {
      return 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=600&auto=format&fit=crop&q=80';
    }
    if (lower.contains('achchiq-chuchuk') || lower.contains('bahor') || lower.contains('sezar') || lower.contains('salat')) {
      return 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80';
    }
    if (lower.contains('non') || lower.contains('patir') || lower.contains('tandir')) {
      return 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=600&auto=format&fit=crop&q=80';
    }
    return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80';
  }

  String? get fullImageUrl {
    if (imageUrl == null || imageUrl!.trim().isEmpty) return null;
    final url = imageUrl!.trim();
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    if (url.contains('uploads/') || url.contains('media/')) {
      final clean = url.startsWith('/') ? url : '/$url';
      return 'https://getpos.uz$clean';
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
