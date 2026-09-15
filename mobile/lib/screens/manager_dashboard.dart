import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import '../providers/auth_provider.dart';
import '../providers/sync_provider.dart';
import 'login_screen.dart';

class ManagerDashboard extends StatefulWidget {
  const ManagerDashboard({super.key});

  @override
  State<ManagerDashboard> createState() => _ManagerDashboardState();
}

class _ManagerDashboardState extends State<ManagerDashboard> {
  int _activeTab = 0; // 0 = Overview, 1 = Inventory, 2 = Debts
  String _searchQuery = '';
  
  // Dialog controllers
  final _prodNameController = TextEditingController();
  final _prodPriceController = TextEditingController();
  final _prodBarcodeController = TextEditingController();
  final _prodStockController = TextEditingController();
  String _prodUnit = 'dona';
  dynamic _editingProduct;
  
  final _debtRepayController = TextEditingController();
  dynamic _selectedDebtClient;
  
  // Checkout controllers
  dynamic _selectedWorkerBasket;
  String _paymentMethod = 'cash'; // cash, card, debt
  final _checkoutClientNameController = TextEditingController();
  final _checkoutClientPhoneController = TextEditingController();

  @override
  void dispose() {
    _prodNameController.dispose();
    _prodPriceController.dispose();
    _prodBarcodeController.dispose();
    _prodStockController.dispose();
    _debtRepayController.dispose();
    _checkoutClientNameController.dispose();
    _checkoutClientPhoneController.dispose();
    super.dispose();
  }

  void _openProductForm(dynamic product) {
    setState(() {
      _editingProduct = product;
      if (product != null) {
        _prodNameController.text = product['name'];
        _prodPriceController.text = product['price'].toString();
        _prodBarcodeController.text = product['barcode'] ?? '';
        _prodStockController.text = product['currentStock'].toString();
        _prodUnit = product['unit'];
      } else {
        _prodNameController.clear();
        _prodPriceController.clear();
        _prodBarcodeController.clear();
        _prodStockController.text = '0';
        _prodUnit = 'dona';
      }
    });

    _showProductFormDialog();
  }

