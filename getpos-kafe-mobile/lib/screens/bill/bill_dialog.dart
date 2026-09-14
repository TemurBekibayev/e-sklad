import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/utils/formatters.dart';
import '../../models/order.dart';
import '../../models/hall_table.dart';

class BillDialog extends StatelessWidget {
  final RestaurantOrder order;
  final RestaurantTable table;
  final VoidCallback onPrintConfirmed;

  const BillDialog({
    super.key,
    required this.order,
    required this.table,
    required this.onPrintConfirmed,
  });

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Container(
        padding: const EdgeInsets.all(20),
        constraints: const BoxConstraints(maxWidth: 400),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Receipt Header
              const Icon(Icons.receipt_long, size: 40, color: AppColors.primary),
              const SizedBox(height: 8),
              const Text(
                'PRE-CHEK',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 2,
                  color: AppColors.textPrimary,
                ),
              ),
              const Text(
                'Oraliq hisob-kitob kvitansiyasi',
                style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
              ),
              const SizedBox(height: 16),

              // Table & Waiter info
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.background,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Column(
                  children: [
                    _buildRow('Stol:', table.number),
                    const SizedBox(height: 4),
                    _buildRow('Ofitsiyant:', order.waiterName),
                    const SizedBox(height: 4),
                    _buildRow('Mehmonlar soni:', '${order.guestCount} kishi'),
                    const SizedBox(height: 4),
                    _buildRow('Vaqt:', Formatters.formatTime(DateTime.now())),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Receipt items
              const Text(
                '- - - - - - - - - - - - - - - - - - - - - - - - -',
                style: TextStyle(color: AppColors.textMuted),
              ),
              const SizedBox(height: 8),
              ...order.items.map((item) {
                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              item.productName,
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            if (item.selectedModifiers.isNotEmpty)
                              Text(
                                item.selectedModifiers.join(', '),
                                style: const TextStyle(fontSize: 10, color: AppColors.textSecondary),
                              ),
                          ],
                        ),
                      ),
                      Text(
                        '${item.quantity} × ${Formatters.formatCurrency(item.unitPrice)}',
                        style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        Formatters.formatCurrency(item.totalPrice),
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                );
              }),
              const SizedBox(height: 8),
              const Text(
                '- - - - - - - - - - - - - - - - - - - - - - - - -',
                style: TextStyle(color: AppColors.textMuted),
              ),
              const SizedBox(height: 8),

              // Total Calculation
              _buildRow('Taomlar jami:', Formatters.formatCurrency(order.subtotal)),
              const SizedBox(height: 4),
              _buildRow(
                'Xizmat haqi (${order.serviceFeePercent.round()}%):',
                Formatters.formatCurrency(order.serviceAmount),
              ),
              const Divider(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'JAMI TO\'LOV:',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                  Text(
                    Formatters.formatCurrency(order.grandTotal),
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: AppColors.primary,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // Action buttons
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.pop(context),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                      child: const Text('Yopish'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () {
                        Navigator.pop(context);
                        onPrintConfirmed();
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.tableBill,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                      icon: const Icon(Icons.print, size: 18),
                      label: const Text('Chiqarish'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildRow(String title, String val) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          title,
          style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
        ),
        Text(
          val,
          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
        ),
      ],
    );
  }
}
