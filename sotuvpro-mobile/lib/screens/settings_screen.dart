import 'package:flutter/material.dart';
import '../models/user.dart';
import '../services/sync_service.dart';
import '../services/security_service.dart';
import '../services/kassa_hub_service.dart';
import '../theme/app_theme.dart';
import 'pin_setup_screen.dart';
import 'auth_screen.dart';

class SettingsScreen extends StatefulWidget {
  final User currentUser;

  const SettingsScreen({Key? key, required this.currentUser}) : super(key: key);

  @override
  _SettingsScreenState createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool _hasPin = false;
  final TextEditingController _hubIpController = TextEditingController();
  Map<String, dynamic>? _hubStatus;
  bool _isCheckingHub = false;

  @override
  void initState() {
    super.initState();
    _checkPinStatus();
    _loadHubIp();
  }

  Future<void> _loadHubIp() async {
    final ip = await KassaHubService.instance.getSavedHubIp();
    _hubIpController.text = ip;
    _pingHub(ip);
  }

  Future<void> _pingHub([String? customIp]) async {
    setState(() => _isCheckingHub = true);
    final status = await KassaHubService.instance.checkHubConnection(customIp ?? _hubIpController.text.trim());
    if (mounted) {
      setState(() {
        _hubStatus = status;
        _isCheckingHub = false;
      });
    }
  }

