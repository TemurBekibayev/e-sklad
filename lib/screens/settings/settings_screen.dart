import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_theme.dart';
import '../../providers/auth_provider.dart';
import '../../providers/menu_provider.dart';
import '../../providers/settings_provider.dart';
import '../../providers/tables_provider.dart';
import '../auth/login_screen.dart';
import 'widgets/waiter_stats_sheet.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool _isSyncing = false;

  Future<void> _handleSyncAll(SettingsProvider settingsProv) async {
    setState(() => _isSyncing = true);
    try {
      final tablesProv = context.read<TablesProvider>();
      final menuProv = context.read<MenuProvider>();

      await Future.wait([
        tablesProv.refresh(),
        menuProv.refresh(),
      ]);

      if (mounted) {
        if (settingsProv.isHapticEnabled) {
          HapticFeedback.mediumImpact();
        }
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.check_circle, color: Colors.white),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    settingsProv.tr('sync_success'),
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
            backgroundColor: AppColors.success,
            duration: const Duration(seconds: 3),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('${settingsProv.tr('sync_error')}: $e'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSyncing = false);
      }
    }
  }

  void _showLanguageDialog(BuildContext context, SettingsProvider settingsProv) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                  child: Text(
                    settingsProv.tr('language'),
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                ),
                const Divider(),
                _buildLangTile(ctx, settingsProv, 'uz', '🇺🇿 O\'zbekcha (Lotin)'),
                _buildLangTile(ctx, settingsProv, 'oz', '🇺🇿 Ўзбекча (Кирилл)'),
                _buildLangTile(ctx, settingsProv, 'ru', '🇷🇺 Русский'),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildLangTile(BuildContext ctx, SettingsProvider settingsProv, String code, String title) {
    final isSelected = settingsProv.language == code;
    return ListTile(
      title: Text(
        title,
        style: TextStyle(
          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
          color: isSelected ? AppColors.primary : AppColors.textPrimary,
        ),
      ),
      trailing: isSelected ? const Icon(Icons.check_circle, color: AppColors.primary) : null,
      onTap: () async {
        await settingsProv.setLanguage(code);
        if (settingsProv.isHapticEnabled) {
          HapticFeedback.selectionClick();
        }
        if (ctx.mounted) Navigator.pop(ctx);
      },
    );
  }

  void _confirmLogout(BuildContext context, SettingsProvider settingsProv) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Row(
          children: [
            const Icon(Icons.logout, color: AppColors.error),
            const SizedBox(width: 8),
            Text(settingsProv.tr('logout_confirm_title')),
          ],
        ),
        content: Text(settingsProv.tr('logout_confirm_msg')),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text(settingsProv.tr('cancel')),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.error,
              foregroundColor: Colors.white,
            ),
            onPressed: () async {
              Navigator.pop(ctx);
              final auth = context.read<AuthProvider>();
              await auth.logout();
              if (context.mounted) {
                Navigator.pushAndRemoveUntil(
                  context,
                  MaterialPageRoute(builder: (_) => const LoginScreen()),
                  (route) => false,
                );
              }
            },
            child: Text(settingsProv.tr('exit')),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final settingsProv = context.watch<SettingsProvider>();
    final authProv = context.watch<AuthProvider>();
    final waiter = authProv.currentWaiter;

    String currentLangLabel = '🇺🇿 O\'zbekcha';
    if (settingsProv.language == 'oz') {
      currentLangLabel = '🇺🇿 Ўзбекча';
    } else if (settingsProv.language == 'ru') {
      currentLangLabel = '🇷🇺 Русский';
    }

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(
          settingsProv.tr('settings'),
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Active Waiter & Shift Card
          if (waiter != null) ...[
            Card(
              elevation: 1,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 28,
                      backgroundColor: AppColors.primaryLight,
                      child: Text(
                        waiter.name.isNotEmpty ? waiter.name[0].toUpperCase() : 'O',
                        style: const TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                          color: AppColors.primaryDark,
                        ),
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            waiter.name,
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '${settingsProv.tr('role')}: ${waiter.displayRole} • ${waiter.tenantName ?? "Restoran"}',
                            style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                          ),
                          const SizedBox(height: 6),
                          Row(
                            children: [
                              Container(
                                width: 9,
                                height: 9,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: waiter.isShiftOpen ? AppColors.tableFree : AppColors.tableBusy,
                                ),
                              ),
                              const SizedBox(width: 6),
                              Text(
                                waiter.isShiftOpen ? settingsProv.tr('shift_open') : settingsProv.tr('shift_closed'),
                                style: TextStyle(
                                  fontSize: 12,
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
            const SizedBox(height: 16),
          ],

          // Daily Stats Card (Bugungi hisobotim)
          Card(
            elevation: 1,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            child: InkWell(
              borderRadius: BorderRadius.circular(16),
              onTap: () {
                if (settingsProv.isHapticEnabled) {
                  HapticFeedback.selectionClick();
                }
                showModalBottomSheet(
                  context: context,
                  isScrollControlled: true,
                  backgroundColor: Colors.transparent,
                  builder: (_) => const WaiterStatsSheet(),
                );
              },
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.blue.shade50,
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: const Icon(Icons.analytics_rounded, color: Colors.blue, size: 26),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            settingsProv.tr('daily_stats'),
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 3),
                          Text(
                            '${settingsProv.tr('total_sales')}, ${settingsProv.tr('tables_served').toLowerCase()}...',
                            style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                          ),
                        ],
                      ),
                    ),
                    const Icon(Icons.arrow_forward_ios_rounded, size: 16, color: AppColors.textMuted),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 16),

          // App Settings & Preferences
          Card(
            elevation: 1,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                  child: Text(
                    settingsProv.tr('app_appearance'),
                    style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.primary),
                  ),
                ),

                // 1. Language selector
                ListTile(
                  leading: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppColors.primaryLight,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.language_rounded, color: AppColors.primaryDark, size: 22),
                  ),
                  title: Text(
                    settingsProv.tr('language'),
                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                  ),
                  subtitle: Text(
                    currentLangLabel,
                    style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                  ),
                  trailing: const Icon(Icons.keyboard_arrow_right_rounded, color: AppColors.textMuted),
                  onTap: () => _showLanguageDialog(context, settingsProv),
                ),

                const Divider(height: 1),

                // 2. Menu View Layout selector (2-col, 3-col, list)
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: AppColors.primaryLight,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Icon(Icons.grid_view_rounded, color: AppColors.primaryDark, size: 22),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  settingsProv.tr('menu_view'),
                                  style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  settingsProv.tr('menu_view_desc'),
                                  style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      SegmentedButton<String>(
                        segments: [
                          ButtonSegment(
                            value: 'grid2',
                            label: Text(settingsProv.tr('grid2'), style: const TextStyle(fontSize: 11)),
                            icon: const Icon(Icons.grid_view, size: 16),
                          ),
                          ButtonSegment(
                            value: 'grid3',
                            label: Text(settingsProv.tr('grid3'), style: const TextStyle(fontSize: 11)),
                            icon: const Icon(Icons.apps_rounded, size: 16),
                          ),
                          ButtonSegment(
                            value: 'list',
                            label: Text(settingsProv.tr('list'), style: const TextStyle(fontSize: 11)),
                            icon: const Icon(Icons.view_list_rounded, size: 16),
                          ),
                        ],
                        selected: {settingsProv.menuLayout},
                        onSelectionChanged: (Set<String> newSelection) {
                          settingsProv.setMenuLayout(newSelection.first);
                          if (settingsProv.isHapticEnabled) {
                            HapticFeedback.selectionClick();
                          }
                        },
                      ),
                    ],
                  ),
                ),

                const Divider(height: 1),

                // 3. Vibration / Haptic Feedback Toggle
                SwitchListTile(
                  secondary: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppColors.primaryLight,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.vibration_rounded, color: AppColors.primaryDark, size: 22),
                  ),
                  title: Text(
                    settingsProv.tr('haptic'),
                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                  ),
                  subtitle: Text(
                    settingsProv.tr('haptic_desc'),
                    style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                  ),
                  value: settingsProv.isHapticEnabled,
                  onChanged: (val) {
                    settingsProv.setHapticEnabled(val);
                    if (val) {
                      HapticFeedback.mediumImpact();
                    }
                  },
                ),

                const Divider(height: 1),

                // 4. Kitchen / Ready Dishes Notification Toggle
                SwitchListTile(
                  secondary: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppColors.primaryLight,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.notifications_active_rounded, color: AppColors.primaryDark, size: 22),
                  ),
                  title: Text(
                    settingsProv.tr('kitchen_notify'),
                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                  ),
                  subtitle: Text(
                    settingsProv.tr('kitchen_notify_desc'),
                    style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                  ),
                  value: settingsProv.isKitchenNotificationEnabled,
                  onChanged: (val) {
                    settingsProv.setKitchenNotificationEnabled(val);
                    if (val) {
                      HapticFeedback.mediumImpact();
                    }
                  },
                ),

                const Divider(height: 1),

                // 5. Dark Mode Toggle
                SwitchListTile(
                  secondary: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: settingsProv.isDarkMode ? Colors.amber.withOpacity(0.2) : AppColors.primaryLight,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(
                      settingsProv.isDarkMode ? Icons.nightlight_round : Icons.dark_mode_outlined,
                      color: settingsProv.isDarkMode ? Colors.amber : AppColors.primaryDark,
                      size: 22,
                    ),
                  ),
                  title: Text(
                    settingsProv.tr('dark_mode'),
                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                  ),
                  subtitle: Text(
                    settingsProv.tr('dark_mode_desc'),
                    style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                  ),
                  value: settingsProv.isDarkMode,
                  onChanged: (val) {
                    settingsProv.setDarkMode(val);
                    if (settingsProv.isHapticEnabled) {
                      HapticFeedback.mediumImpact();
                    }
                  },
                ),

                const Divider(height: 1),

                // 6. Color Themes (Multiple themes)
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: AppColors.primaryLight,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Icon(Icons.palette_rounded, color: AppColors.primaryDark, size: 22),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  settingsProv.tr('color_theme'),
                                  style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  settingsProv.currentPalette.getName(settingsProv.language),
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                    color: settingsProv.currentPalette.primary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: AppTheme.availablePalettes.map((palette) {
                          final isSelected = settingsProv.colorTheme == palette.id;
                          return InkWell(
                            onTap: () {
                              settingsProv.setColorTheme(palette.id);
                              if (settingsProv.isHapticEnabled) {
                                HapticFeedback.selectionClick();
                              }
                            },
                            borderRadius: BorderRadius.circular(25),
                            child: AnimatedContainer(
                              duration: const Duration(milliseconds: 200),
                              width: 44,
                              height: 44,
                              decoration: BoxDecoration(
                                color: palette.primary,
                                shape: BoxShape.circle,
                                border: Border.all(
                                  color: isSelected ? Colors.white : Colors.transparent,
                                  width: 3,
                                ),
                                boxShadow: [
                                  BoxShadow(
                                    color: palette.primary.withOpacity(isSelected ? 0.45 : 0.2),
                                    blurRadius: isSelected ? 8 : 4,
                                    offset: const Offset(0, 2),
                                  ),
                                ],
                              ),
                              child: isSelected
                                  ? const Icon(Icons.check_rounded, color: Colors.white, size: 22)
                                  : null,
                            ),
                          );
                        }).toList(),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Server Data & Menu Sync Card
          Card(
            elevation: 1,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.sync_rounded, color: AppColors.primary, size: 22),
                      const SizedBox(width: 8),
                      Text(
                        settingsProv.tr('data_sync'),
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    settingsProv.tr('data_sync_desc'),
                    style: const TextStyle(fontSize: 13, color: AppColors.textSecondary, height: 1.3),
                  ),
                  const SizedBox(height: 14),
                  SizedBox(
                    width: double.infinity,
                    height: 46,
                    child: ElevatedButton.icon(
                      icon: _isSyncing
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                            )
                          : const Icon(Icons.cloud_sync_outlined, size: 20),
                      label: Text(
                        _isSyncing ? settingsProv.tr('syncing') : settingsProv.tr('sync_btn'),
                        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                      ),
                      onPressed: _isSyncing ? null : () => _handleSyncAll(settingsProv),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Logout Action Card
          Card(
            elevation: 1,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            child: ListTile(
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              leading: Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppColors.error.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.logout_rounded, color: AppColors.error, size: 22),
              ),
              title: Text(
                settingsProv.tr('logout'),
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 15,
                  color: AppColors.error,
                ),
              ),
              subtitle: Text(
                settingsProv.tr('logout_desc'),
                style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
              ),
              trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 16, color: AppColors.textMuted),
              onTap: () => _confirmLogout(context, settingsProv),
            ),
          ),
          const SizedBox(height: 28),

          // App Info
          Center(
            child: Column(
              children: [
                Text(
                  settingsProv.tr('app_subtitle'),
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                ),
                const SizedBox(height: 3),
                Text(
                  settingsProv.tr('app_version'),
                  style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.tableFreeLight,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.bolt_rounded, size: 14, color: AppColors.tableFree),
                      const SizedBox(width: 4),
                      Text(
                        settingsProv.tr('cache_status'),
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: AppColors.tableFree,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
