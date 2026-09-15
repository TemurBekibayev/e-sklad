class Waiter {
  final String id;
  final String name;
  final String role;
  final String? tenantId;
  final String? tenantName;
  final String? phone;
  final String? email;
  final String? pin;
  final bool isShiftOpen;
  final String? avatarUrl;

  Waiter({
    required this.id,
    required this.name,
    this.role = 'waiter',
    this.tenantId,
    this.tenantName,
    this.phone,
    this.email,
    this.pin,
    this.isShiftOpen = true,
    this.avatarUrl,
  });

  String get displayRole {
    switch (role.toLowerCase()) {
      case 'manager':
        return 'Boshqaruvchi';
      case 'cashier':
        return 'Kassir';
      case 'cook':
        return 'Oshpaz';
      case 'waiter':
      default:
        return 'Ofitsiant';
    }
  }

  factory Waiter.fromJson(Map<String, dynamic> json) {
    final shiftVal = json['is_shift_open'] ?? json['isShiftOpen'] ?? 1;
    final isOpen = shiftVal == 1 || shiftVal == true;

    return Waiter(
      id: json['id']?.toString() ?? json['userId']?.toString() ?? '',
      name: json['name'] ?? json['username'] ?? '',
      role: json['role'] ?? 'waiter',
      tenantId: json['tenantId']?.toString() ?? json['tenant_id']?.toString(),
      tenantName: json['tenantName'] ?? json['tenant_name'],
      phone: json['phone'] ?? json['phone_number'],
      email: json['email'],
      isShiftOpen: isOpen,
      avatarUrl: json['avatar_url'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'role': role,
      'tenantId': tenantId,
      'tenantName': tenantName,
      'phone': phone,
      'email': email,
      'is_shift_open': isShiftOpen ? 1 : 0,
      'avatar_url': avatarUrl,
    };
  }
}
