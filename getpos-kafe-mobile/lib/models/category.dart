class Category {
  final String id;
  final String name;
  final String? iconName;
  final int orderIndex;

  Category({
    required this.id,
    required this.name,
    this.iconName,
    this.orderIndex = 0,
  });

  factory Category.fromJson(Map<String, dynamic> json) {
    return Category(
      id: json['id']?.toString() ?? '',
      name: json['name'] ?? '',
      iconName: json['icon_name'],
      orderIndex: json['order_index'] ?? 0,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'icon_name': iconName,
    'order_index': orderIndex,
  };
}