  void _showProductFormDialog() {
    showDialog(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setStateDialog) {
            return Dialog(
              backgroundColor: const Color(0xFF16112B),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              child: Container(
                padding: const EdgeInsets.all(20),
                width: double.infinity,
                constraints: const BoxConstraints(maxWidth: 400),
                child: SingleChildScrollView(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _editingProduct == null ? 'Yangi Mahsulot' : 'Mahsulotni Tahrirlash',
                        style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 16),
                      // Name
                      const Text('Mahsulot Nomi', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                      const SizedBox(height: 6),
                      TextField(
                        controller: _prodNameController,
                        style: const TextStyle(color: Colors.white),
                        decoration: _dialogInputDeco('Masalan: Sement Qizil qop'),
                      ),
                      const SizedBox(height: 16),
                      // Price
                      const Text('Sotilish Narxi (UZS)', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                      const SizedBox(height: 6),
                      TextField(
                        controller: _prodPriceController,
                        style: const TextStyle(color: Colors.white),
                        keyboardType: TextInputType.number,
                        decoration: _dialogInputDeco('Narxi...'),
                      ),
                      const SizedBox(height: 16),
                      // Unit
                      const Text('O\'lchov Birligi', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                      const SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: ['dona', 'kg', 'qop', 'metr', 'litr'].map((unit) {
                          final active = _prodUnit == unit;
                          return GestureDetector(
                            onTap: () => setStateDialog(() => _prodUnit = unit),
                            child: Container(
                              decoration: BoxDecoration(
                                color: active ? const Color(0xFF6366F1) : const Color(0x0FFFFFFF),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                              child: Text(
                                unit,
                                style: TextStyle(
                                  color: active ? Colors.white : const Color(0xFF94A3B8),
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          );
                        }).toList(),
                      ),
                      const SizedBox(height: 16),
                      // Barcode
                      const Text('Shtrix-kod (Skanersiz kiritish uchun)', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                      const SizedBox(height: 6),
                      TextField(
                        controller: _prodBarcodeController,
                        style: const TextStyle(color: Colors.white),
                        decoration: _dialogInputDeco('Shtrix-kod...'),
                      ),
                      const SizedBox(height: 16),
                      // Stock
                      const Text('Zaxira Qoldig\'i (Stock)', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                      const SizedBox(height: 6),
                      TextField(
                        controller: _prodStockController,
                        style: const TextStyle(color: Colors.white),
                        keyboardType: TextInputType.number,
                        decoration: _dialogInputDeco('Qancha tovar bor...'),
                      ),
                      const SizedBox(height: 24),
                      // Submit
                      SizedBox(
                        width: double.infinity,
                        height: 44,
                        child: ElevatedButton(
                          onPressed: () => _handleSaveProduct(context),
                          style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF6366F1)),
                          child: const Text('Saqlash', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                        ),
                      )
                    ],
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }

  void _handleSaveProduct(BuildContext context) async {
    final sync = Provider.of<SyncProvider>(context, listen: false);
    final price = double.tryParse(_prodPriceController.text);
    final stock = double.tryParse(_prodStockController.text);

    if (_prodNameController.text.trim().isEmpty || price == null || stock == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Iltimos, barcha maydonlarni to\'g\'ri to\'ldiring'), backgroundColor: Colors.redAccent),
      );
      return;
    }

    final form = {
      'name': _prodNameController.text.trim(),
      'price': price,
      'unit': _prodUnit,
      'barcode': _prodBarcodeController.text.trim(),
      'currentStock': stock,
    };

    try {
      await sync.saveProduct(form, _editingProduct);
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Mahsulot muvaffaqiyatli saqlandi'), backgroundColor: Color(0xFF10B981)),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Xatolik yuz berdi: $e'), backgroundColor: Colors.redAccent),
        );
      }
    }
  }

  void _openCheckout(dynamic basket) {
    setState(() {
      _selectedWorkerBasket = basket;
      _paymentMethod = 'cash';
      _checkoutClientNameController.text = basket['clientName'] ?? '';
      _checkoutClientPhoneController.clear();
    });
    _showCheckoutDialog();
  }

  void _showCheckoutDialog() {
    showDialog(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setStateDialog) {
            final sync = Provider.of<SyncProvider>(context);
            final double basketTotal = (_selectedWorkerBasket['items'] as List).fold(0.0, (sum, item) {
              final price = double.parse(item['product']['price'].toString());
              final qty = double.parse(item['quantity'].toString());
              return sum + (price * qty);
            });

            return Dialog(
              backgroundColor: const Color(0xFF16112B),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              child: Container(
                padding: const EdgeInsets.all(20),
                width: double.infinity,
                constraints: const BoxConstraints(maxWidth: 400, maxHeight: 600),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Savatni Yakunlash', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                        IconButton(
                          onPressed: () => Navigator.pop(context),
                          icon: const Icon(Icons.close, color: Color(0xFF94A3B8)),
                        )
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Mijoz: ${_selectedWorkerBasket['clientName']}',
                      style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 12),
                    // Item list
                    Expanded(
                      child: ListView.builder(
                        itemCount: _selectedWorkerBasket['items'].length,
                        itemBuilder: (context, idx) {
                          final item = _selectedWorkerBasket['items'][idx];
                          final p = item['product'];
                          final qty = double.parse(item['quantity'].toString());
                          final price = double.parse(p['price'].toString());
                          return Padding(
                            padding: const EdgeInsets.symmetric(vertical: 4),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Expanded(
                                  child: Text(
                                    p['name'],
                                    style: const TextStyle(color: Colors.white, fontSize: 12),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                Text(
                                  '$qty ${p['unit']} x ${_formatCurrency(price)}',
                                  style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  _formatCurrency(price * qty),
                                  style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                                )
                              ],
                            ),
                          );
                        },
                      ),
                    ),
                    const Divider(color: Color(0x14FFFFFF)),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Jami Summa:', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13)),
                        Text(
                          _formatCurrency(basketTotal),
                          style: const TextStyle(color: Color(0xFF10B981), fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    // Payment Method selector
                    const Text('To\'lov turi:', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        _buildPaymentMethodBtn('cash', Icons.money, 'Naqd', setStateDialog),
                        _buildPaymentMethodBtn('card', Icons.credit_card, 'Karta', setStateDialog),
                        _buildPaymentMethodBtn('debt', Icons.warning_amber, 'Qarz', setStateDialog),
                      ],
                    ),
                    if (_paymentMethod == 'debt') ...[
                      const SizedBox(height: 16),
                      const Text('Mijoz Ismi / Do\'kon Nomi', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                      const SizedBox(height: 6),
                      TextField(
                        controller: _checkoutClientNameController,
                        style: const TextStyle(color: Colors.white),
                        decoration: _dialogInputDeco('Mijoz ismi...'),
                      ),
                      const SizedBox(height: 12),
                      const Text('Telefon raqami (Ixtiyoriy)', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                      const SizedBox(height: 6),
                      TextField(
                        controller: _checkoutClientPhoneController,
                        style: const TextStyle(color: Colors.white),
                        keyboardType: TextInputType.phone,
                        decoration: _dialogInputDeco('+998901234567'),
                      ),
                    ],
                    const SizedBox(height: 20),
                    SizedBox(
                      width: double.infinity,
                      height: 44,
                      child: ElevatedButton(
                        onPressed: sync.isLoading ? null : () => _handleFinalizeSale(context, sync, basketTotal),
                        style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF10B981)),
                        child: sync.isLoading
                            ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                            : const Text('Savdoni Tasdiqlash', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                      ),
                    )
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildPaymentMethodBtn(String method, IconData icon, String label, StateSetter setStateDialog) {
    final active = _paymentMethod == method;
    return GestureDetector(
      onTap: () => setStateDialog(() => _paymentMethod = method),
      child: Container(
        width: 100,
        decoration: BoxDecoration(
          color: active ? const Color(0xFF6366F1) : const Color(0x0FFFFFFF),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: active ? const Color(0xFF818CF8) : const Color(0x14FFFFFF)),
        ),
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Column(
          children: [
            Icon(icon, color: active ? Colors.white : const Color(0xFF6366F1), size: 18),
            const SizedBox(height: 4),
            Text(label, style: TextStyle(color: active ? Colors.white : const Color(0xFF94A3B8), fontSize: 11, fontWeight: FontWeight.bold)),
          ],
        ),
      ),
    );
  }

  void _handleFinalizeSale(BuildContext context, SyncProvider sync, double totalAmount) async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    
    if (_paymentMethod == 'debt' && _checkoutClientNameController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Qarz uchun mijoz ismi kiritilishi shart'), backgroundColor: Colors.redAccent),
      );
      return;
    }

    try {
      await sync.finalizeSale(
        basket: _selectedWorkerBasket,
        managerId: auth.currentUser!['id'],
        paymentMethod: _paymentMethod,
        totalAmount: totalAmount,
        clientName: _paymentMethod == 'debt' ? _checkoutClientNameController.text.trim() : null,
        clientPhone: _paymentMethod == 'debt' ? _checkoutClientPhoneController.text.trim() : null,
      );

      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Savdo muvaffaqiyatli yakunlandi'), backgroundColor: Color(0xFF10B981)),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Xatolik yuz berdi: $e'), backgroundColor: Colors.redAccent),
        );
      }
    }
  }

  void _openDebtRepayment(dynamic client) {
    setState(() {
      _selectedDebtClient = client;
      _debtRepayController.clear();
    });
    _showDebtRepayDialog();
  }

  void _showDebtRepayDialog() {
    showDialog(
      context: context,
      builder: (context) {
        return Dialog(
          backgroundColor: const Color(0xFF16112B),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          child: Container(
            padding: const EdgeInsets.all(20),
            width: double.infinity,
            constraints: const BoxConstraints(maxWidth: 320),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Qarzni So\'ndirish', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
                    IconButton(onPressed: () => Navigator.pop(context), icon: const Icon(Icons.close, color: Color(0xFF94A3B8))),
                  ],
                ),
                const SizedBox(height: 12),
                Text(_selectedDebtClient['clientName'], style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
                const SizedBox(height: 4),
                Text(
                  'Qoldiq qarz: ${_formatCurrency(double.parse(_selectedDebtClient['remainingDebt'].toString()))}',
                  style: const TextStyle(color: Colors.orangeAccent, fontSize: 12, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 20),
                const Text('To\'lov Summasi (UZS)', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                const SizedBox(height: 8),
                TextField(
                  controller: _debtRepayController,
                  style: const TextStyle(color: Colors.white),
                  keyboardType: TextInputType.number,
                  decoration: _dialogInputDeco('Summani kiriting...'),
                ),
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  height: 44,
                  child: ElevatedButton(
                    onPressed: () => _handleRecordDebtPayment(context),
                    style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF10B981)),
                    child: const Text('To\'lovni Qabul Qilish', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                  ),
                )
              ],
            ),
          ),
        );
      },
    );
  }

  void _handleRecordDebtPayment(BuildContext context) async {
    final sync = Provider.of<SyncProvider>(context, listen: false);
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final amount = double.tryParse(_debtRepayController.text);

    if (amount == null || amount <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('To\'lov summasini to\'g\'ri kiriting'), backgroundColor: Colors.redAccent),
      );
      return;
    }

    try {
      await sync.recordDebtPayment(_selectedDebtClient['id'], amount, auth.currentUser!['id']);
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('To\'lov qabul qilindi'), backgroundColor: Color(0xFF10B981)),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Xatolik yuz berdi: $e'), backgroundColor: Colors.redAccent),
        );
      }
    }
  }

  // --- PDF REPORT EXPORTER ---
  Future<void> _exportCatalogPdf(List<dynamic> products) async {
    final pdf = pw.Document();
    
    // Draw product sheet
    pdf.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        build: (pw.Context context) {
          return [
            pw.Header(
              level: 0,
              child: pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text('E-Sklad Maxsulotlar Katalogi', style: pw.TextStyle(fontSize: 22, fontWeight: pw.FontWeight.bold)),
                  pw.Text(DateTime.now().toLocal().toString().substring(0, 10), style: const pw.TextStyle(fontSize: 12)),
                ],
              ),
            ),
            pw.SizedBox(height: 20),
            pw.Table(
              border: pw.TableBorder.all(color: PdfColors.grey300),
              children: [
                pw.TableRow(
                  decoration: const pw.BoxDecoration(color: PdfColors.grey100),
                  children: [
                    pw.Padding(padding: const pw.EdgeInsets.all(6), child: pw.Text('Mahsulot nomi', style: pw.TextStyle(fontWeight: pw.FontWeight.bold))),
                    pw.Padding(padding: const pw.EdgeInsets.all(6), child: pw.Text('Narxi', style: pw.TextStyle(fontWeight: pw.FontWeight.bold))),
                    pw.Padding(padding: const pw.EdgeInsets.all(6), child: pw.Text('Birlik', style: pw.TextStyle(fontWeight: pw.FontWeight.bold))),
                    pw.Padding(padding: const pw.EdgeInsets.all(6), child: pw.Text('QR Kod', style: pw.TextStyle(fontWeight: pw.FontWeight.bold))),
                  ],
                ),
                ...products.map((p) {
                  final qrValue = p['qrCode'] ?? p['id'];
                  return pw.TableRow(
                    children: [
                      pw.Padding(padding: const pw.EdgeInsets.all(6), child: pw.Text(p['name'])),
                      pw.Padding(padding: const pw.EdgeInsets.all(6), child: pw.Text('${p['price']} UZS')),
                      pw.Padding(padding: const pw.EdgeInsets.all(6), child: pw.Text(p['unit'])),
                      pw.Padding(
                        padding: const pw.EdgeInsets.all(4),
                        child: pw.Container(
                          width: 40,
                          height: 40,
                          alignment: pw.Alignment.center,
                          child: pw.BarcodeWidget(
                            barcode: pw.Barcode.qrCode(),
                            data: qrValue,
                            width: 35,
                            height: 35,
                          ),
                        ),
                      ),
                    ],
                  );
                }),
              ],
            )
          ];
        },
      ),
    );

    // Share / Print PDF catalog
    await Printing.layoutPdf(
      onLayout: (PdfPageFormat format) async => pdf.save(),
      name: 'esklad_katalog_${DateTime.now().millisecondsSinceEpoch}.pdf',
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final sync = Provider.of<SyncProvider>(context);

    // Filter items based on search query
    final filteredProducts = sync.products.where((p) {
      final name = p['name'].toString().toLowerCase();
      final barcode = (p['barcode'] ?? '').toString().toLowerCase();
      return name.contains(_searchQuery.toLowerCase()) || barcode.contains(_searchQuery.toLowerCase());
    }).toList();

    return Scaffold(
      backgroundColor: const Color(0xFF0F0C20),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0A061A),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '${auth.currentUser?['name']} (Menejer)',
              style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold),
            ),
            Text(
              'Do\'kon: ${auth.tenantName}',
              style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.white, size: 20),
            onPressed: () {
              sync.refreshOnlineData();
              sync.refreshManagerOverview();
            },
          ),
          IconButton(
            onPressed: () {
              auth.logout();
              Navigator.pushReplacement(context, MaterialPageRoute(builder: (context) => const LoginScreen()));
            },
            icon: const Icon(Icons.logout, color: Color(0xFFEF4444), size: 18),
          ),
        ],
      ),
      body: _buildTabBody(sync, filteredProducts),
      bottomNavigationBar: BottomNavigationBar(
        backgroundColor: const Color(0xFF0A061A),
        selectedItemColor: const Color(0xFF6366F1),
        unselectedItemColor: const Color(0xFF64748B),
        currentIndex: _activeTab,
        onTap: (index) {
          setState(() {
            _activeTab = index;
          });
          if (index == 0) {
            sync.refreshManagerOverview();
          }
        },
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.dashboard_outlined), label: 'Savdo'),
          BottomNavigationBarItem(icon: Icon(Icons.inventory_2_outlined), label: 'Sklad'),
          BottomNavigationBarItem(icon: Icon(Icons.book_outlined), label: 'Qarz Daftar'),
        ],
      ),
    );
  }

  Widget _buildTabBody(SyncProvider sync, List<dynamic> filteredProducts) {
    if (_activeTab == 0) {
      return _buildOverviewTab(sync);
    } else if (_activeTab == 1) {
      return _buildInventoryTab(sync, filteredProducts);
    } else {
      return _buildDebtsTab(sync);
    }
  }

  // --- TAB 1: OVERVIEW & ACTIVE BASKETS ---
  Widget _buildOverviewTab(SyncProvider sync) {
    final stats = sync.dashboardStats ?? {
      'totalSales': 0.0,
      'todaySales': 0.0,
      'totalRemainingDebt': 0.0,
    };

    final double totalSales = double.parse(stats['totalSales'].toString());
    final double todaySales = double.parse(stats['todaySales'].toString());
    final double totalRemainingDebt = double.parse(stats['totalRemainingDebt'].toString());

    return RefreshIndicator(
      onRefresh: () async {
        await sync.refreshOnlineData();
        await sync.refreshManagerOverview();
      },
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Stat Cards Grid
          Row(
            children: [
              Expanded(child: _buildStatCard('Jami Savdo', totalSales, const Color(0xFF10B981))),
              const SizedBox(width: 10),
              Expanded(child: _buildStatCard('Bugun', todaySales, const Color(0xFF6366F1))),
              const SizedBox(width: 10),
              Expanded(child: _buildStatCard('Qarzlar', totalRemainingDebt, const Color(0xFFF59E0B))),
            ],
          ),
          const SizedBox(height: 24),
          
          const Text(
            'Kassadagi Faol Savatlar (Worker Baskets)',
            style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),

          sync.allWorkersBaskets.isEmpty
              ? Container(
                  padding: const EdgeInsets.symmetric(vertical: 40),
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: const Color(0xFF16112B),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Column(
                    children: [
                      Icon(Icons.shopping_cart_outlined, color: Color(0xFF2E245C), size: 36),
                      SizedBox(height: 8),
                      Text('Faol xodim savatlari topilmadi', style: TextStyle(color: Color(0xFF64748B), fontSize: 12)),
                    ],
                  ),
                )
              : ListView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: sync.allWorkersBaskets.length,
                  itemBuilder: (context, idx) {
                    final b = sync.allWorkersBaskets[idx];
                    final double total = (b['items'] as List).fold(0.0, (sum, it) {
                      return sum + (double.parse(it['product']['price'].toString()) * double.parse(it['quantity'].toString()));
                    });

                    return Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      decoration: BoxDecoration(
                        color: const Color(0xFF16112B),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0x14FFFFFF)),
                      ),
                      padding: const EdgeInsets.all(16),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  b['clientName'] ?? 'Nomsiz Mijoz',
                                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  'Sotuvchi: ${b['worker']['name']} (${b['items'].length} turdagi tovar)',
                                  style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                                ),
                              ],
                            ),
                          ),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(
                                _formatCurrency(total),
                                style: const TextStyle(color: Color(0xFF10B981), fontWeight: FontWeight.bold, fontSize: 14),
                              ),
                              const SizedBox(height: 6),
                              ElevatedButton(
                                onPressed: () => _openCheckout(b),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: const Color(0xFF6366F1),
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                                  minimumSize: Size.zero,
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                                ),
                                child: const Text('Kassa', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                              ),
                            ],
                          )
                        ],
                      ),
                    );
                  },
                )
        ],
      ),
    );
  }

  Widget _buildStatCard(String label, double val, Color color) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF16112B),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0x14FFFFFF)),
      ),
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10, fontWeight: FontWeight.w500)),
          const SizedBox(height: 6),
          Text(
            _formatCurrencyShort(val),
            style: TextStyle(color: color, fontSize: 14, fontWeight: FontWeight.bold),
            overflow: TextOverflow.ellipsis,
          )
        ],
      ),
    );
  }

  // --- TAB 2: INVENTORY LIST & DETAILS ---
  Widget _buildInventoryTab(SyncProvider sync, List<dynamic> filteredProducts) {
    return Column(
      children: [
        // Search & Export Bar
        Padding(
          padding: const EdgeInsets.all(16.0),
          child: Row(
            children: [
              Expanded(
                child: Container(
                  decoration: BoxDecoration(
                    color: const Color(0xFF16112B),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0x14FFFFFF)),
                  ),
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  child: TextField(
                    style: const TextStyle(color: Colors.white, fontSize: 13),
                    decoration: const InputDecoration(
                      hintText: 'Qidiruv...',
                      hintStyle: TextStyle(color: Color(0xFF64748B)),
                      border: InputBorder.none,
                      icon: Icon(Icons.search, color: Color(0xFF64748B), size: 16),
                    ),
                    onChanged: (val) {
                      setState(() {
                        _searchQuery = val;
                      });
                    },
                  ),
                ),
              ),
              const SizedBox(width: 8),
              // Export PDF catalog
              IconButton(
                onPressed: () => _exportCatalogPdf(sync.products),
                icon: const Icon(Icons.picture_as_pdf, color: Color(0xFFEF4444)),
                tooltip: 'PDF katalog chiqarish',
              ),
              // Add product button
              IconButton(
                onPressed: () => _openProductForm(null),
                icon: const Icon(Icons.add_circle, color: Color(0xFF10B981)),
                tooltip: 'Yangi tovar qo\'shish',
              )
            ],
          ),
        ),

        // Products List
        Expanded(
          child: filteredProducts.isEmpty
              ? const Center(child: Text('Mahsulot topilmadi', style: TextStyle(color: Color(0xFF64748B))))
              : ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: filteredProducts.length,
                  itemBuilder: (context, idx) {
                    final p = filteredProducts[idx];
                    final currentStock = double.parse(p['currentStock'].toString());
                    final reservedStock = double.parse((p['reservedStock'] ?? 0).toString());
                    final price = double.parse(p['price'].toString());
                    
                    return Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      decoration: BoxDecoration(
                        color: const Color(0xFF16112B),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0x14FFFFFF)),
                      ),
                      padding: const EdgeInsets.all(12),
                      child: Row(
                        children: [
                          // Product details
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(p['name'], style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                                const SizedBox(height: 4),
                                Text(
                                  'Narx: ${_formatCurrency(price)} / ${p['unit']}',
                                  style: const TextStyle(color: Color(0xFF10B981), fontSize: 11, fontWeight: FontWeight.bold),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  'Shtrix: ${p['barcode'] ?? 'Yo\'q'}',
                                  style: const TextStyle(color: Color(0xFF64748B), fontSize: 10),
                                ),
                              ],
                            ),
                          ),
                          // Stock column
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              const Text('Qoldiq', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 9)),
                              Text(
                                '${currentStock.toInt()} ${p['unit']}',
                                style: TextStyle(
                                  color: currentStock <= 5 ? const Color(0xFFEF4444) : Colors.white,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 12,
                                ),
                              ),
                              if (reservedStock > 0)
                                Text('Band: ${reservedStock.toInt()}', style: const TextStyle(color: Color(0xFFF59E0B), fontSize: 9)),
                            ],
                          ),
                          const SizedBox(width: 12),
                          // Inline QR preview trigger
                          GestureDetector(
                            onTap: () => _showQrDialog(context, p),
                            child: Container(
                              color: Colors.white10,
                              padding: const EdgeInsets.all(4),
                              child: QrImageView(
                                data: p['qrCode'] ?? p['id'],
                                version: QrVersions.auto,
                                size: 30.0,
                                gapless: false,
                                eyeStyle: const QrEyeStyle(eyeShape: QrEyeShape.square, color: Colors.white),
                                dataModuleStyle: const QrDataModuleStyle(dataModuleShape: QrDataModuleShape.square, color: Colors.white),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          // Edit / Delete icons
                          Column(
                            children: [
                              IconButton(
                                onPressed: () => _openProductForm(p),
                                icon: const Icon(Icons.edit, color: Color(0xFF6366F1), size: 16),
                                constraints: const BoxConstraints(),
                                padding: const EdgeInsets.all(4),
                              ),
                              IconButton(
                                onPressed: () => _handleDeleteProduct(context, sync, p['id']),
                                icon: const Icon(Icons.delete_outline, color: Color(0xFFEF4444), size: 16),
                                constraints: const BoxConstraints(),
                                padding: const EdgeInsets.all(4),
                              ),
                            ],
                          )
                        ],
                      ),
                    );
                  },
                ),
        )
      ],
    );
  }

  void _showQrDialog(BuildContext context, dynamic product) {
    showDialog(
      context: context,
      builder: (context) {
        return Dialog(
          backgroundColor: const Color(0xFF16112B),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          child: Container(
            padding: const EdgeInsets.all(20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(product['name'], style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
                const SizedBox(height: 16),
                Container(
                  color: Colors.white,
                  padding: const EdgeInsets.all(12),
                  child: QrImageView(
                    data: product['qrCode'] ?? product['id'],
                    version: QrVersions.auto,
                    size: 180.0,
                  ),
                ),
                const SizedBox(height: 16),
                ElevatedButton.icon(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close, color: Colors.white),
                  label: const Text('Yopish', style: TextStyle(color: Colors.white)),
                  style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF6366F1)),
                )
              ],
            ),
          ),
        );
      },
    );
  }

  void _handleDeleteProduct(BuildContext context, SyncProvider sync, String id) {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          backgroundColor: const Color(0xFF16112B),
          title: const Text('O\'chirish', style: TextStyle(color: Colors.white)),
          content: const Text('Haqiqatdan ham ushbu mahsulotni sklad katalogidan o\'chirmoqchimisiz?', style: TextStyle(color: Color(0xFF94A3B8))),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Yo\'q', style: TextStyle(color: Color(0xFF6366F1))),
            ),
            TextButton(
              onPressed: () async {
                Navigator.pop(context);
                try {
                  await sync.deleteProduct(id);
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Mahsulot o\'chirildi'), backgroundColor: Color(0xFF10B981)),
                    );
                  }
                } catch (e) {
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Xatolik: $e'), backgroundColor: Colors.redAccent),
                    );
                  }
                }
              },
              child: const Text('Ha, o\'chirish', style: TextStyle(color: Color(0xFFEF4444))),
            )
          ],
        );
      },
    );
  }

  // --- TAB 3: DEBTS LEDGER ---
  Widget _buildDebtsTab(SyncProvider sync) {
    final double totalRemainingDebt = sync.debts.fold(0.0, (sum, item) {
      return sum + double.parse(item['remainingDebt'].toString());
    });

    return RefreshIndicator(
      onRefresh: () async {
        await sync.refreshOnlineData();
      },
      child: Column(
        children: [
          // Header debt summary
          Container(
            color: const Color(0xFF16112B),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Qarz Daftaridagi Mijozlar', style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold)),
                Text(
                  'Jami: ${_formatCurrency(totalRemainingDebt)}',
                  style: const TextStyle(color: Color(0xFFF59E0B), fontSize: 13, fontWeight: FontWeight.bold),
                )
              ],
            ),
          ),

          // Debts List
          Expanded(
            child: sync.debts.isEmpty
                ? const Center(child: Text('Hozircha qarzdorlar yo\'q. Barcha qarzlar yopilgan!', style: TextStyle(color: Color(0xFF10B981))))
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: sync.debts.length,
                    itemBuilder: (context, idx) {
                      final d = sync.debts[idx];
                      final remaining = double.parse(d['remainingDebt'].toString());
                      final total = double.parse(d['totalDebt'].toString());
                      
                      return Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        decoration: BoxDecoration(
                          color: const Color(0xFF16112B),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0x14FFFFFF)),
                        ),
                        padding: const EdgeInsets.all(16),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(d['clientName'], style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
                                  if (d['clientPhone'] != null && d['clientPhone'].toString().isNotEmpty) ...[
                                    const SizedBox(height: 4),
                                    Text(d['clientPhone'], style: const TextStyle(color: Color(0xFF64748B), fontSize: 11)),
                                  ],
                                ],
                              ),
                            ),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Text(_formatCurrency(remaining), style: const TextStyle(color: Color(0xFFEF4444), fontWeight: FontWeight.bold, fontSize: 13)),
                                Text('Jami olingan: ${_formatCurrencyShort(total)}', style: const TextStyle(color: Color(0xFF64748B), fontSize: 10)),
                                const SizedBox(height: 6),
                                if (remaining > 0)
                                  ElevatedButton(
                                    onPressed: () => _openDebtRepayment(d),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: const Color(0xFF10B981),
                                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                                      minimumSize: Size.zero,
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                                    ),
                                    child: const Text('Qoplash', style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                                  )
                              ],
                            )
                          ],
                        ),
                      );
                    },
                  ),
          )
        ],
      ),
    );
  }

  // Input styling
  InputDecoration _dialogInputDeco(String hint) {
    return InputDecoration(
      hintText: hint,
      hintStyle: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
      filled: true,
      fillColor: const Color(0x40000000),
      contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0x14FFFFFF))),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0x14FFFFFF))),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFF6366F1))),
    );
  }

  // Formatting helpers
  String _formatCurrency(double amount) {
    return '${amount.toStringAsFixed(0).replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (Match m) => '${m[1]} ')} UZS';
  }

  String _formatCurrencyShort(double amount) {
    if (amount >= 1000000) {
      return '${(amount / 1000000).toStringAsFixed(1)} mln UZS';
    } else if (amount >= 1000) {
      return '${(amount / 1000).toStringAsFixed(0)}k UZS';
    }
    return '${amount.toInt()} UZS';
  }
}
