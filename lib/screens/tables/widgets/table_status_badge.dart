import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../models/hall_table.dart';

class TableStatusBadge extends StatelessWidget {
  final TableStatus status;
  final bool isSmall;

  const TableStatusBadge({
    super.key,
    required this.status,
    this.isSmall = false,
  });

  @override
  Widget build(BuildContext context) {
    Color bg;
    Color textColor;

    switch (status) {
      case TableStatus.free:
        bg = AppColors.tableFreeLight;
        textColor = AppColors.tableFree;
        break;
      case TableStatus.busy:
        bg = AppColors.tableBusyLight;
        textColor = AppColors.tableBusy;
        break;
      case TableStatus.billRequested:
        bg = AppColors.tableBillLight;
        textColor = AppColors.tableBill;
        break;
      case TableStatus.reserved:
        bg = AppColors.tableReservedLight;
        textColor = AppColors.tableReserved;
        break;
    }

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: isSmall ? 6 : 8,
        vertical: isSmall ? 2 : 4,
      ),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        status.label,
        style: TextStyle(
          color: textColor,
          fontSize: isSmall ? 10 : 11,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
