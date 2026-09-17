import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../models/hall_table.dart';
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
                              table.number,
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

                      // Bottom Info (Total Amount or Free message)
                      if (table.status == TableStatus.free) ...[
                        Row(
                          children: [
                            Icon(Icons.add_circle_outline, size: 16, color: AppColors.tableFree.withOpacity(0.8)),
                            const SizedBox(width: 4),
                            const Text(
                              'Buyurtma ochish',
                              style: TextStyle(
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
                                table.activeWaiterName!,
                                style: const TextStyle(
                                  fontSize: 11,
                                  color: AppColors.textSecondary,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            const SizedBox(height: 2),
                            Text(
                              Formatters.formatCurrency(table.totalAmount),
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
