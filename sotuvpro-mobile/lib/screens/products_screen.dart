import 'package:flutter/material.dart';
import 'package:uuid/uuid.dart';
import '../data/database_helper.dart';
import '../models/product.dart';
import '../models/user.dart';
import '../services/api_service.dart';
import '../services/printer_service.dart';
import '../theme/app_theme.dart';
import 'scanner_screen.dart';
import 'purchase_screen.dart';

class ProductsScreen extends StatefulWidget {
  final User currentUser;

  const ProductsScreen({Key? key, required this.currentUser}) : super(key: key);

  @override
  _ProductsScreenState createState() => _ProductsScreenState();
}

class _ProductsScreenState extends State<ProductsScreen> {
  final TextEditingController _searchController = TextEditingController();
  List<Product> _products = [];
  List<Product> _filteredProducts = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadProducts();
    _searchController.addListener(_filterProducts);
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadProducts() async {
    setState(() => _isLoading = true);
    List<Product> list = [];

    // Backend API serverdan tovarlarni olish (GET /api/v1/products/) hamda oflayn sinxronizatsiya
    final response = await ApiService.instance.getProductsCatalog(tenantId: widget.currentUser.tenantId);
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
          lowStockThreshold: 10,
          isSynced: json['is_synced'] == true,
        ));
      }
    } else {
      // Server so'rovi bajarilmagandagina (masalan, internet bo'lmaganda) SQLite local bazadan olamiz
      list = await DatabaseHelper.instance.getProducts(tenantId: widget.currentUser.tenantId);
    }

    setState(() {
      _products = list;
      _filteredProducts = list;
      _isLoading = false;
    });
  }

  void _showRepriceDialog(Product product) {
    final priceController = TextEditingController(text: product.price.toStringAsFixed(0));
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.cardSurface,
        title: Text('${product.name} — Qayta Narxlash (Pereotsenka)', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Joriy sotish narxi: ${product.price.toStringAsFixed(0)} UZS / ${product.saleUnit}', style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13)),
            const SizedBox(height: 12),
            TextField(
              controller: priceController,
              keyboardType: TextInputType.number,
              autofocus: true,
              decoration: const InputDecoration(
                labelText: 'Yangi Sotish Narxi (so\'m)',
                prefixIcon: Icon(Icons.edit_note, color: AppTheme.primaryEmerald),
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
            onPressed: () async {
              final newPrice = double.tryParse(priceController.text.trim()) ?? 0.0;
              if (newPrice <= 0) return;
              final res = await ApiService.instance.repriceProduct(product.id, newPrice);
              if (res.isSuccess) {
                await DatabaseHelper.instance.updateProductStock(product.id, product.stockQuantity, newPrice: newPrice);
                if (mounted) {
                  Navigator.pop(ctx);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Mahsulot narxi muvaffaqiyatli yangilandi!'), backgroundColor: AppTheme.primaryEmerald),
                  );
                  _loadProducts();
                }
              } else {
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(res.errorDetail ?? 'Narxni o\'zgartirishda xatolik!'), backgroundColor: AppTheme.dangerRed),
                  );
                }
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primaryEmerald),
            child: const Text('Narxni Saqlash'),
          ),
        ],
      ),
    );
  }

  void _filterProducts() {
    final query = _searchController.text.trim().toLowerCase();
    if (query.isEmpty) {
      setState(() => _filteredProducts = _products);
    } else {
      setState(() {
        _filteredProducts = _products.where((p) {
          return p.name.toLowerCase().contains(query) ||
              p.barcode.toLowerCase().contains(query) ||
              p.qrCode.toLowerCase().contains(query);
        }).toList();
      });
    }
  }

  void _openAddProductScanner() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => ScannerScreen(
          mode: ScannerMode.addProduct,
          onProductCreated: (newProduct) {
            _loadProducts();
          },
        ),
      ),
    ).then((_) => _loadProducts());
  }

  void _showManualAddProductDialog() {
    final nameController = TextEditingController();
    final priceController = TextEditingController();
    final stockController = TextEditingController(text: '100');
    final barcodeController = TextEditingController(
      text: '478${const Uuid().v4().replaceAll('-', '').substring(0, 10)}',
    );
    String purchaseUnit = 'Dona';
    String saleUnit = 'Dona';

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) {
          return AlertDialog(
            backgroundColor: AppTheme.cardSurface,
            title: const Text('Qo\'lda Yangi Mahsulot Yaratish', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextField(
                    controller: nameController,
                    autofocus: true,
                    decoration: const InputDecoration(labelText: 'Mahsulot Nomi (Masalan: Sement M500)'),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: priceController,
                          keyboardType: TextInputType.number,
                          decoration: const InputDecoration(labelText: 'Sotish Narxi (so\'m)'),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: TextField(
                          controller: stockController,
                          keyboardType: TextInputType.number,
                          decoration: InputDecoration(labelText: 'Qoldiq Miqdori ($saleUnit)'),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          value: purchaseUnit,
                          decoration: const InputDecoration(labelText: 'Kelish Birligi'),
                          items: ['Dona', 'Qop', 'Tonna', 'Rulon', 'Karobka', 'Blok'].map((u) => DropdownMenuItem(value: u, child: Text(u))).toList(),
                          onChanged: (val) => setModalState(() => purchaseUnit = val!),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          value: saleUnit,
                          decoration: const InputDecoration(labelText: 'Sotish Birligi'),
                          items: ['Dona', 'Kg', 'Metr', 'Liter'].map((u) => DropdownMenuItem(value: u, child: Text(u))).toList(),
                          onChanged: (val) => setModalState(() => saleUnit = val!),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: barcodeController,
                    decoration: const InputDecoration(
                      labelText: 'Shtrix/QR Kod (Unikal)',
                      prefixIcon: Icon(Icons.qr_code),
                    ),
                  ),
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Bekor qilish', style: TextStyle(color: AppTheme.textMuted)),
              ),
              ElevatedButton(
                onPressed: () async {
                  final name = nameController.text.trim();
                  final price = double.tryParse(priceController.text.trim()) ?? 0.0;
                  final stock = double.tryParse(stockController.text.trim()) ?? 0.0;
                  final cleanBarcode = barcodeController.text.trim();

                  if (name.isEmpty || price <= 0) return;

                  if (cleanBarcode.isNotEmpty) {
                    final existingProduct = await DatabaseHelper.instance.getProductByCode(cleanBarcode, tenantId: widget.currentUser.tenantId);
                    if (existingProduct != null) {
                      final updatedStock = existingProduct.stockQuantity + stock;
                      final updatePayload = {
                        'current_stock': updatedStock,
                        'price_per_sale_unit': price,
                      };

                      await ApiService.instance.updateProduct(existingProduct.id, updatePayload);
                      await DatabaseHelper.instance.updateProductStock(existingProduct.id, updatedStock, newPrice: price);

                      if (mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text('Ushbu shtrix-kodli tovar allaqachon mavjud! Ombor qoldig\'iga +$stock $saleUnit qo\'shildi. Yangi qoldiq: $updatedStock $saleUnit'),
                            backgroundColor: AppTheme.primaryEmerald,
                            duration: const Duration(seconds: 3),
                          ),
                        );

                        Navigator.pop(context);
                        _loadProducts();
                      }
                      return;
                    }
                  }

                  final productData = {
                    'name': name,
                    'purchase_unit': purchaseUnit,
                    'sale_unit': saleUnit,
                    'conversion_rate': 1.0,
                    'price_per_sale_unit': price,
                    'current_stock': stock,
                    'barcode': cleanBarcode,
                    'qr_code': cleanBarcode,
                  };

                  final apiRes = await ApiService.instance.createProduct(productData);
                  final bool isOnlineSuccess = apiRes.isSuccess && apiRes.data != null;

                  final newProduct = Product(
                    id: isOnlineSuccess ? (apiRes.data!['id']?.toString() ?? const Uuid().v4()) : const Uuid().v4(),
                    tenantId: widget.currentUser.tenantId,
                    name: name,
                    purchaseUnit: purchaseUnit,
                    saleUnit: saleUnit,
                    conversionRate: 1.0,
                    price: price,
                    stockQuantity: stock,
                    barcode: cleanBarcode,
                    qrCode: cleanBarcode,
                    isSynced: isOnlineSuccess,
                  );

                  await DatabaseHelper.instance.addProduct(newProduct);

                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(
                          isOnlineSuccess
                              ? 'Mahsulot serverga saqlandi!'
                              : 'Oflayn rejim: Mahsulot lokal bazaga saqlandi. Internet bo\'lganda avto-sinxronlanadi.',
                        ),
                        backgroundColor: isOnlineSuccess ? AppTheme.primaryEmerald : AppTheme.warningOrange,
                        duration: const Duration(seconds: 3),
                      ),
                    );

                    Navigator.pop(context);
                    await PrinterService.instance.printOrShareProductLabel(context, product: newProduct);
                    _loadProducts();
                  }
                },
                child: const Text('Serverga Saqlash'),
              ),
            ],
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.darkBackground,
      appBar: AppBar(
        title: const Text('Mahsulotlar Katalogi (Ombor)'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_shopping_cart, color: AppTheme.accentNeon),
            tooltip: 'Sklad Prixod (Yuk Kirimi)',
            onPressed: () async {
              final updated = await Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => PurchaseScreen(currentUser: widget.currentUser),
                ),
              );
              if (updated == true) _loadProducts();
            },
          ),
          IconButton(
            icon: const Icon(Icons.qr_code_scanner, color: AppTheme.primaryEmerald),
            tooltip: 'Skaner Orqali Tovar Qo\'shish',
            onPressed: _openAddProductScanner,
          ),
          IconButton(
            icon: const Icon(Icons.refresh, color: AppTheme.textSecondary),
            tooltip: 'Yangilash',
            onPressed: _loadProducts,
          ),
        ],
      ),
      body: Column(
        children: [
          // Search Input Field
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Mahsulot nomi yoki shtrix-kodi bo\'yicha izlash...',
                prefixIcon: const Icon(Icons.search, color: AppTheme.textSecondary),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, color: AppTheme.textMuted),
                        onPressed: () {
                          _searchController.clear();
                        },
                      )
                    : null,
                filled: true,
                fillColor: AppTheme.cardSurface,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
          ),

          // Products Count Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16.0),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Barcha Tovar: ${_filteredProducts.length} ta',
                  style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13, fontWeight: FontWeight.bold),
                ),
                TextButton.icon(
                  onPressed: _showManualAddProductDialog,
                  icon: const Icon(Icons.add, size: 16, color: AppTheme.accentNeon),
                  label: const Text('Qo\'lda kiritish', style: TextStyle(color: AppTheme.accentNeon, fontSize: 12)),
                ),
              ],
            ),
          ),

          const SizedBox(height: 6),

          // Products ListView
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: AppTheme.primaryEmerald))
                : _filteredProducts.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.inventory_2_outlined, size: 64, color: AppTheme.textMuted.withOpacity(0.5)),
                            const SizedBox(height: 16),
                            const Text(
                              'Mahsulotlar topilmadi',
                              style: TextStyle(color: AppTheme.textSecondary, fontSize: 16),
                            ),
                            const SizedBox(height: 8),
                            const Text(
                              'Skanerlash yoki "+ YANGI MAHSULOT" tugmasini bosing',
                              style: TextStyle(color: AppTheme.textMuted, fontSize: 12),
                            ),
                          ],
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: _loadProducts,
                        color: AppTheme.primaryEmerald,
                        child: ListView.builder(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          itemCount: _filteredProducts.length,
                          itemBuilder: (context, index) {
                            final p = _filteredProducts[index];
                            return Card(
                              margin: const EdgeInsets.only(bottom: 10),
                              child: ListTile(
                                leading: Container(
                                  padding: const EdgeInsets.all(10),
                                  decoration: BoxDecoration(
                                    color: AppTheme.primaryEmerald.withOpacity(0.15),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: const Icon(Icons.category, color: AppTheme.primaryEmerald, size: 22),
                                ),
                                title: Text(
                                  p.name,
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppTheme.textPrimary),
                                ),
                                subtitle: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const SizedBox(height: 4),
                                    Text(
                                      '${p.price.toStringAsFixed(0)} so\'m / ${p.saleUnit}',
                                      style: const TextStyle(color: AppTheme.accentNeon, fontWeight: FontWeight.bold, fontSize: 13),
                                    ),
                                    const SizedBox(height: 2),
                                    Row(
                                      children: [
                                        Text(
                                          'Qoldiq: ${p.stockQuantity} ${p.saleUnit}',
                                          style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12),
                                        ),
                                        const SizedBox(width: 6),
                                        if (p.barcode.isNotEmpty)
                                          Flexible(
                                            child: Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                              decoration: BoxDecoration(
                                                color: Colors.white10,
                                                borderRadius: BorderRadius.circular(4),
                                              ),
                                              child: Text(
                                                p.barcode,
                                                maxLines: 1,
                                                overflow: TextOverflow.ellipsis,
                                                style: const TextStyle(fontSize: 10, color: AppTheme.textMuted),
                                              ),
                                            ),
                                          ),
                                        if (!p.isSynced) ...[
                                          const SizedBox(width: 6),
                                          const Tooltip(
                                            message: 'Serverga sinxronlanmagan (Oflayn)',
                                            child: Icon(
                                              Icons.cloud_upload_outlined,
                                              size: 16,
                                              color: AppTheme.warningOrange,
                                            ),
                                          ),
                                        ],
                                      ],
                                    ),
                                  ],
                                ),
                                trailing: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    IconButton(
                                      icon: const Icon(Icons.edit_note_outlined, color: AppTheme.accentNeon),
                                      tooltip: 'Pereotsenka (Qayta narxlash)',
                                      onPressed: () => _showRepriceDialog(p),
                                    ),
                                    IconButton(
                                      icon: const Icon(Icons.print_outlined, color: AppTheme.textSecondary),
                                      tooltip: 'Yorliq chop etish',
                                      onPressed: () {
                                        PrinterService.instance.printOrShareProductLabel(context, product: p);
                                      },
                                    ),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                      ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openAddProductScanner,
        backgroundColor: AppTheme.primaryEmerald,
        icon: const Icon(Icons.qr_code_scanner, color: Colors.white),
        label: const Text(
          'SKANER QILISH (SKANER)',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
        ),
      ),
    );
  }
}
