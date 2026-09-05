class DebtModel {
  final String id;
  final String tenantId;
  final String clientName;
  final String clientPhone;
  final double totalDebt;
  final double paidAmount;
  final double remainingDebt;
  final String dueDate;
  final String status; // 'active', 'paid', 'overdue', 'pending_approval'
  final bool isOverdue;
  final DateTime createdAt;

  DebtModel({
    required this.id,
    required this.tenantId,
    required this.clientName,
    required this.clientPhone,
    required this.totalDebt,
    required this.paidAmount,
    required this.remainingDebt,
    required this.dueDate,
    required this.status,
    required this.isOverdue,
    required this.createdAt,
  });

  factory DebtModel.fromMap(Map<String, dynamic> map) {
    final total = double.tryParse(map['total_debt']?.toString() ?? map['totalAmount']?.toString() ?? map['total_amount']?.toString() ?? '0') ?? 0.0;
    final paid = double.tryParse(map['paid_amount']?.toString() ?? map['paidAmount']?.toString() ?? '0') ?? 0.0;
    final remaining = double.tryParse(map['remaining_debt']?.toString() ?? map['remainingDebt']?.toString() ?? map['debt_amount']?.toString() ?? '0') ?? (total - paid);

    return DebtModel(
      id: map['id']?.toString() ?? map['debt_id']?.toString() ?? '',
      tenantId: map['tenant_id']?.toString() ?? map['tenantId']?.toString() ?? 'tenant_default',
      clientName: map['client_name']?.toString() ?? map['clientName']?.toString() ?? 'Noma\'lum mijoz',
      clientPhone: map['client_phone']?.toString() ?? map['clientPhone']?.toString() ?? '',
      totalDebt: total,
      paidAmount: paid,
      remainingDebt: remaining,
      dueDate: map['due_date']?.toString() ?? map['dueDate']?.toString() ?? '',
      status: map['status']?.toString() ?? 'active',
      isOverdue: map['is_overdue'] == true || map['isOverdue'] == 1,
      createdAt: map['created_at'] != null ? DateTime.tryParse(map['created_at'].toString()) ?? DateTime.now() : DateTime.now(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'tenantId': tenantId,
      'clientName': clientName,
      'clientPhone': clientPhone,
      'totalDebt': totalDebt,
      'paidAmount': paidAmount,
      'remainingDebt': remainingDebt,
      'dueDate': dueDate,
      'status': status,
      'isOverdue': isOverdue ? 1 : 0,
      'createdAt': createdAt.toIso8601String(),
    };
  }
}