  Future<void> _saveHubIp() async {
    final ip = _hubIpController.text.trim();
    await KassaHubService.instance.saveHubIp(ip);
    await _pingHub(ip);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Desktop Kassa Hub IP manzili saqlandi!'),
          backgroundColor: AppTheme.primaryEmerald,
        ),
      );
    }
  }

  Future<void> _checkPinStatus() async {
    final hasPin = await SecurityService.instance.hasUserPin(widget.currentUser.id);
    if (mounted) {
      setState(() {
        _hasPin = hasPin;
      });
    }
  }

  void _openPinSetup() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => PinSetupScreen(
          userId: widget.currentUser.id,
          onPinSet: () {
            Navigator.pop(context);
            _checkPinStatus();
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('PIN-kod muvaffaqiyatli saqlandi!'),
                backgroundColor: AppTheme.primaryEmerald,
              ),
            );
          },
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.darkBackground,
      appBar: AppBar(
        title: const Text('Sozlamalar'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Profil kartasi
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  Row(
                    children: [
                      CircleAvatar(
                        radius: 28,
                        backgroundColor: AppTheme.primaryEmerald.withOpacity(0.2),
                        child: Text(
                          (widget.currentUser.name.isNotEmpty)
                              ? widget.currentUser.name.substring(0, 1).toUpperCase()
                              : 'U',
                          style: const TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.bold,
                            color: AppTheme.primaryEmerald,
                          ),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              widget.currentUser.name.isNotEmpty ? widget.currentUser.name : 'Xodim',
                              style: const TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                color: AppTheme.textPrimary,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Roli: ${(widget.currentUser.role.isNotEmpty ? widget.currentUser.role : "worker").toUpperCase()} (${widget.currentUser.tenantName.isNotEmpty ? widget.currentUser.tenantName : "SotuvPro Store"})',
                              style: const TextStyle(
                                fontSize: 13,
                                color: AppTheme.textSecondary,
                              ),
                            ),
                            Text(
                              'Tenant ID: ${widget.currentUser.tenantId.isNotEmpty ? widget.currentUser.tenantId : "tenant_default"}',
                              style: const TextStyle(
                                fontSize: 11,
                                color: AppTheme.textMuted,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const Divider(color: Color(0xFF334155), height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Nasiya Ruxsati:', style: TextStyle(fontSize: 11, color: AppTheme.textMuted)),
                          const SizedBox(height: 2),
                          Row(
                            children: [
                              Icon(
                                widget.currentUser.canSellOnDebt ? Icons.check_circle : Icons.cancel,
                                size: 16,
                                color: widget.currentUser.canSellOnDebt ? AppTheme.primaryEmerald : AppTheme.dangerRed,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                widget.currentUser.canSellOnDebt ? 'Mavjud' : 'Cheklangan',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.bold,
                                  color: widget.currentUser.canSellOnDebt ? AppTheme.primaryEmerald : AppTheme.dangerRed,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          const Text('Maksimal Qarz Limiti:', style: TextStyle(fontSize: 11, color: AppTheme.textMuted)),
                          const SizedBox(height: 2),
                          Text(
                            '${widget.currentUser.maxDebtLimit.toStringAsFixed(0)} UZS',
                            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppTheme.accentNeon),
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 20),

          // Xavfsizlik bo'limi
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 4, vertical: 8),
            child: Text(
              'XAVFSIZLIK',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: AppTheme.textMuted,
                letterSpacing: 1.0,
              ),
            ),
          ),
          Card(
            child: ListTile(
              leading: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppTheme.primaryEmerald.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.lock_outline, color: AppTheme.primaryEmerald),
              ),
              title: const Text(
                'PIN-Kod Xavfsizligi',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
              ),
              subtitle: Text(
                _hasPin ? 'PIN-kod o\'rnatilgan' : 'PIN-kod o\'rnatilmagan',
                style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
              ),
              trailing: ElevatedButton(
                onPressed: _openPinSetup,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                ),
                child: Text(_hasPin ? 'O\'zgartirish' : 'O\'rnatish'),
              ),
            ),
          ),
          const SizedBox(height: 20),

          // Desktop Kassa Hub Integratsiyasi (Port 8085)
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 4, vertical: 8),
            child: Text(
              'DO\'KONDAGI DESKTOP KASSA HUB (WI-FI PORT 8085)',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: AppTheme.textMuted,
                letterSpacing: 1.0,
              ),
            ),
          ),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: AppTheme.accentNeon.withOpacity(0.15),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(Icons.desktop_windows_outlined, color: AppTheme.accentNeon),
                      ),
                      const SizedBox(width: 12),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Desktop Kassa Hub IP',
                              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                            ),
                            Text(
                              'Savatlarni Kassir kompyuteriga uzatish uchun',
                              style: TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _hubIpController,
                    decoration: InputDecoration(
                      labelText: 'Kassa Hub IP manzili (Port: 8085)',
                      hintText: 'http://192.168.1.105:8085',
                      prefixIcon: const Icon(Icons.dns_outlined, color: AppTheme.accentNeon),
                      suffixIcon: IconButton(
                        icon: _isCheckingHub
                            ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.accentNeon))
                            : const Icon(Icons.sync, color: AppTheme.accentNeon),
                        tooltip: 'Aloqani tekshirish',
                        onPressed: _saveHubIp,
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                  if (_hubStatus != null)
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: _hubStatus!['is_connected'] == true
                            ? AppTheme.primaryEmerald.withOpacity(0.15)
                            : AppTheme.dangerRed.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: _hubStatus!['is_connected'] == true ? AppTheme.primaryEmerald : AppTheme.dangerRed,
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            _hubStatus!['is_connected'] == true ? Icons.check_circle_outline : Icons.error_outline,
                            color: _hubStatus!['is_connected'] == true ? AppTheme.primaryEmerald : AppTheme.dangerRed,
                            size: 20,
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  _hubStatus!['is_connected'] == true
                                      ? 'Ulandi: ${_hubStatus!['store_name']}'
                                      : 'Kassa Hub topilmadi. IP manzilini va Wi-Fi aloqani tekshiring.',
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                    color: _hubStatus!['is_connected'] == true ? AppTheme.primaryEmerald : AppTheme.dangerRed,
                                  ),
                                ),
                                if (_hubStatus!['is_connected'] == true)
                                  Text(
                                    'Faol smena: ${_hubStatus!['active_shift_user']}',
                                    style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                                  ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  const SizedBox(height: 8),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: _saveHubIp,
                      icon: const Icon(Icons.save, size: 18),
                      label: const Text('Saqlash va Ping Tekshirish'),
                      style: ElevatedButton.styleFrom(backgroundColor: AppTheme.accentNeon, foregroundColor: Colors.black),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 20),

          // Tarmoq va Sinxronizatsiya
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 4, vertical: 8),
            child: Text(
              'TARMOQ VA SINXRONIZATSIYA',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: AppTheme.textMuted,
                letterSpacing: 1.0,
              ),
            ),
          ),
          Card(
            child: Column(
              children: [
                StreamBuilder<bool>(
                  stream: SyncService.instance.onNetworkStatusChanged,
                  initialData: SyncService.instance.isOnline,
                  builder: (context, snapshot) {
                    final isOnline = snapshot.data ?? true;
                    return SwitchListTile(
                      value: isOnline,
                      onChanged: (val) {
                        SyncService.instance.setOnlineStatus(val);
                      },
                      secondary: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: (isOnline ? AppTheme.primaryEmerald : AppTheme.warningOrange).withOpacity(0.15),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Icon(
                          isOnline ? Icons.wifi : Icons.wifi_off,
                          color: isOnline ? AppTheme.primaryEmerald : AppTheme.warningOrange,
                        ),
                      ),
                      title: const Text(
                        'Online Rejim',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                      ),
                      subtitle: Text(
                        isOnline ? 'Server bilan ulangan' : 'Mahalliy (Offline) rejim',
                        style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                      ),
                      activeColor: AppTheme.primaryEmerald,
                    );
                  },
                ),
                const Divider(height: 1, color: Color(0xFF334155)),
                ListTile(
                  leading: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppTheme.accentCyan.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.sync, color: AppTheme.accentCyan),
                  ),
                  title: const Text(
                    'Hozir Sinxronlash',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                  ),
                  subtitle: const Text(
                    'Mahalliy ma\'lumotlarni serverga yuborish',
                    style: TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                  ),
                  onTap: () async {
                    await SyncService.instance.triggerBackgroundSync();
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Sinxronizatsiya yakunlandi!'),
                          backgroundColor: AppTheme.primaryEmerald,
                        ),
                      );
                    }
                  },
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // PRINTER VA HUJJATLAR
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 4, vertical: 8),
            child: Text(
              'PRINTER VA CHOP ETISH',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: AppTheme.textMuted,
                letterSpacing: 1.0,
              ),
            ),
          ),
          Card(
            child: ListTile(
              leading: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppTheme.infoBlue.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.print_outlined, color: AppTheme.infoBlue),
              ),
              title: const Text(
                'Chek Printerini Sinash',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
              ),
              subtitle: const Text(
                'Test chekini shakllantirish va chop etish',
                style: TextStyle(fontSize: 12, color: AppTheme.textSecondary),
              ),
              onTap: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Printer tayyor holatda'),
                    backgroundColor: AppTheme.infoBlue,
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 20),

          // TIZIM
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 4, vertical: 8),
            child: Text(
              'TIZIM',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: AppTheme.textMuted,
                letterSpacing: 1.0,
              ),
            ),
          ),
          Card(
            child: Column(
              children: [
                const ListTile(
                  leading: Icon(Icons.info_outline, color: AppTheme.textSecondary),
                  title: Text('Ilova versiyasi', style: TextStyle(fontSize: 14)),
                  trailing: Text(
                    'v1.0.0',
                    style: TextStyle(color: AppTheme.textMuted, fontWeight: FontWeight.bold),
                  ),
                ),
                const Divider(height: 1, color: Color(0xFF334155)),
                ListTile(
                  leading: const Icon(Icons.logout, color: AppTheme.dangerRed),
                  title: const Text(
                    'Tizimdan chiqish',
                    style: TextStyle(color: AppTheme.dangerRed, fontWeight: FontWeight.bold, fontSize: 15),
                  ),
                  onTap: () {
                    Navigator.pushReplacement(
                      context,
                      MaterialPageRoute(builder: (context) => const AuthScreen()),
                    );
                  },
                ),
              ],
            ),
          ),
          const SizedBox(height: 30),
        ],
      ),
    );
  }
}
