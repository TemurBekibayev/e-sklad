class TransactionModel {
  final String id;
  final String tenantId; // 2.1 - Multi-tenant isolation
  final String basketId;
  final String clientName;
  final double totalAmount;
  final String paymentType;
  final double paidCash;
  final double paidCard;
  final double debtAmount;
  final String status;
  final String workerId;
  final String workerName;
  final DateTime createdAt;

  TransactionModel({
    required this.id,
    required this.tenantId,
    required this.basketId,
    required this.clientName,
    required this.totalAmount,
    required this.paymentType,
    this.paidCash = 0.0,
    this.paidCard = 0.0,
    this.debtAmount = 0.0,
    this.status = 'completed',
    required this.workerId,
    required this.workerName,
    required this.createdAt,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'tenantId': tenantId,
      'basketId': basketId,
      'clientName': clientName,
      'totalAmount': totalAmount,
      'paymentType': paymentType,
      'paidCash': paidCash,
      'paidCard': paidCard,
      'debtAmount': debtAmount,
      'status': status,
      'workerId': workerId,
      'workerName': workerName,
      'createdAt': createdAt.toIso8601String(),
    };
  }

  factory TransactionModel.fromMap(Map<String, dynamic> map) {
    return TransactionModel(
      id: map['id'],
      tenantId: map['tenantId'] ?? 'tenant_default',
      basketId: map['basketId'] ?? '',
      clientName: map['clientName'] ?? 'Mijoz',
      totalAmount: (map['totalAmount'] as num?)?.toDouble() ?? 0.0,
      paymentType: map['paymentType'] ?? 'naqd',
      paidCash: (map['paidCash'] as num?)?.toDouble() ?? 0.0,
      paidCard: (map['paidCard'] as num?)?.toDouble() ?? 0.0,
      debtAmount: (map['debtAmount'] as num?)?.toDouble() ?? 0.0,
      status: map['status'] ?? 'completed',
      workerId: map['workerId'] ?? '',
      workerName: map['workerName'] ?? 'Xodim',
      createdAt: DateTime.tryParse(map['createdAt'] ?? '') ?? DateTime.now(),
    );
  }
}
