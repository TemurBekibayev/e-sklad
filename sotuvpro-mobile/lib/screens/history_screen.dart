import 'package:flutter/material.dart';
import '../data/database_helper.dart';
import '../models/transaction.dart';
import '../models/user.dart';
import '../services/printer_service.dart';
import '../theme/app_theme.dart';

class HistoryScreen extends StatefulWidget {
  final User currentUser;

  const HistoryScreen({Key? key, required this.currentUser}) : super(key: key);

  @override
  _HistoryScreenState createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  List<TransactionModel> _transactions = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }

  @override
  void didUpdateWidget(covariant HistoryScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    _loadHistory();
  }

  Future<void> _loadHistory() async {
    final txns = await DatabaseHelper.instance.getWorkerTransactions(
      widget.currentUser.id,
      tenantId: widget.currentUser.tenantId,
    );
    if (mounted) {
      setState(() {
        _transactions = txns;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.darkBackground,
      appBar: AppBar(
        title: const Text('Mening Savdolarim Tarixi'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: AppTheme.primaryEmerald),
            tooltip: 'Yangilash',
            onPressed: _loadHistory,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.primaryEmerald))
          : RefreshIndicator(
              onRefresh: _loadHistory,
              color: AppTheme.primaryEmerald,
              child: _transactions.isEmpty
                  ? SingleChildScrollView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      child: Container(
                        height: MediaQuery.of(context).size.height * 0.7,
                        alignment: Alignment.center,
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.history_toggle_off, size: 64, color: AppTheme.textMuted.withOpacity(0.5)),
                            const SizedBox(height: 16),
                            const Text(
                              'Hali savdolar tarixi mavjud emas',
                              style: TextStyle(color: AppTheme.textSecondary, fontSize: 16),
                            ),
                          ],
                        ),
                      ),
                    )
                  : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _transactions.length,
                  itemBuilder: (context, index) {
                    final txn = _transactions[index];
                    final isPending = txn.status == 'pending_approval';

                    return Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(8),
                                      decoration: BoxDecoration(
                                        color: isPending
                                            ? AppTheme.warningOrange.withOpacity(0.2)
                                            : AppTheme.primaryEmerald.withOpacity(0.2),
                                        borderRadius: BorderRadius.circular(10),
                                      ),
                                      child: Icon(
                                        isPending ? Icons.pending_actions : Icons.check_circle_outline,
                                        color: isPending ? AppTheme.warningOrange : AppTheme.primaryEmerald,
                                        size: 20,
                                      ),
                                    ),
                                    const SizedBox(width: 10),
                                    Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          txn.clientName,
                                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                                        ),
                                        Text(
                                          'Sana: ${txn.createdAt.toString().substring(0, 16)}',
                                          style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: isPending ? AppTheme.warningOrange.withOpacity(0.15) : AppTheme.primaryEmerald.withOpacity(0.15),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Text(
                                    isPending ? 'Kutilmoqda' : 'Yakunlangan',
                                    style: TextStyle(
                                      color: isPending ? AppTheme.warningOrange : AppTheme.primaryEmerald,
                                      fontSize: 11,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const Divider(height: 20, color: Color(0xFF334155)),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'To\'lov: ${txn.paymentType.toUpperCase()}',
                                      style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13),
                                    ),
                                    if (txn.debtAmount > 0)
                                      Text(
                                        'Qarz: ${txn.debtAmount.toStringAsFixed(0)} so\'m',
                                        style: const TextStyle(color: AppTheme.warningOrange, fontSize: 12),
                                      ),
                                  ],
                                ),
                                Text(
                                  '${txn.totalAmount.toStringAsFixed(0)} so\'m',
                                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.accentNeon),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            Align(
                              alignment: Alignment.centerRight,
                              child: OutlinedButton.icon(
                                icon: const Icon(Icons.print, size: 18),
                                label: const Text('CHEKNI QAYTA CHOP ETISH'),
                                style: OutlinedButton.styleFrom(
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                ),
                                onPressed: () async {
                                  final items = await DatabaseHelper.instance.getBasketItems(txn.basketId);
                                  if (mounted) {
                                    PrinterService.instance.printOrShareReceipt(
                                      context,
                                      transaction: txn,
                                      items: items,
                                    );
                                  }
                                },
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
            ),
    );
  }
}
