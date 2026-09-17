import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/utils/transliteration_helper.dart';
import '../../../core/localization/app_translations.dart';
import '../../../providers/settings_provider.dart';
import '../../../models/hall_table.dart';
import '../../../models/order.dart';
import 'table_status_badge.dart';

class TableCard extends StatelessWidget {
  final RestaurantTable table;
  final VoidCallback onTap;

  const TableCard({
    super.key,
    required this.table,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final lang = context.watch<SettingsProvider>().currentLanguage;
    Color borderColor;
    Color topBarColor;

    switch (table.status) {
      case TableStatus.free:
        borderColor = AppColors.tableFree.withOpacity(0.3);
        topBarColor = AppColors.tableFree;
        break;
      case TableStatus.busy:
        borderColor = AppColors.tableBusy.withOpacity(0.3);
        topBarColor = AppColors.tableBusy;
        break;
      case TableStatus.billRequested:
        borderColor = AppColors.tableBill.withOpacity(0.4);
        topBarColor = AppColors.tableBill;
        break;
      case TableStatus.reserved:
        borderColor = AppColors.tableReserved.withOpacity(0.3);
        topBarColor = AppColors.tableReserved;
        break;
    }

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: borderColor, width: 1.5),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.04),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Top Color Indicator Bar
              Container(
                height: 5,
                decoration: BoxDecoration(
                  color: topBarColor,
                  borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(14),
                    topRight: Radius.circular(14),
                  ),
                ),
              ),

              Expanded(
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      // Header: Table Number & Seats
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Flexible(
                            child: Text(
                              TransliterationHelper.adapt(table.number, lang),
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: AppColors.textPrimary,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          Row(
                            children: [
                              const Icon(Icons.people_outline, size: 15, color: AppColors.textSecondary),
                              const SizedBox(width: 3),
                              Text(
                                '${table.seats}',
                                style: const TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.textSecondary,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),

                      // Status Badge & Open Duration
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          TableStatusBadge(status: table.status, isSmall: true),
                          if (table.openedAt != null && table.status != TableStatus.free)
                            Text(
                              Formatters.formatDurationFrom(table.openedAt),
                              style: const TextStyle(
                                fontSize: 11,
                                color: AppColors.textMuted,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                        ],
                      ),

                      // Kitchen Ready Notification Badge
                      if (table.items.any((i) => i.status == OrderItemStatus.ready)) ...[
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                          decoration: BoxDecoration(
                            color: Colors.green.shade50,
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: Colors.green.shade400, width: 0.8),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.notifications_active_rounded, color: Colors.green, size: 12),
                              const SizedBox(width: 4),
                              Expanded(
                                child: Text(
                                  '${table.items.where((i) => i.status == OrderItemStatus.ready).length} ${AppTranslations.get('items_count', lang)} ${AppTranslations.get('dish_ready', lang)}',
                                  style: const TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.green,
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],

                      // Bottom Info (Total Amount or Free message)
                      if (table.status == TableStatus.free) ...[
                        Row(
                          children: [
                            Icon(Icons.add_circle_outline, size: 16, color: AppColors.tableFree.withOpacity(0.8)),
                            const SizedBox(width: 4),
                            Text(
                              lang == 'oz' ? 'Буюртма очиш' : (lang == 'ru' ? 'Открыть заказ' : 'Buyurtma ochish'),
                              style: const TextStyle(
                                fontSize: 12,
                                color: AppColors.tableFree,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ] else ...[
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (table.activeWaiterName != null)
                              Text(
                                TransliterationHelper.adapt(table.activeWaiterName!, lang),
                                style: const TextStyle(
                                  fontSize: 11,
                                  color: AppColors.textSecondary,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            const SizedBox(height: 2),
                            Text(
                              Formatters.formatCurrency(table.totalAmount, AppTranslations.get('currency', lang)),
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                                color: AppColors.textPrimary,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
