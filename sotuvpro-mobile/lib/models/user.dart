class User {
  final String id;
  final String tenantId; // 2.1 - Multi-tenant isolation
  final String tenantName;
  final String name;
  final String? phoneNumber;
  final String pinHash;  // 1.1 - PIN Hash (hech qachon ochiq matnda saqlanmaydi)
  final String role;     // 'worker', 'manager'
  final String avatarUrl;
  final bool isActive;
  final bool canSellOnDebt;
  final double maxDebtLimit;

  User({
    required this.id,
    required this.tenantId,
    this.tenantName = 'SotuvPro Store',
    required this.name,
    this.phoneNumber,
    required this.pinHash,
    required this.role,
    required this.avatarUrl,
    this.isActive = true,
    this.canSellOnDebt = true,
    this.maxDebtLimit = 1500000.0,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'tenantId': tenantId,
      'tenantName': tenantName,
      'name': name,
      'phoneNumber': phoneNumber ?? '',
      'pinHash': pinHash,
      'role': role,
      'avatarUrl': avatarUrl,
      'isActive': isActive ? 1 : 0,
      'canSellOnDebt': canSellOnDebt ? 1 : 0,
      'maxDebtLimit': maxDebtLimit,
    };
  }

  factory User.fromMap(Map<String, dynamic> map) {
    return User(
      id: map['id']?.toString() ?? 'u_default',
      tenantId: map['tenantId']?.toString() ?? map['tenant_id']?.toString() ?? 'tenant_default',
      tenantName: map['tenantName']?.toString() ?? map['tenant_name']?.toString() ?? 'SotuvPro Store',
      name: map['name']?.toString() ?? 'Xodim',
      phoneNumber: map['phoneNumber']?.toString() ?? map['phone_number']?.toString(),
      pinHash: map['pinHash']?.toString() ?? map['pin']?.toString() ?? '',
      role: map['role']?.toString() ?? 'worker',
      avatarUrl: map['avatarUrl']?.toString() ?? '',
      isActive: map['isActive'] == 1 || map['isActive'] == true || map['is_active'] == true,
      canSellOnDebt: map['canSellOnDebt'] == 1 || map['canSellOnDebt'] == true || map['can_sell_on_debt'] == true || map['can_sell_on_debt'] == null,
      maxDebtLimit: double.tryParse(map['maxDebtLimit']?.toString() ?? map['max_debt_limit']?.toString() ?? '1500000') ?? 1500000.0,
    );
  }
}

