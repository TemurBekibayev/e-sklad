import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/settings_provider.dart';
import '../../providers/auth_provider.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  late TextEditingController _urlController;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    final prov = context.read<SettingsProvider>();
    _urlController = TextEditingController(text: prov.localKassaUrl);
  }

  @override
  void dispose() {
    _urlController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final settingsProv = context.watch<SettingsProvider>();
    final authProv = context.watch<AuthProvider>();
    final waiter = authProv.currentWaiter;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text(
          'Kassa va Tizim Sozlamalari',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Active Waiter & Shift Card (if logged in)
          if (waiter != null) ...[
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 24,
                      backgroundColor: AppColors.primaryLight,
                      child: Text(
                        waiter.name.isNotEmpty ? waiter.name[0].toUpperCase() : 'O',
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.primaryDark),
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            waiter.name,
                            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Lavozim: ${waiter.displayRole} • ${waiter.tenantName ?? "Test Kafe"}',
                            style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                          ),
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              Container(
                                width: 8,
                                height: 8,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: waiter.isShiftOpen ? AppColors.tableFree : AppColors.tableBusy,
                                ),
                              ),
                              const SizedBox(width: 6),
                              Text(
                                waiter.isShiftOpen ? 'Smena ochiq' : 'Smena yopiq',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                  color: waiter.isShiftOpen ? AppColors.tableFree : AppColors.tableBusy,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 14),
          ],

          // Cloud First Master Card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Row(
                        children: [
                          Icon(Icons.cloud_done_rounded, color: AppColors.primary, size: 22),
                          SizedBox(width: 8),
                          Text(
                            'Asosiy Bulut Baza',
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.tableFreeLight,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Text(
                          '☁️ Cloud First',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: AppColors.tableFree,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'https://getpos.uz/api/v1/cafe',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppColors.primary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Ilova doimo internet orqali to\'g\'ridan-to\'g\'ri ushbu markaziy bazaga ulanib ishlaydi.',
                    style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 14),

          // Backup Local Kassa Wi-Fi Card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Row(
                        children: [
                          Icon(Icons.wifi_rounded, color: AppColors.tableFree, size: 22),
                          SizedBox(width: 8),
                          Text(
                            'Zaxira Kassa IP (Wi-Fi)',
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: settingsProv.isServerOnline
                              ? AppColors.tableFreeLight
                              : AppColors.tableBusyLight,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              width: 8,
                              height: 8,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: settingsProv.isServerOnline
                                    ? AppColors.tableFree
                                    : AppColors.tableBusy,
                              ),
                            ),
                            const SizedBox(width: 6),
                            Text(
                              settingsProv.isServerOnline ? 'Faol' : 'Offline',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: settingsProv.isServerOnline
                                    ? AppColors.tableFree
                                    : AppColors.tableBusy,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Joriy ulanish: ${settingsProv.serverStatusLabel}',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: settingsProv.isServerOnline ? AppColors.success : AppColors.error,
                    ),
                  ),
                  const SizedBox(height: 14),
                  TextField(
                    controller: _urlController,
                    decoration: const InputDecoration(
                      labelText: 'Lokal Kassa IP-manzili',
                      hintText: '192.168.1.8 yoki http://192.168.1.8:4000/api',
                      prefixIcon: Icon(Icons.router_rounded, color: AppColors.textSecondary),
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Internet o\'chib qolsa, ilova avtomatik ravishda ushbu Kassa kompyuteriga Wi-Fi orqali ulanadi va uzluksiz ishlashni ta\'minlaydi.',
                    style: TextStyle(fontSize: 11, color: AppColors.textSecondary),
                  ),
                  const SizedBox(height: 14),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      icon: _isSaving
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                            )
                          : const Icon(Icons.check_circle_outline, size: 20),
                      label: Text(_isSaving ? 'Tekshirilmoqda...' : 'Saqlash va Ulanishni tekshirish'),
                      onPressed: _isSaving
                          ? null
                          : () async {
                              setState(() => _isSaving = true);
                              await settingsProv.updateLocalKassaUrl(_urlController.text.trim());
                              final online = await settingsProv.checkHealth();
                              setState(() => _isSaving = false);
                              if (context.mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text(online
                                        ? 'Sozlamalar saqlandi! ${settingsProv.serverStatusLabel}'
                                        : 'Sozlamalar saqlandi. Tarmoq tekshirildi.'),
                                    backgroundColor: online ? AppColors.success : AppColors.info,
                                  ),
                                );
                              }
                            },
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 14),

          // Demo Mode Toggle Card
          Card(
            child: SwitchListTile(
              secondary: const Icon(Icons.science_outlined, color: AppColors.warning),
              title: const Text(
                'Demo / Oflayn rejim',
                style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
              ),
              subtitle: const Text(
                'Kassa kompyuteriga ulanmagan paytda namunaviy ma\'lumotlar bilan ishlash',
                style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
              ),
              value: settingsProv.useMockData,
              onChanged: (val) {
                settingsProv.toggleMockData(val);
              },
            ),
          ),
          const SizedBox(height: 20),

          // App Info
          const Center(
            child: Column(
              children: [
                Text(
                  'GetPOS Kafe — Ofitsiant Mobil Ilovasi',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                ),
                SizedBox(height: 2),
                Text(
                  'Versiya 2.1 (Lokal Kassa API)',
                  style: TextStyle(fontSize: 11, color: AppColors.textMuted),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
