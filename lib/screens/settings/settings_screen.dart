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
    _urlController = TextEditingController(text: prov.serverUrl);
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

          // Server Connection Card
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
                          Icon(Icons.dns_rounded, color: AppColors.primary, size: 22),
                          SizedBox(width: 8),
                          Text(
                            'Kassa Server Manzili',
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
                              settingsProv.isServerOnline ? 'Online' : 'Offline',
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
                  const Text(
                    'Kafedagi lokal Wi-Fi kassa kompyuteri (masalan: http://192.168.1.5:4000/api)',
                    style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                  ),
                  const SizedBox(height: 14),
                  TextField(
                    controller: _urlController,
                    decoration: const InputDecoration(
                      hintText: 'http://192.168.1.5:4000/api',
                      prefixIcon: Icon(Icons.link, color: AppColors.textSecondary),
                    ),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _isSaving
                          ? null
                          : () async {
                              setState(() => _isSaving = true);
                              await settingsProv.updateServerUrl(_urlController.text.trim());
                              final online = await settingsProv.checkHealth();
                              setState(() => _isSaving = false);
                              if (context.mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text(online
                                        ? 'Kassa serveriga ulanish muvaffaqiyatli!'
                                        : 'Serverga ulanib bo\'lmadi. IP-manzilni tekshiring.'),
                                    backgroundColor: online ? AppColors.success : AppColors.error,
                                  ),
                                );
                              }
                            },
                      child: _isSaving
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                            )
                          : const Text('Saqlash va tekshirish'),
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
