import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/utils/transliteration_helper.dart';
import '../../../core/localization/app_translations.dart';
import '../../../models/order.dart';
import '../../../providers/order_provider.dart';
import '../../../providers/tables_provider.dart';
import '../../../providers/settings_provider.dart';
import '../../../providers/auth_provider.dart';
import '../../../core/services/waiter_stats_service.dart';
import '../../bill/bill_dialog.dart';

class OrderCartSheet extends StatelessWidget {
  const OrderCartSheet({super.key});

  @override
  Widget build(BuildContext context) {
    final orderProv = context.watch<OrderProvider>();
    final tablesProv = context.read<TablesProvider>();
    final lang = context.watch<SettingsProvider>().currentLanguage;
    final order = orderProv.currentOrder;
    final table = orderProv.currentTable;

    if (order == null || table == null) {
      return const SizedBox();
    }

    final items = order.items;

    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SafeArea(
        top: false,
        child: Column(
          children: [
            // Handle bar
            const SizedBox(height: 12),
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.border,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 12),

            // Header: Table name & Guest count
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        TransliterationHelper.adapt(table.number, lang),
                        style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      Text(
                        '${AppTranslations.get('waiter', lang)}: ${TransliterationHelper.adapt(order.waiterName, lang)}',
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                  // Guests count stepper
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.background,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.people_outline, size: 16, color: AppColors.textSecondary),
                        const SizedBox(width: 6),
                        InkWell(
                          onTap: () {
                            if (order.guestCount > 1) {
                              orderProv.updateGuestCount(order.guestCount - 1);
                            }
                          },
                          child: const Padding(
                            padding: EdgeInsets.all(4),
                            child: Icon(Icons.remove, size: 16),
                          ),
                        ),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 6),
                          child: Text(
                            '${order.guestCount}',
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                          ),
                        ),
                        InkWell(
                          onTap: () => orderProv.updateGuestCount(order.guestCount + 1),
                          child: const Padding(
                            padding: EdgeInsets.all(4),
                            child: Icon(Icons.add, size: 16),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const Divider(height: 20),

            // Items List
            Expanded(
              child: items.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.shopping_basket_outlined, size: 48, color: Colors.grey.shade300),
                          const SizedBox(height: 12),
                          const Text(
                            'Buyurtmaga taomlar qo\'shilmagan',
                            style: TextStyle(color: AppColors.textSecondary),
                          ),
                        ],
                      ),
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
                      itemCount: items.length,
                      separatorBuilder: (_, __) => const Divider(height: 16),
                      itemBuilder: (context, index) {
                        final item = items[index];
                        final isDraft = item.status == OrderItemStatus.draft;
                        final isCancelled = item.isCancelled;

                        return Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Course badge & status
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: isCancelled
                                    ? Colors.red.shade50
                                    : (isDraft ? AppColors.primaryLight : AppColors.tableFreeLight),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                isCancelled
                                    ? (lang == 'oz' ? 'Бекор' : (lang == 'ru' ? 'Отмена' : 'Bekor'))
                                    : '${item.course}-${lang == 'oz' ? 'курс' : (lang == 'ru' ? 'курс' : 'kurs')}',
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                  color: isCancelled
                                      ? Colors.red
                                      : (isDraft ? AppColors.primaryDark : AppColors.tableFree),
                                ),
                              ),
                            ),
                            const SizedBox(width: 10),

                            // Item details
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    TransliterationHelper.adapt(item.productName, lang),
                                    style: TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w600,
                                      decoration: isCancelled ? TextDecoration.lineThrough : null,
                                      color: isCancelled ? AppColors.textMuted : AppColors.textPrimary,
                                    ),
                                  ),
                                  if (item.waiterName != null && item.waiterName!.isNotEmpty)
                                    Padding(
                                      padding: const EdgeInsets.only(top: 2),
                                      child: Row(
                                        children: [
                                          Icon(Icons.person_outline, size: 12, color: Colors.blue.shade700),
                                          const SizedBox(width: 2),
                                          Text(
                                            item.waiterName!,
                                            style: TextStyle(
                                              fontSize: 10,
                                              fontWeight: FontWeight.w500,
                                              color: Colors.blue.shade700,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  if (item.selectedModifiers.isNotEmpty)
                                    Padding(
                                      padding: const EdgeInsets.only(top: 2),
                                      child: Text(
                                        item.selectedModifiers.join(', '),
                                        style: const TextStyle(
                                          fontSize: 11,
                                          color: AppColors.primary,
                                        ),
                                      ),
                                    ),
                                  if (item.comment != null && item.comment!.isNotEmpty)
                                    Padding(
                                      padding: const EdgeInsets.only(top: 2),
                                      child: Text(
                                        'Izoh: "${item.comment}"',
                                        style: const TextStyle(
                                          fontSize: 11,
                                          fontStyle: FontStyle.italic,
                                          color: AppColors.textMuted,
                                        ),
                                      ),
                                    ),
                                  if (isCancelled && item.cancelReason != null)
                                    Padding(
                                      padding: const EdgeInsets.only(top: 2),
                                      child: Text(
                                        'Sabab: ${item.cancelReason}',
                                        style: TextStyle(
                                          fontSize: 11,
                                          fontStyle: FontStyle.italic,
                                          color: Colors.red.shade700,
                                        ),
                                      ),
                                    ),
                                  const SizedBox(height: 4),
                                  Text(
                                    '${Formatters.formatCurrency(item.unitPrice)} × ${item.quantity} = ${Formatters.formatCurrency(item.totalPrice)}',
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w500,
                                      decoration: isCancelled ? TextDecoration.lineThrough : null,
                                      color: isCancelled ? AppColors.textMuted : AppColors.textSecondary,
                                    ),
                                  ),
                                ],
                              ),
                            ),

                            // Stepper or Sent Status
                            if (isDraft)
                              Row(
                                children: [
                                  IconButton(
                                    icon: const Icon(Icons.remove_circle_outline, size: 20),
                                    color: AppColors.textSecondary,
                                    padding: EdgeInsets.zero,
                                    constraints: const BoxConstraints(),
                                    onPressed: () => orderProv.decrementItem(item),
                                  ),
                                  Padding(
                                    padding: const EdgeInsets.symmetric(horizontal: 8),
                                    child: Text(
                                      '${item.quantity}',
                                      style: const TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                  IconButton(
                                    icon: const Icon(Icons.add_circle_outline, size: 20),
                                    color: AppColors.primary,
                                    padding: EdgeInsets.zero,
                                    constraints: const BoxConstraints(),
                                    onPressed: () => orderProv.incrementItem(item),
                                  ),
                                ],
                              )
                            else if (isCancelled)
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: Colors.red.shade50,
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  'Bekor',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.red.shade700,
                                  ),
                                ),
                              )
                            else
                              Row(
                                children: [
                                  IconButton(
                                    icon: Icon(Icons.edit_outlined, size: 18, color: Colors.blue.shade600),
                                    tooltip: 'Tahrirlash',
                                    padding: EdgeInsets.zero,
                                    constraints: const BoxConstraints(),
                                    onPressed: () => _showEditItemDialog(context, item, orderProv, tablesProv),
                                  ),
                                  const SizedBox(width: 4),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: AppColors.tableFreeLight,
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Row(
                                      children: [
                                        const Icon(Icons.check, size: 14, color: AppColors.tableFree),
                                        const SizedBox(width: 4),
                                        Text(
                                          '${item.quantity} dona',
                                          style: const TextStyle(
                                            fontSize: 11,
                                            fontWeight: FontWeight.w600,
                                            color: AppColors.tableFree,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(width: 4),
                                  IconButton(
                                    icon: Icon(Icons.cancel_outlined, size: 18, color: Colors.red.shade400),
                                    tooltip: 'Taomni bekor qilish',
                                    padding: EdgeInsets.zero,
                                    constraints: const BoxConstraints(),
                                    onPressed: () => _showCancelItemDialog(context, item, orderProv, tablesProv),
                                  ),
                                ],
                              ),
                          ],
                        );
                      },
                    ),
            ),

            // Summary calculation
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              decoration: const BoxDecoration(
                color: AppColors.background,
                border: Border(top: BorderSide(color: AppColors.border)),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Oraliq summa:',
                        style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                      ),
                      Text(
                        Formatters.formatCurrency(order.subtotal),
                        style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Xizmat haqi (${order.serviceFeePercent.round()}%):',
                        style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                      ),
                      Text(
                        Formatters.formatCurrency(order.serviceAmount),
                        style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                      ),
                    ],
                  ),
                  const Divider(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Jami to\'lov:',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: AppColors.textPrimary,
                        ),
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
                ],
              ),
            ),

            // Action Buttons Bar
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  // Pre-chek tugmasi
                  if (items.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: OutlinedButton(
                        onPressed: () {
                          showDialog(
                            context: context,
                            builder: (_) => BillDialog(
                              order: order,
                              table: table,
                              onPrintConfirmed: () async {
                                await orderProv.requestPreBill(tablesProv);
                                if (context.mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(
                                      content: Text('Pre-chek printerga yuborildi!'),
                                      backgroundColor: AppColors.tableBill,
                                    ),
                                  );
                                }
                              },
                            ),
                          );
                        },
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                          side: const BorderSide(color: AppColors.border),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: const Icon(Icons.receipt_long, color: AppColors.textPrimary),
                      ),
                    ),

                  // Oshxonaga yuborish (Primary button)
                  Expanded(
                    child: ElevatedButton(
                      onPressed: orderProv.isSending || (orderProv.draftItemsCount == 0 && items.isNotEmpty)
                          ? null
                          : () async {
                              final success = await orderProv.sendToKitchen(tablesProv);
                              if (context.mounted) {
                                final settingsProv = context.read<SettingsProvider>();
                                if (success) {
                                  final auth = context.read<AuthProvider>();
                                  WaiterStatsService().recordOrderSent(
                                    waiterId: auth.currentWaiter?.id ?? '1',
                                    tableNumber: table.number,
                                    orderTotal: order.grandTotal,
                                    guestCount: order.guestCount,
                                    items: order.items,
                                  ).catchError((_) {});

                                  if (settingsProv.isHapticEnabled) {
                                    HapticFeedback.heavyImpact();
                                  }
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content: Text(settingsProv.tr('order_sent_success')),
                                      backgroundColor: AppColors.success,
                                    ),
                                  );
                                  Navigator.pop(context);
                                } else {
                                  if (settingsProv.isHapticEnabled) {
                                    HapticFeedback.vibrate();
                                  }
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content: Text(settingsProv.tr('order_sent_error')),
                                      backgroundColor: AppColors.error,
                                    ),
                                  );
                                }
                              }
                            },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        disabledBackgroundColor: Colors.grey.shade300,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: orderProv.isSending
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                            )
                          : Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(Icons.send_rounded, size: 18),
                                const SizedBox(width: 8),
                                Text(
                                  orderProv.draftItemsCount > 0
                                      ? 'Oshxonaga (${orderProv.draftItemsCount})'
                                      : 'Yuborilgan',
                                  style: const TextStyle(fontWeight: FontWeight.bold),
                                ),
                              ],
                            ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showCancelItemDialog(
    BuildContext context,
    OrderItem item,
    OrderProvider orderProv,
    TablesProvider tablesProv,
  ) {
    int cancelQty = 1;
    String selectedReason = 'Mijoz rad etdi';
    final customReasonCtrl = TextEditingController();
    final reasons = [
      'Mijoz rad etdi',
      'Noto\'g\'ri kiritilgan',
      'Oshxona tayyorlay olmaydi',
      'Taom kech qoldi',
      'Boshqa sabab',
    ];

    showDialog(
      context: context,
      builder: (dialogCtx) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Row(
            children: [
              Icon(Icons.warning_amber_rounded, color: Colors.red),
              SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Taomni bekor qilish',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.productName,
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                ),
                const SizedBox(height: 4),
                Text(
                  'Jami buyurtma qilingan: ${item.quantity} dona',
                  style: const TextStyle(color: AppColors.textSecondary, fontSize: 13),
                ),
                const SizedBox(height: 16),

                // Qaytarish miqdori
                if (item.quantity > 1) ...[
                  const Text(
                    'Bekor qilish miqdori:',
                    style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      IconButton(
                        onPressed: cancelQty > 1
                            ? () => setDialogState(() => cancelQty--)
                            : null,
                        icon: const Icon(Icons.remove_circle_outline),
                      ),
                      Text(
                        '$cancelQty dona',
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                      IconButton(
                        onPressed: cancelQty < item.quantity
                            ? () => setDialogState(() => cancelQty++)
                            : null,
                        icon: const Icon(Icons.add_circle_outline),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                ],

                // Bekor qilish sababi
                const Text(
                  'Sababini tanlang:',
                  style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                ),
                const SizedBox(height: 8),
                DropdownButtonFormField<String>(
                  value: selectedReason,
                  isExpanded: true,
                  decoration: InputDecoration(
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  items: reasons
                      .map((r) => DropdownMenuItem(value: r, child: Text(r, style: const TextStyle(fontSize: 13))))
                      .toList(),
                  onChanged: (val) {
                    if (val != null) {
                      setDialogState(() => selectedReason = val);
                    }
                  },
                ),
                if (selectedReason == 'Boshqa sabab') ...[
                  const SizedBox(height: 10),
                  TextField(
                    controller: customReasonCtrl,
                    decoration: InputDecoration(
                      hintText: 'Sababni yozing...',
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                  ),
                ],
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogCtx),
              child: const Text('Bekor qilish yo\'q'),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.red,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              onPressed: () async {
                final reason = selectedReason == 'Boshqa sabab' && customReasonCtrl.text.trim().isNotEmpty
                    ? customReasonCtrl.text.trim()
                    : selectedReason;

                Navigator.pop(dialogCtx);

                final success = await orderProv.cancelOrderItem(
                  item: item,
                  cancelQty: cancelQty,
                  reason: reason,
                  tablesProvider: tablesProv,
                );

                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(
                        success
                            ? 'Taom bekor qilindi (kassa va oshxonaga yetkazildi)'
                            : 'Bekor qilishda xatolik yuz berdi',
                      ),
                      backgroundColor: success ? Colors.green : Colors.red,
                    ),
                  );
                }
              },
              child: const Text('Tasdiqlash', style: TextStyle(color: Colors.white)),
            ),
          ],
        ),
      ),
    );
  }

  void _showEditItemDialog(
    BuildContext context,
    OrderItem item,
    OrderProvider orderProv,
    TablesProvider tablesProv,
  ) {
    int currentQty = item.quantity;
    final commentCtrl = TextEditingController(text: item.comment ?? '');

    showDialog(
      context: context,
      builder: (dialogCtx) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Row(
            children: [
              Icon(Icons.edit_note, color: AppColors.primary),
              SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Taomni tahrirlash',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.productName,
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                ),
                const SizedBox(height: 4),
                Text(
                  'Dona narxi: ${Formatters.formatCurrency(item.unitPrice)}',
                  style: const TextStyle(color: AppColors.textSecondary, fontSize: 13),
                ),
                const SizedBox(height: 16),

                // Miqdor
                const Text(
                  'Miqdori:',
                  style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    IconButton(
                      onPressed: currentQty > 1
                          ? () => setDialogState(() => currentQty--)
                          : null,
                      icon: const Icon(Icons.remove_circle_outline, color: AppColors.primary),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      decoration: BoxDecoration(
                        color: AppColors.background,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Text(
                        '$currentQty dona',
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                    ),
                    IconButton(
                      onPressed: () => setDialogState(() => currentQty++),
                      icon: const Icon(Icons.add_circle_outline, color: AppColors.primary),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // Izoh
                const Text(
                  'Izoh / Eslatma:',
                  style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: commentCtrl,
                  decoration: InputDecoration(
                    hintText: 'Masalan: Kamroq yog\'li, piyozsiz...',
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogCtx),
              child: const Text('Bekor qilish'),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              onPressed: () async {
                final comment = commentCtrl.text.trim();
                Navigator.pop(dialogCtx);

                final success = await orderProv.updateOrderItem(
                  item: item,
                  newQuantity: currentQty,
                  comment: comment.isEmpty ? null : comment,
                  waiterName: orderProv.currentOrder?.waiterName,
                  tablesProvider: tablesProv,
                );

                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(
                        success
                            ? 'Taom ma\'lumotlari yangilandi'
                            : 'Tahrirlashda xatolik yuz berdi',
                      ),
                      backgroundColor: success ? AppColors.success : Colors.red,
                    ),
                  );
                }
              },
              child: const Text('Saqlash', style: TextStyle(color: Colors.white)),
            ),
          ],
        ),
      ),
    );
  }
}
