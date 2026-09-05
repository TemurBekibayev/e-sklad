import 'package:flutter/material.dart';
import '../models/user.dart';
import '../services/sync_service.dart';
import '../services/security_service.dart';
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

  @override
  void initState() {
    super.initState();
    _checkPinStatus();
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
