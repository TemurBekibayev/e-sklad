import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/settings_provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/menu_provider.dart';
import '../../core/services/image_cache_service.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool _isSaving = false;
  bool _isSyncingImages = false;
  String? _syncImageResult;

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

          // Cloud Server Status Card
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
                            'Markaziy Bulut Serveri',
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
                  const SizedBox(height: 8),
                  const Text(
                    'https://getpos.uz',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppColors.primary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Holat: ${settingsProv.serverStatusLabel}',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                      color: settingsProv.isServerOnline ? AppColors.success : AppColors.error,
                    ),
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
                          : const Icon(Icons.refresh_rounded, size: 20),
                      label: Text(_isSaving ? 'Tekshirilmoqda...' : 'Server aloqasini tekshirish'),
                      onPressed: _isSaving
                          ? null
                          : () async {
                              setState(() => _isSaving = true);
                              final online = await settingsProv.checkHealth();
                              setState(() => _isSaving = false);
                              if (context.mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text(online
                                        ? 'Bulut serveri bilan aloqa yaxshi (Online)!'
                                        : 'Internet aloqasi yo\'q yoki server javob bermadi.'),
                                    backgroundColor: online ? AppColors.success : AppColors.error,
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

          // Wi-Fi Local Image Preload & Disk Caching Card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Expanded(
                        child: Row(
                          children: [
                            Icon(Icons.image_outlined, color: AppColors.primary, size: 22),
                            SizedBox(width: 8),
                            Flexible(
                              child: Text(
                                'Taom Rasmlari (Doimiy Kesh)',
                                style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.primaryLight,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Text(
                          '💾 Lokal Xotira',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: AppColors.primaryDark,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Barcha taomlar rasmlari telefoningizning doimiy xotirasiga (keshga) saqlab olinadi. Shundan so\'ng rasmlar doimo tez va internet trafigini sarflamasdan darhol ko\'rinadi.',
                    style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                  ),
                  const SizedBox(height: 12),
                  if (_syncImageResult != null) ...[
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: AppColors.tableFreeLight,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: AppColors.tableFree.withOpacity(0.3)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.check_circle, color: AppColors.tableFree, size: 18),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              _syncImageResult!,
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: AppColors.tableFree,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                  ],
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      icon: _isSyncingImages
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
                            )
                          : const Icon(Icons.download_for_offline_outlined, size: 20),
                      label: Text(
                        _isSyncingImages
                            ? 'Rasmlar telefon xotirasiga yuklanmoqda...'
                            : 'Rasmlarni yuklab olish (Keshga saqlash)',
                      ),
                      onPressed: _isSyncingImages
                          ? null
                          : () async {
                              setState(() {
                                _isSyncingImages = true;
                                _syncImageResult = null;
                              });

                              try {
                                final menuProv = context.read<MenuProvider>();
                                await menuProv.refresh();
                                final products = menuProv.allProducts;
                                final result = await ImageCacheService().preloadProductImages(products);
                                final cached = result['cached'] ?? 0;
                                final skipped = result['skipped'] ?? 0;

                                setState(() {
                                  _syncImageResult = '$cached ta taom rasmi telefon xotirasiga muvaffaqiyatli saqlandi!';
                                });

                                if (context.mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content: Text('$cached ta taom rasmi yuklandi ($skipped ta rasmsiz)'),
                                      backgroundColor: AppColors.success,
                                    ),
                                  );
                                }
                              } catch (e) {
                                if (context.mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content: Text('Xatolik: $e'),
                                      backgroundColor: AppColors.error,
                                    ),
                                  );
                                }
                              } finally {
                                if (mounted) {
                                  setState(() => _isSyncingImages = false);
                                }
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
