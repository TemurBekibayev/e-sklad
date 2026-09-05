class Basket {
  final String id;
  final String tenantId; // 2.1 - Multi-tenant isolation
  String clientName;
  String clientPhone;
  final String workerId;
  String status; // 'active', 'waiting', 'completed', 'expired'
  final DateTime createdAt;
  DateTime updatedAt;

  Basket({
    required this.id,
    required this.tenantId,
    required this.clientName,
    this.clientPhone = '',
    required this.workerId,
    this.status = 'active',
    required this.createdAt,
    required this.updatedAt,
  });

  bool get isStale {
    return DateTime.now().difference(updatedAt).inHours >= 2 && status == 'active';
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'tenantId': tenantId,
      'clientName': clientName,
      'clientPhone': clientPhone,
      'workerId': workerId,
      'status': status,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  factory Basket.fromMap(Map<String, dynamic> map) {
    return Basket(
      id: map['id'],
      tenantId: map['tenantId'] ?? 'tenant_default',
      clientName: map['clientName'] ?? 'Noma\'lum mijoz',
      clientPhone: map['clientPhone'] ?? '',
      workerId: map['workerId'] ?? '',
      status: map['status'] ?? 'active',
      createdAt: DateTime.tryParse(map['createdAt'] ?? '') ?? DateTime.now(),
      updatedAt: DateTime.tryParse(map['updatedAt'] ?? '') ?? DateTime.now(),
    );
  }
}
