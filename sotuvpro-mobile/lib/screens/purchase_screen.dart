import 'package:flutter/material.dart';
import '../models/product.dart';
import '../models/purchase.dart';
import '../models/user.dart';
import '../services/api_service.dart';
import '../data/database_helper.dart';
import '../theme/app_theme.dart';

class PurchaseScreen extends StatefulWidget {
  final User currentUser;

  const PurchaseScreen({Key? key, required this.currentUser}) : super(key: key);

  @override
  _PurchaseScreenState createState() => _PurchaseScreenState();
}

class _PurchaseScreenState extends State<PurchaseScreen> {
  final TextEditingController _supplierController = TextEditingController(text: 'Mega Stroy MCHJ');
  final TextEditingController _invoiceController = TextEditingController(text: 'INV-${DateTime.now().year}-${DateTime.now().month.toString().padLeft(2, '0')}');
  final TextEditingController _notesController = TextEditingController(text: '1-partiya yuk kirimi');
  final TextEditingController _paidAmountController = TextEditingController();

  List<Product> _allProducts = [];
  final List<PurchaseItem> _selectedItems = [];
  bool _isLoading = false;
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    _loadProducts();
  }

  Future<void> _loadProducts() async {
    setState(() => _isLoading = true);
    final response = await ApiService.instance.getProductsCatalog(tenantId: widget.currentUser.tenantId);
    List<Product> list = [];
    if (response.isSuccess && response.data != null) {
      final rawList = response.data as List<dynamic>;
      for (var json in rawList) {
        list.add(Product(
          id: json['id']?.toString() ?? '',
          tenantId: widget.currentUser.tenantId,
          name: json['name']?.toString() ?? '',
          purchaseUnit: json['purchase_unit']?.toString() ?? 'Dona',
          saleUnit: json['sale_unit']?.toString() ?? 'Dona',
          conversionRate: 1.0,
          price: double.tryParse(json['price_per_sale_unit']?.toString() ?? '0') ?? 0.0,
          costPrice: double.tryParse(json['cost_price']?.toString() ?? '0') ?? 0.0,
          stockQuantity: double.tryParse(json['available_stock']?.toString() ?? json['current_stock']?.toString() ?? '0') ?? 0.0,
          barcode: json['barcode']?.toString() ?? '',
          qrCode: json['qr_code']?.toString() ?? '',
          isSynced: true,
        ));
      }
    }
    if (list.isEmpty) {
      list = await DatabaseHelper.instance.getProducts(tenantId: widget.currentUser.tenantId);
    }
    setState(() {
      _allProducts = list;
      _isLoading = false;
    });
  }

  double get _totalInvoiceCost {
    return _selectedItems.fold(0.0, (sum, item) => sum + item.totalCost);
  }

  void _addItemToPurchase(Product product) {
    final qtyController = TextEditingController(text: '10');
    final costController = TextEditingController(text: product.costPrice > 0 ? product.costPrice.toStringAsFixed(0) : (product.price * 0.8).toStringAsFixed(0));
    final saleController = TextEditingController(text: product.price > 0 ? product.price.toStringAsFixed(0) : '0');

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.cardSurface,
        title: Text('${product.name} — Kirim Qilish', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: qtyController,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              autofocus: true,
              decoration: InputDecoration(
                labelText: 'Kirim Miqdori (${product.saleUnit})',
                prefixIcon: const Icon(Icons.numbers, color: AppTheme.primaryEmerald),
              ),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: costController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                labelText: 'Kelish Narxi / Tan Narxi (so\'m)',
                prefixIcon: Icon(Icons.shopping_bag_outlined, color: AppTheme.warningOrange),
              ),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: saleController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                labelText: 'Sotish Narxi (so\'m)',
                prefixIcon: Icon(Icons.attach_money, color: AppTheme.accentNeon),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Bekor qilish', style: TextStyle(color: AppTheme.textMuted)),
          ),
          ElevatedButton(
            onPressed: () {
              final qty = double.tryParse(qtyController.text.trim()) ?? 0.0;
              final cost = double.tryParse(costController.text.trim()) ?? 0.0;
              final sale = double.tryParse(saleController.text.trim()) ?? 0.0;

              if (qty <= 0) return;

              setState(() {
                _selectedItems.removeWhere((i) => i.productId == product.id);
                _selectedItems.add(PurchaseItem(
                  productId: product.id,
                  productName: product.name,
                  quantity: qty,
                  costPrice: cost,
                  salePrice: sale,
                ));
                _paidAmountController.text = _totalInvoiceCost.toStringAsFixed(0);
              });
              Navigator.pop(ctx);
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primaryEmerald),
            child: const Text('Hujjatga Qo\'shish'),
          ),
        ],
      ),
    );
  }

  void _showAddProductModal() {
    final searchController = TextEditingController();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppTheme.cardSurface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) {
          final query = searchController.text.trim().toLowerCase();
          final filtered = query.isEmpty
              ? _allProducts
              : _allProducts.where((p) => p.name.toLowerCase().contains(query) || p.barcode.contains(query)).toList();

          return Container(
            height: MediaQuery.of(context).size.height * 0.75,
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('📦 Kirim Ulanadigan Tovarni Tanlang', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                    IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(context)),
                  ],
                ),
                TextField(
                  controller: searchController,
                  onChanged: (_) => setModalState(() {}),
                  decoration: const InputDecoration(
                    hintText: 'Tovar nomi yoki shtrix-kodi bo\'yicha izlang...',
                    prefixIcon: Icon(Icons.search, color: AppTheme.primaryEmerald),
                  ),
                ),
                const SizedBox(height: 12),
                Expanded(
                  child: ListView.builder(
                    itemCount: filtered.length,
                    itemBuilder: (context, index) {
                      final p = filtered[index];
                      return Card(
                        color: AppTheme.darkBackground,
                        child: ListTile(
                          title: Text(p.name, style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                          subtitle: Text('Joriy qoldiq: ${p.stockQuantity} ${p.saleUnit} | Tan narx: ${p.costPrice.toStringAsFixed(0)} UZS', style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
                          trailing: IconButton(
                            icon: const Icon(Icons.add_circle, color: AppTheme.primaryEmerald, size: 28),
                            onPressed: () {
                              Navigator.pop(context);
                              _addItemToPurchase(p);
                            },
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Future<void> _submitPurchase() async {
    if (_selectedItems.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Hujjatga kamida 1 ta tovar qo\'shing!'), backgroundColor: AppTheme.dangerRed),
      );
      return;
    }

    final supplier = _supplierController.text.trim();
    final invoice = _invoiceController.text.trim();
    final notes = _notesController.text.trim();
    final paidAmount = double.tryParse(_paidAmountController.text.trim()) ?? _totalInvoiceCost;

    setState(() => _isSubmitting = true);

    final payload = {
      'supplier_name': supplier.isNotEmpty ? supplier : 'Noma\'lum Ta\'minotchi',
      'invoice_number': invoice,
      'notes': notes,
      'items': _selectedItems.map((i) => i.toMap()).toList(),
      'paid_amount': paidAmount,
    };

    final response = await ApiService.instance.createPurchase(payload);

    setState(() => _isSubmitting = false);

    if (response.isSuccess) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Skladga yuk muvaffaqiyatli kirim qilindi!'), backgroundColor: AppTheme.primaryEmerald),
      );
      Navigator.pop(context, true);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(response.errorDetail ?? 'Kirim qilishda xatolik yuz berdi.'), backgroundColor: AppTheme.dangerRed),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.darkBackground,
      appBar: AppBar(
        title: const Text('Sklad Kirim Hujjati (Prixod)'),
        actions: [
          IconButton(
            icon: const Icon(Icons.playlist_add, color: AppTheme.primaryEmerald, size: 28),
            onPressed: _showAddProductModal,
            tooltip: 'Tovar Qo\'shish',
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.primaryEmerald))
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppTheme.cardSurface,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('📋 Kirim Hujjati Rekvizitlari', style: TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primaryEmerald)),
                        const SizedBox(height: 10),
                        TextField(
                          controller: _supplierController,
                          decoration: const InputDecoration(
                            labelText: 'Ta\'minotchi (Postavshik)',
                            prefixIcon: Icon(Icons.business, size: 20),
                          ),
                        ),
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            Expanded(
                              child: TextField(
                                controller: _invoiceController,
                                decoration: const InputDecoration(
                                  labelText: 'Faktura №',
                                  prefixIcon: Icon(Icons.receipt_long, size: 20),
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: TextField(
                                controller: _notesController,
                                decoration: const InputDecoration(
                                  labelText: 'Izoh',
                                  prefixIcon: Icon(Icons.note_alt_outlined, size: 20),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Kirim Tovarlari (${_selectedItems.length})', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                      ElevatedButton.icon(
                        onPressed: _showAddProductModal,
                        icon: const Icon(Icons.add, size: 18),
                        label: const Text('Tovar Qo\'shish'),
                        style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primaryEmerald),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  if (_selectedItems.isEmpty)
                    Container(
                      padding: const EdgeInsets.all(24),
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: AppTheme.cardSurface,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Column(
                        children: [
                          Icon(Icons.inventory_2_outlined, size: 40, color: AppTheme.textMuted),
                          SizedBox(height: 8),
                          Text('Hujjatga hali tovar qo\'shilmadi.', style: TextStyle(color: AppTheme.textSecondary)),
                        ],
                      ),
                    )
                  else
                    ListView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: _selectedItems.length,
                      itemBuilder: (context, index) {
                        final item = _selectedItems[index];
                        return Card(
                          color: AppTheme.cardSurface,
                          margin: const EdgeInsets.only(bottom: 8),
                          child: ListTile(
                            title: Text(item.productName, style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                            subtitle: Text(
                              'Miqdor: ${item.quantity} | Tan narx: ${item.costPrice.toStringAsFixed(0)} UZS | Sotish: ${item.salePrice.toStringAsFixed(0)} UZS\n'
                              'Jami: ${item.totalCost.toStringAsFixed(0)} UZS',
                              style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                            ),
                            trailing: IconButton(
                              icon: const Icon(Icons.delete_outline, color: AppTheme.dangerRed),
                              onPressed: () {
                                setState(() {
                                  _selectedItems.removeAt(index);
                                  _paidAmountController.text = _totalInvoiceCost.toStringAsFixed(0);
                                });
                              },
                            ),
                          ),
                        );
                      },
                    ),
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppTheme.cardSurface,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppTheme.accentNeon.withOpacity(0.4)),
                    ),
                    child: Column(
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Jami Faktura Summasi:', style: TextStyle(fontSize: 14, color: AppTheme.textSecondary)),
                            Text(
                              '${_totalInvoiceCost.toStringAsFixed(0)} UZS',
                              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.accentNeon),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        TextField(
                          controller: _paidAmountController,
                          keyboardType: TextInputType.number,
                          decoration: const InputDecoration(
                            labelText: 'Ta\'minotchiga To\'langan Summa (so\'m)',
                            prefixIcon: Icon(Icons.payments_outlined, color: AppTheme.primaryEmerald),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: ElevatedButton(
                      onPressed: _isSubmitting ? null : _submitPurchase,
                      style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primaryEmerald),
                      child: _isSubmitting
                          ? const CircularProgressIndicator(color: Colors.white)
                          : const Text('SKLADGA YUKNI KIRIM QILISH', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                    ),
                  ),
                ],
              ),
            ),
    );
  }
}
