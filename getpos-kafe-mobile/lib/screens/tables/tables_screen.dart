import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../core/network/api_service.dart';
import '../../core/network/server_discovery_service.dart';
import '../../models/hall_table.dart';
import '../../providers/auth_provider.dart';
import '../../providers/tables_provider.dart';
import '../../providers/order_provider.dart';
import '../auth/login_screen.dart';
import '../order/order_screen.dart';
import '../settings/settings_screen.dart';
import 'widgets/hall_tab_bar.dart';
import 'widgets/table_card.dart';

class TablesScreen extends StatefulWidget {
  const TablesScreen({super.key});

  @override
  State<TablesScreen> createState() => _TablesScreenState();
}

class _TablesScreenState extends State<TablesScreen> {
  Timer? _refreshTimer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<TablesProvider>().init();
    });
    _refreshTimer = Timer.periodic(const Duration(seconds: 4), (_) {
      if (mounted) {
        context.read<TablesProvider>().refresh();
      }
    });
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final tablesProv = context.watch<TablesProvider>();
    final waiterName = auth.currentWaiter?.name ?? 'Ofitsiyant';

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        leading: Padding(
          padding: const EdgeInsets.only(left: 12.0, top: 8.0, bottom: 8.0, right: 4.0),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: Image.asset(
              'assets/logo.png',
              fit: BoxFit.contain,
              errorBuilder: (_, __, ___) => const Icon(Icons.restaurant, color: AppColors.primary),
            ),
          ),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              waiterName,
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            ValueListenableBuilder<ServerConnectionType>(
              valueListenable: ApiService().connectionStatusNotifier,
              builder: (context, mode, _) {
                String label;
                Color dotColor;
                if (mode == ServerConnectionType.cloud) {
                  label = '☁️ Bulut (Online)';
                  dotColor = AppColors.success;
                } else if (mode == ServerConnectionType.local) {
                  label = '💻 Wi-Fi Kassa';
                  dotColor = AppColors.primary;
                } else {
                  label = '⚠️ Oflayn';
                  dotColor = AppColors.warning;
                }

                return Row(
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        color: dotColor,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      label,
                      style: TextStyle(
                        fontSize: 12,
                        color: dotColor,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                );
              },
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: AppColors.textPrimary),
            tooltip: 'Yangilash',
            onPressed: () => tablesProv.refresh(),
          ),
          IconButton(
            icon: const Icon(Icons.settings_outlined, color: AppColors.textPrimary),
            tooltip: 'Sozlamalar',
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const SettingsScreen()),
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.logout, color: AppColors.error),
            tooltip: 'Chiqish',
            onPressed: () {
              showDialog(
                context: context,
                builder: (ctx) => AlertDialog(
                  title: const Text('Tizimdan chiqish'),
                  content: const Text('Haqiqatan ham smenani tark etmoqchimisiz?'),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.pop(ctx),
                      child: const Text('Yo\'q'),
                    ),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
                      onPressed: () {
                        Navigator.pop(ctx);
                        auth.logout();
                        Navigator.pushReplacement(
                          context,
                          MaterialPageRoute(builder: (_) => const LoginScreen()),
                        );
                      },
                      child: const Text('Chiqish'),
                    ),
                  ],
                ),
              );
            },
          ),
        ],
      ),
      body: tablesProv.isLoading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                // Quick Statistics / Status Filter Bar
                _buildFilterChips(tablesProv),

                // Halls Tabs
                if (tablesProv.halls.isNotEmpty)
                  HallTabBar(
                    halls: tablesProv.halls,
                    selectedHallId: tablesProv.selectedHallName,
                    onSelectHall: (id) => tablesProv.selectHall(id ?? 'Barchasi'),
                  ),

                // Tables Grid
                Expanded(
                  child: RefreshIndicator(
                    onRefresh: () => tablesProv.refresh(),
                    child: _buildTableGrid(tablesProv, auth),
                  ),
                ),
              ],
            ),
    );
  }

  Widget _buildFilterChips(TablesProvider prov) {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: [
            _buildChip(
              label: 'Barchasi',
              count: null,
              isSelected: prov.filterStatus == null,
              onTap: () => prov.setFilterStatus(null),
              activeColor: AppColors.primary,
            ),
            const SizedBox(width: 8),
            _buildChip(
              label: 'Bo\'sh',
              count: prov.freeTablesCount,
              isSelected: prov.filterStatus == TableStatus.free,
              onTap: () => prov.setFilterStatus(TableStatus.free),
              activeColor: AppColors.tableFree,
            ),
            const SizedBox(width: 8),
            _buildChip(
              label: 'Band',
              count: prov.busyTablesCount,
              isSelected: prov.filterStatus == TableStatus.busy,
              onTap: () => prov.setFilterStatus(TableStatus.busy),
              activeColor: AppColors.tableBusy,
            ),
            const SizedBox(width: 8),
            _buildChip(
              label: 'Hisob',
              count: prov.billTablesCount,
              isSelected: prov.filterStatus == TableStatus.billRequested,
              onTap: () => prov.setFilterStatus(TableStatus.billRequested),
              activeColor: AppColors.tableBill,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildChip({
    required String label,
    required int? count,
    required bool isSelected,
    required VoidCallback onTap,
    required Color activeColor,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? activeColor.withOpacity(0.12) : AppColors.background,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? activeColor : AppColors.border,
            width: isSelected ? 1.5 : 1,
          ),
        ),
        child: Row(
          children: [
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                color: isSelected ? activeColor : AppColors.textSecondary,
              ),
            ),
            if (count != null) ...[
              const SizedBox(width: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                decoration: BoxDecoration(
                  color: isSelected ? activeColor : AppColors.textMuted.withOpacity(0.3),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  '$count',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    color: isSelected ? Colors.white : AppColors.textPrimary,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildTableGrid(TablesProvider prov, AuthProvider auth) {
    final tables = prov.filteredTables;

    if (tables.isEmpty) {
      return const Center(
        child: Text(
          'Bu bo\'limda stollar topilmadi',
          style: TextStyle(color: AppColors.textSecondary),
        ),
      );
    }

    return LayoutBuilder(
      builder: (context, constraints) {
        final crossAxisCount = constraints.maxWidth > 600 ? 4 : 2;
        return GridView.builder(
          padding: const EdgeInsets.all(16),
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: crossAxisCount,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            childAspectRatio: 1.15,
          ),
          itemCount: tables.length,
          itemBuilder: (context, index) {
            final table = tables[index];
            return TableCard(
              table: table,
              onTap: () {
                final waiter = auth.currentWaiter;
                context.read<OrderProvider>().openTableOrder(
                      table,
                      waiter?.name ?? 'Ofitsiyant',
                      waiter?.id ?? '1',
                    );
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const OrderScreen()),
                );
              },
            );
          },
        );
      },
    );
  }
}
