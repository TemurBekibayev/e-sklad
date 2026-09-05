import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:audioplayers/audioplayers.dart';
import 'package:uuid/uuid.dart';
import '../data/database_helper.dart';
import '../models/product.dart';
import '../services/api_service.dart';
import '../services/printer_service.dart';
import '../theme/app_theme.dart';

enum ScannerMode { sale, addProduct }

class ScannerScreen extends StatefulWidget {
  final Function(Product product, double quantity)? onProductScanned;
  final Function(Product product)? onProductCreated;
  final ScannerMode mode;

  const ScannerScreen({
    Key? key,
    this.onProductScanned,
    this.onProductCreated,
    this.mode = ScannerMode.sale,
  }) : super(key: key);

  @override
  _ScannerScreenState createState() => _ScannerScreenState();
}

class _ScannerScreenState extends State<ScannerScreen> with SingleTickerProviderStateMixin {
  final MobileScannerController _controller = MobileScannerController();
  late AnimationController _laserAnimationController;
  late Animation<double> _laserAnimation;
  final AudioPlayer _audioPlayer = AudioPlayer();

  bool _isProcessing = false;
  bool _isTorchOn = false;

  @override
  void initState() {
    super.initState();

    // Skaner chizig'i uchun tepadan pastga harakatlanuvchi animatsiya (2 soniya)
    _laserAnimationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1800),
    )..repeat(reverse: true);

    _laserAnimation = Tween<double>(begin: 0.0, end: 240.0).animate(
      CurvedAnimation(parent: _laserAnimationController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _laserAnimationController.dispose();
    _audioPlayer.dispose();
    _controller.dispose();
    super.dispose();
  }

  /// Supermarket skaner ovozini (beep.mp3) chiqarish
  Future<void> _playBeepSound() async {
    try {
      SystemSound.play(SystemSoundType.click);
      await _audioPlayer.play(AssetSource('sound/beep.mp3'));
    } catch (_) {}
  }

  void _handleCodeScanned(String rawCode) async {
    if (_isProcessing) return;
    final code = rawCode.trim();
    if (code.isEmpty) return;

    setState(() => _isProcessing = true);

    // Skaner ovozini chiqarish
    await _playBeepSound();

    Map<String, dynamic>? productData;

    // 1. Avval mahalliy (SQLite) bazadan izlaymiz (Offline-First)
    final localProduct = await DatabaseHelper.instance.getProductByCode(code);
    if (localProduct != null) {
      productData = {
        'id': localProduct.id,
        'tenant_id': localProduct.tenantId,
        'name': localProduct.name,
        'purchase_unit': localProduct.purchaseUnit,
        'sale_unit': localProduct.saleUnit,
        'price_per_sale_unit': localProduct.price,
        'available_stock': localProduct.stockQuantity,
        'current_stock': localProduct.stockQuantity,
        'barcode': localProduct.barcode,
        'qr_code': localProduct.qrCode,
        'exists_globally': false,
      };
    } else {
      // 2. Mahalliy bazada topilmasa server API orqali qidiramiz
      final response = await ApiService.instance.lookupProductByBarcode(code);
      if (response.isSuccess && response.data != null) {
        productData = response.data as Map<String, dynamic>;
      }
    }

    if (widget.mode == ScannerMode.sale) {
      // 1. SOTISH REJIMI (KASSA SKANERI)
      if (productData != null) {
        final product = Product(
          id: productData['id']?.toString() ?? const Uuid().v4(),
          tenantId: productData['tenant_id']?.toString() ?? 'tenant_store_101',
          name: productData['name']?.toString() ?? 'Mahsulot',
          purchaseUnit: productData['purchase_unit']?.toString() ?? 'Dona',
          saleUnit: productData['sale_unit']?.toString() ?? 'Dona',
          conversionRate: 1.0,
          price: double.tryParse(productData['price_per_sale_unit']?.toString() ?? '0') ?? 0.0,
          stockQuantity: double.tryParse(productData['available_stock']?.toString() ?? productData['current_stock']?.toString() ?? '0') ?? 0.0,
          barcode: productData['barcode']?.toString() ?? code,
          qrCode: productData['qr_code']?.toString() ?? code,
          lowStockThreshold: 10,
          isTopSeller: true,
        );

        await DatabaseHelper.instance.addProduct(product);

        if (mounted) {
          _showQuantityDialog(product);
        }
      } else {
        // Kassa jarayonida mahsulot topilmadi -> yangi tovar yaratish formasi ochilmaydi
        if (mounted) {
          _showNotFoundInSaleDialog(code);
        }
      }
    } else {
      // 2. MAHSULOT YARATISH / OMBOR REJIMI (OMBOR / KATALOG)
      if (productData != null) {
        final bool existsGlobally = productData['exists_globally'] == true;

        if (existsGlobally) {
          // Global bazada (boshqa do'konga tegishli) topildi -> Nom va birliklarni avto to'ldiramiz
          if (mounted) {
            _showRegisterNewProductDialog(
              code: code,
              initialName: productData['name']?.toString(),
              initialPurchaseUnit: productData['purchase_unit']?.toString(),
              initialSaleUnit: productData['sale_unit']?.toString(),
              initialPrice: productData['price_per_sale_unit']?.toString(),
              isGlobalMatch: true,
            );
          }
        } else {
          // Do'konning o'zida allaqachon mavjud -> Ombor qoldig'ini oshirish (Kirim) oynasini ochamiz!
          if (mounted) {
            _showRestockProductDialog(
              productData['id']?.toString() ?? '',
              productData['name']?.toString() ?? 'Mahsulot',
              double.tryParse(productData['available_stock']?.toString() ?? productData['current_stock']?.toString() ?? '0') ?? 0.0,
              double.tryParse(productData['price_per_sale_unit']?.toString() ?? '0') ?? 0.0,
              productData['sale_unit']?.toString() ?? 'Dona',
              barcode: productData['barcode']?.toString() ?? code,
              qrCode: productData['qr_code']?.toString() ?? code,
            );
          }
        }
      } else {
        // Mutlaqo topilmadi -> Yangi mahsulot yaratish formasi
        if (mounted) {
          _showRegisterNewProductDialog(code: code);
        }
      }
    }
  }

  void _showNotFoundInSaleDialog(String code) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppTheme.cardSurface,
        title: const Row(
          children: [
            Icon(Icons.warning_amber_rounded, color: AppTheme.warningOrange),
            SizedBox(width: 8),
            Text('Mahsulot Topilmadi', style: TextStyle(fontSize: 16)),
          ],
        ),
        content: Text(
          'Shtrix-kod ($code) bazada topilmadi.\n\nKassa jarayonida yangi tovar yaratib bo\'lmaydi. Yangi tovar qo\'shish uchun "Mahsulotlar" bo\'limidan foydalaning.',
          style: const TextStyle(color: AppTheme.textSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              setState(() => _isProcessing = false);
            },
            child: const Text('Tushunarli', style: TextStyle(color: AppTheme.primaryEmerald)),
          ),
        ],
      ),
    );
  }

  void _showRestockProductDialog(
    String productId,
    String productName,
    double currentStock,
    double currentPrice,
    String saleUnit, {
    String barcode = '',
    String qrCode = '',
  }) {
    final addQtyController = TextEditingController(text: '10');
    final priceController = TextEditingController(text: currentPrice.toStringAsFixed(0));

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) {
          double addedQty = double.tryParse(addQtyController.text.trim()) ?? 0.0;
          double totalNewStock = currentStock + addedQty;

          return AlertDialog(
            backgroundColor: AppTheme.cardSurface,
            title: const Row(
              children: [
                Icon(Icons.add_business_outlined, color: AppTheme.primaryEmerald),
                SizedBox(width: 8),
                Text('Ombor Qoldig\'ini Oshirish', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              ],
            ),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppTheme.primaryEmerald.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: AppTheme.primaryEmerald.withOpacity(0.4)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          productName,
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppTheme.textPrimary),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Hozirgi ombor qoldig\'i: ${currentStock.toStringAsFixed(1)} $saleUnit',
                          style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),

                  TextField(
                    controller: addQtyController,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    autofocus: true,
                    onChanged: (_) => setModalState(() {}),
                    decoration: InputDecoration(
                      labelText: 'Yangi kelgan miqdor (Kirim)',
                      suffixText: saleUnit,
                      prefixIcon: const Icon(Icons.exposure_plus_1, color: AppTheme.primaryEmerald),
                    ),
                  ),
                  const SizedBox(height: 10),

                  TextField(
                    controller: priceController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: 'Sotish narxi (so\'m)',
                      prefixIcon: Icon(Icons.attach_money, color: AppTheme.accentNeon),
                    ),
                  ),

                  const SizedBox(height: 14),
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppTheme.darkBackground,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Kirimdan so\'ng yangi qoldiq:', style: TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
                        Text(
                          '${totalNewStock.toStringAsFixed(1)} $saleUnit',
                          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppTheme.accentNeon),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed: () {
                  Navigator.pop(context);
                  setState(() => _isProcessing = false);
                },
                child: const Text('Bekor qilish', style: TextStyle(color: AppTheme.textMuted)),
              ),
              ElevatedButton(
                onPressed: () async {
                  final added = double.tryParse(addQtyController.text.trim()) ?? 0.0;
                  final newPrice = double.tryParse(priceController.text.trim()) ?? currentPrice;

                  if (added <= 0) return;

                  final finalStock = currentStock + added;

                  final updatePayload = {
                    'current_stock': finalStock,
                    'price_per_sale_unit': newPrice,
                  };

                  if (productId.isNotEmpty) {
                    await ApiService.instance.updateProduct(productId, updatePayload);
                    await DatabaseHelper.instance.updateProductStock(productId, finalStock, newPrice: newPrice);
                  }

                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('Ombor qoldig\'iga +$added $saleUnit qo\'shildi! Yangi qoldiq: $finalStock $saleUnit'),
                        backgroundColor: AppTheme.primaryEmerald,
                      ),
                    );

                    Navigator.pop(context);
                    Navigator.pop(context);
                    if (widget.onProductCreated != null) {
                      final updatedProd = Product(
                        id: productId,
                        tenantId: 'tenant_store_101',
                        name: productName,
                        purchaseUnit: saleUnit,
                        saleUnit: saleUnit,
                        conversionRate: 1.0,
                        price: newPrice,
                        stockQuantity: finalStock,
                        barcode: barcode,
                        qrCode: qrCode.isNotEmpty ? qrCode : barcode,
                      );
                      widget.onProductCreated!(updatedProd);
                    }
                  }
                },
                child: const Text('Omborga Qo\'shish (Saqlash)'),
              ),
            ],
          );
        },
      ),
    );
  }

  void _showQuantityDialog(Product product) {
    final qtyController = TextEditingController(text: '1');

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        backgroundColor: AppTheme.cardSurface,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Mahsulot Topildi!', style: TextStyle(color: AppTheme.primaryEmerald, fontSize: 16)),
            const SizedBox(height: 4),
            Text(product.name, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Sotish narxi: ${product.price.toStringAsFixed(0)} so\'m / ${product.saleUnit}', style: const TextStyle(color: AppTheme.textSecondary)),
            Text('Ombor qoldig\'i: ${product.stockQuantity} ${product.saleUnit}', style: const TextStyle(color: AppTheme.textMuted, fontSize: 12)),
            const SizedBox(height: 16),
            TextField(
              controller: qtyController,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              autofocus: true,
              decoration: InputDecoration(
                labelText: 'Miqdorni kiriting (${product.saleUnit})',
                suffixText: product.saleUnit,
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              setState(() => _isProcessing = false);
            },
            child: const Text('Bekor qilish', style: TextStyle(color: AppTheme.textMuted)),
          ),
          ElevatedButton(
            onPressed: () {
              final qty = double.tryParse(qtyController.text.trim()) ?? 1.0;
              Navigator.pop(context);
              Navigator.pop(context);
              if (widget.onProductScanned != null) {
                widget.onProductScanned!(product, qty);
              }
            },
            child: const Text('Savatga qo\'shish'),
          ),
        ],
      ),
    );
  }

  void _showRegisterNewProductDialog({
    String? code,
    String? initialName,
    String? initialPurchaseUnit,
    String? initialSaleUnit,
    String? initialPrice,
    bool isGlobalMatch = false,
  }) {
    final nameController = TextEditingController(text: initialName ?? '');
    final priceController = TextEditingController(text: initialPrice ?? '');
    final stockController = TextEditingController(text: '100');
    final barcodeController = TextEditingController(text: code ?? '');

    final availableUnits = ['Dona', 'Qop', 'Tonna', 'Rulon', 'Karobka', 'Blok', 'Kg', 'Metr', 'Liter'];

    String purchaseUnit = availableUnits.contains(initialPurchaseUnit) ? initialPurchaseUnit! : 'Dona';
    String saleUnit = availableUnits.contains(initialSaleUnit) ? initialSaleUnit! : 'Dona';
    double conversionRate = 1;

    if (code == null || code.isEmpty) {
      barcodeController.text = 'QR-${const Uuid().v4().substring(0, 8).toUpperCase()}';
    }

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) {
          return AlertDialog(
            backgroundColor: AppTheme.cardSurface,
            title: Text(
              isGlobalMatch ? '🌍 Global Bazadan Qo\'shish' : 'Yangi Mahsulot Qo\'shish',
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: isGlobalMatch
                          ? AppTheme.accentCyan.withOpacity(0.15)
                          : AppTheme.primaryEmerald.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: isGlobalMatch ? AppTheme.accentCyan : AppTheme.primaryEmerald.withOpacity(0.4),
                      ),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          isGlobalMatch ? Icons.public : Icons.info_outline,
                          color: isGlobalMatch ? AppTheme.accentCyan : AppTheme.primaryEmerald,
                          size: 22,
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            isGlobalMatch
                                ? 'Global bazada topildi! Nomi hamda birliklari avtomatik to\'ldirildi. Do\'koningiz narxi va qoldiqni kiriting.'
                                : 'Skaner qilingan kod (${barcodeController.text}) bazaga yangi tovar bo\'lib qo\'shiladi.',
                            style: TextStyle(
                              fontSize: 11,
                              color: isGlobalMatch ? AppTheme.accentCyan : AppTheme.textSecondary,
                              fontWeight: isGlobalMatch ? FontWeight.w600 : FontWeight.normal,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),
                  TextField(
                    controller: nameController,
                    decoration: const InputDecoration(labelText: 'Mahsulot Nomi (Masalan: Coca-Cola 1.5 L)'),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: priceController,
                          keyboardType: TextInputType.number,
                          autofocus: isGlobalMatch,
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
                          items: availableUnits.map((u) => DropdownMenuItem(value: u, child: Text(u))).toList(),
                          onChanged: (val) => setModalState(() => purchaseUnit = val!),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          value: saleUnit,
                          decoration: const InputDecoration(labelText: 'Sotish Birligi'),
                          items: availableUnits.map((u) => DropdownMenuItem(value: u, child: Text(u))).toList(),
                          onChanged: (val) => setModalState(() => saleUnit = val!),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),

                  TextField(
                    controller: barcodeController,
                    readOnly: true,
                    decoration: const InputDecoration(
                      labelText: 'Shtrix/QR Kod (Skaner qilingan)',
                      prefixIcon: Icon(Icons.qr_code, color: AppTheme.primaryEmerald),
                    ),
                  ),
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed: () {
                  Navigator.pop(context);
                  setState(() => _isProcessing = false);
                },
                child: const Text('Bekor qilish', style: TextStyle(color: AppTheme.textMuted)),
              ),
              ElevatedButton(
                onPressed: () async {
                  final name = nameController.text.trim();
                  final price = double.tryParse(priceController.text.trim()) ?? 0.0;
                  final stock = double.tryParse(stockController.text.trim()) ?? 0.0;
                  final cleanBarcode = barcodeController.text.trim();

                  if (name.isEmpty || price <= 0) return;

                  // Tekshirish: Skaner kodi bo'yicha tovar allaqachon bazada bo'lsa, yangi yaratmasdan qoldiqni oshiramiz
                  if (cleanBarcode.isNotEmpty) {
                    final existingProduct = await DatabaseHelper.instance.getProductByCode(cleanBarcode);
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
                            content: Text('Ushbu shtrix-kodli tovar omborda allaqachon mavjud! Ombor qoldig\'iga +$stock $saleUnit qo\'shildi. Yangi qoldiq: $updatedStock $saleUnit'),
                            backgroundColor: AppTheme.primaryEmerald,
                            duration: const Duration(seconds: 3),
                          ),
                        );

                        Navigator.pop(context);
                        Navigator.pop(context);
                        if (widget.onProductCreated != null) {
                          final updatedProd = Product(
                            id: existingProduct.id,
                            tenantId: existingProduct.tenantId,
                            name: existingProduct.name,
                            purchaseUnit: existingProduct.purchaseUnit,
                            saleUnit: existingProduct.saleUnit,
                            conversionRate: existingProduct.conversionRate,
                            price: price,
                            stockQuantity: updatedStock,
                            barcode: existingProduct.barcode,
                            qrCode: existingProduct.qrCode,
                          );
                          widget.onProductCreated!(updatedProd);
                        }
                      }
                      return;
                    }
                  }

                  final newProductMap = {
                    'name': name,
                    'purchase_unit': purchaseUnit,
                    'sale_unit': saleUnit,
                    'conversion_rate': conversionRate,
                    'price_per_sale_unit': price,
                    'current_stock': stock,
                    'barcode': cleanBarcode,
                    'qr_code': cleanBarcode,
                  };

                  // Backend serverga yangi mahsulotni saqlash (POST /api/v1/products/)
                  final apiRes = await ApiService.instance.createProduct(newProductMap);
                  final bool isOnlineSuccess = apiRes.isSuccess && apiRes.data != null;

                  final newProduct = Product(
                    id: isOnlineSuccess ? (apiRes.data!['id']?.toString() ?? const Uuid().v4()) : const Uuid().v4(),
                    tenantId: isOnlineSuccess ? (apiRes.data!['tenant_id']?.toString() ?? 'tenant_store_101') : 'tenant_store_101',
                    name: name,
                    purchaseUnit: purchaseUnit,
                    saleUnit: saleUnit,
                    conversionRate: conversionRate,
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
                              ? 'Mahsulot serverga va bazaga muvaffaqiyatli saqlandi!'
                              : 'Oflayn rejim: Mahsulot lokal bazaga saqlandi. Internet bo\'lganda avto-sinxronlanadi.',
                        ),
                        backgroundColor: isOnlineSuccess ? AppTheme.primaryEmerald : AppTheme.warningOrange,
                        duration: const Duration(seconds: 3),
                      ),
                    );

                    await PrinterService.instance.printOrShareProductLabel(context, product: newProduct);

                    Navigator.pop(context);
                    Navigator.pop(context);
                    if (widget.onProductCreated != null) {
                      widget.onProductCreated!(newProduct);
                    } else if (widget.onProductScanned != null) {
                      widget.onProductScanned!(newProduct, 1.0);
                    }
                  }
                },
                child: const Text('Serverga Saqlash va Yorliq Chop Etish'),
              ),
            ],
          );
        },
      ),
    );
  }

  void _showBarcodeNotFoundOptions() {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppTheme.cardSurface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Barcode topilmadimi yoki o\'qib bo\'lmayaptimi?', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            ListTile(
              leading: const Icon(Icons.qr_code_2, color: AppTheme.accentNeon),
              title: const Text('Yangi QR kod yaratish'),
              subtitle: const Text('Tizim avtomatik unikal QR kod generatsiya qiladi'),
              onTap: () {
                Navigator.pop(context);
                _showRegisterNewProductDialog(code: null);
              },
            ),
            const Divider(color: Color(0xFF334155)),
            ListTile(
              leading: const Icon(Icons.keyboard, color: AppTheme.primaryEmerald),
              title: const Text('Qo\'lda kod kiritish'),
              subtitle: const Text('Mahsulotdagi raqamlarni qo\'lda yozish'),
              onTap: () {
                Navigator.pop(context);
                _showManualCodeEntryDialog();
              },
            ),
          ],
        ),
      ),
    );
  }

  void _showManualCodeEntryDialog() {
    final codeController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppTheme.cardSurface,
        title: const Text('Qo\'lda Kod Kiritish'),
        content: TextField(
          controller: codeController,
          keyboardType: TextInputType.number,
          autofocus: true,
          decoration: const InputDecoration(hintText: 'Shtrix-kod raqamini kiriting'),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Bekor qilish'),
          ),
          ElevatedButton(
            onPressed: () {
              final code = codeController.text.trim();
              Navigator.pop(context);
              if (code.isNotEmpty) {
                _handleCodeScanned(code);
              }
            },
            child: const Text('Izlash'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        title: const Text('Skanerlash (Barcode / QR)'),
        backgroundColor: Colors.black,
        actions: [
          IconButton(
            icon: Icon(
              _isTorchOn ? Icons.flash_on : Icons.flash_off,
              color: _isTorchOn ? Colors.yellow : Colors.grey,
            ),
            onPressed: () {
              _controller.toggleTorch();
              setState(() => _isTorchOn = !_isTorchOn);
            },
          ),
        ],
      ),
      body: Stack(
        children: [
          // Camera Stream
          MobileScanner(
            controller: _controller,
            onDetect: (capture) {
              final List<Barcode> barcodes = capture.barcodes;
              for (final barcode in barcodes) {
                if (barcode.rawValue != null) {
                  _handleCodeScanned(barcode.rawValue!);
                  break;
                }
              }
            },
          ),

          // Scanner Frame Window (260x260) with Laser Animation
          Center(
            child: Container(
              width: 260,
              height: 260,
              decoration: BoxDecoration(
                border: Border.all(color: AppTheme.accentNeon, width: 3),
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: AppTheme.accentNeon.withOpacity(0.2),
                    blurRadius: 16,
                    spreadRadius: 2,
                  ),
                ],
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(17),
                child: AnimatedBuilder(
                  animation: _laserAnimation,
                  builder: (context, child) {
                    return Stack(
                      children: [
                        Positioned(
                          top: _laserAnimation.value,
                          left: 0,
                          right: 0,
                          child: Container(
                            height: 3,
                            decoration: BoxDecoration(
                              color: Colors.redAccent,
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.red.withOpacity(0.9),
                                  blurRadius: 10,
                                  spreadRadius: 4,
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    );
                  },
                ),
              ),
            ),
          ),

          Positioned(
            bottom: 30,
            left: 20,
            right: 20,
            child: ElevatedButton.icon(
              onPressed: _showBarcodeNotFoundOptions,
              icon: const Icon(Icons.help_outline),
              label: const Text('Barcode topilmadimi?'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.cardSurface,
                foregroundColor: AppTheme.textPrimary,
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
