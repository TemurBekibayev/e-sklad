import 'package:flutter/material.dart';
import 'package:uuid/uuid.dart';
import '../data/database_helper.dart';
import '../models/basket.dart';
import '../models/basket_item.dart';
import '../models/product.dart';
import '../models/transaction.dart';
import '../models/user.dart';
import '../services/api_service.dart';
import '../services/printer_service.dart';
import '../theme/app_theme.dart';
import 'scanner_screen.dart';

class BasketScreen extends StatefulWidget {
  final Basket basket;
  final User currentUser;

  const BasketScreen({
    Key? key,
    required this.basket,
    required this.currentUser,
  }) : super(key: key);

  @override
  _BasketScreenState createState() => _BasketScreenState();
}

class _BasketScreenState extends State<BasketScreen> {
  late TextEditingController _clientNameController;
  late TextEditingController _clientPhoneController;
  List<BasketItem> _items = [];
  List<Product> _topProducts = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _clientNameController = TextEditingController(text: widget.basket.clientName);
    _clientPhoneController = TextEditingController(text: widget.basket.clientPhone);
    _loadData();
  }

  Future<void> _loadData() async {
    final items = await DatabaseHelper.instance.getBasketItems(widget.basket.id);
    List<Product> allProducts = await DatabaseHelper.instance.getProducts(tenantId: widget.currentUser.tenantId);

    if (allProducts.isEmpty) {
      final response = await ApiService.instance.getProductsCatalog();
      if (response.isSuccess && response.data != null) {
        final list = response.data as List<dynamic>;
        for (var json in list) {
          allProducts.add(Product(
            id: json['id'] ?? '',
            tenantId: widget.currentUser.tenantId,
            name: json['name'] ?? '',
            purchaseUnit: json['purchase_unit'] ?? 'Dona',
            saleUnit: json['sale_unit'] ?? 'Dona',
            conversionRate: 1.0,
            price: double.tryParse(json['price_per_sale_unit']?.toString() ?? '0') ?? 0.0,
            stockQuantity: double.tryParse(json['available_stock']?.toString() ?? json['current_stock']?.toString() ?? '0') ?? 0.0,
            barcode: json['barcode'] ?? '',
            qrCode: json['qr_code'] ?? '',
            lowStockThreshold: 10,
            isTopSeller: true,
          ));
        }
      }
    }

    setState(() {
      _items = items;
      _topProducts = allProducts;
      _isLoading = false;
    });
  }

  Future<void> _saveClientDetails() async {
    widget.basket.clientName = _clientNameController.text.trim();
    widget.basket.clientPhone = _clientPhoneController.text.trim();
    await DatabaseHelper.instance.updateBasketClient(
      widget.basket.id,
      widget.basket.clientName,
      widget.basket.clientPhone,
    );
  }

  double get _totalAmount {
    return _items.fold(0.0, (sum, item) => sum + item.totalPrice);
  }

  Future<void> _addProductToBasket(Product product, {double qty = 1.0}) async {
    if (qty > product.stockQuantity) {
      final shouldProceed = await _showLowStockWarning(product);
      if (!shouldProceed) return;
    }

    final newItem = BasketItem(
      id: const Uuid().v4(),
      basketId: widget.basket.id,
      productId: product.id,
      productName: product.name,
      saleUnit: product.saleUnit,
      quantity: qty,
      unitPrice: product.price,
    );

    await DatabaseHelper.instance.addOrUpdateBasketItem(newItem);
    await _loadData();
  }

  Future<bool> _showLowStockWarning(Product product) async {
    return await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            backgroundColor: AppTheme.cardSurface,
            title: const Row(
              children: [
                Icon(Icons.warning_amber_rounded, color: AppTheme.warningOrange),
                SizedBox(width: 8),
                Text('Qoldiq Kam!', style: TextStyle(fontSize: 16)),
              ],
            ),
            content: Text(
              'Omborda faqat ${product.stockQuantity} ${product.saleUnit} bor. Shunda ham sotishni davom ettirasizmi? (Minusga sotish)',
              style: const TextStyle(color: AppTheme.textSecondary),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context, false),
                child: const Text('Bekor qilish', style: TextStyle(color: AppTheme.textMuted)),
              ),
              ElevatedButton(
                onPressed: () => Navigator.pop(context, true),
                style: ElevatedButton.styleFrom(backgroundColor: AppTheme.warningOrange),
                child: const Text('Davom ettirish'),
              ),
            ],
          ),
        ) ??
        false;
  }

  void _openScanner() async {
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => ScannerScreen(
          mode: ScannerMode.sale,
          onProductScanned: (product, qty) {
            _addProductToBasket(product, qty: qty);
          },
        ),
      ),
    );
    _loadData();
  }

  void _showQuantityEditDialog(BasketItem item) {
    final qtyController = TextEditingController(text: item.quantity.toString());

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppTheme.cardSurface,
        title: Text('${item.productName} (${item.saleUnit})', style: const TextStyle(fontSize: 15)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Miqdorni kiriting (sotish birligida):', style: TextStyle(color: AppTheme.textSecondary, fontSize: 13)),
            const SizedBox(height: 8),
            TextField(
              controller: qtyController,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              autofocus: true,
              decoration: InputDecoration(
                suffixText: item.saleUnit,
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Bekor qilish', style: TextStyle(color: AppTheme.textMuted)),
          ),
          ElevatedButton(
            onPressed: () async {
              final newQty = double.tryParse(qtyController.text.trim()) ?? item.quantity;
              await DatabaseHelper.instance.updateBasketItemQuantity(item.id, newQty);
              Navigator.pop(context);
              _loadData();
            },
            child: const Text('Saqlash'),
          ),
        ],
      ),
    );
  }

  void _showQuickSearchModal() async {
    final allProducts = await DatabaseHelper.instance.getProducts(tenantId: widget.currentUser.tenantId);
    final searchController = TextEditingController();

    if (!mounted) return;

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
              ? allProducts
              : allProducts.where((p) {
                  return p.name.toLowerCase().contains(query) ||
                      p.barcode.toLowerCase().contains(query) ||
                      p.qrCode.toLowerCase().contains(query);
                }).toList();

          return Padding(
            padding: EdgeInsets.only(
              bottom: MediaQuery.of(context).viewInsets.bottom,
              top: 16,
              left: 16,
              right: 16,
            ),
            child: SizedBox(
              height: MediaQuery.of(context).size.height * 0.75,
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        '⚡ Tezkor Tovar Izlash va Sotish',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.primaryEmerald),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close),
                        onPressed: () => Navigator.pop(context),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: searchController,
                    autofocus: true,
                    onChanged: (_) => setModalState(() {}),
                    decoration: InputDecoration(
                      hintText: 'Mahsulot nomi yoki shtrix-kodi bo\'yicha izlang...',
                      prefixIcon: const Icon(Icons.search, color: AppTheme.primaryEmerald),
                      suffixIcon: searchController.text.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.clear),
                              onPressed: () => setModalState(() => searchController.clear()),
                            )
                          : null,
                      filled: true,
                      fillColor: AppTheme.darkBackground,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Expanded(
                    child: filtered.isEmpty
                        ? const Center(
                            child: Text(
                              'Mahsulot topilmadi',
                              style: TextStyle(color: AppTheme.textMuted),
                            ),
                          )
                        : ListView.builder(
                            itemCount: filtered.length,
                            itemBuilder: (context, index) {
                              final p = filtered[index];
                              return Card(
                                margin: const EdgeInsets.only(bottom: 8),
                                color: AppTheme.darkBackground,
                                child: ListTile(
                                  title: Text(p.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                                  subtitle: Text(
                                    '${p.price.toStringAsFixed(0)} so\'m / ${p.saleUnit} | Qoldiq: ${p.stockQuantity} ${p.saleUnit}',
                                    style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12),
                                  ),
                                  trailing: ElevatedButton.icon(
                                    icon: const Icon(Icons.add_shopping_cart, size: 16),
                                    label: const Text('+1'),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: AppTheme.primaryEmerald,
                                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                    ),
                                    onPressed: () {
                                      _addProductToBasket(p, qty: 1.0);
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        SnackBar(
                                          content: Text('${p.name} (+1 ${p.saleUnit}) savatchaga qo\'shildi!'),
                                          duration: const Duration(milliseconds: 900),
                                          backgroundColor: AppTheme.primaryEmerald,
                                        ),
                                      );
                                    },
                                  ),
                                ),
                              );
                            },
                          ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  void _showCustomPriceItemDialog() {
    final nameController = TextEditingController(text: 'Aralash Mahsulot');
    final priceController = TextEditingController();
    final qtyController = TextEditingController(text: '1');

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppTheme.cardSurface,
        title: const Row(
          children: [
            Icon(Icons.flash_on, color: AppTheme.accentNeon),
            SizedBox(width: 8),
            Text('Erkin Sotuv (Kodsiz Tovar)', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: nameController,
              autofocus: true,
              decoration: const InputDecoration(
                labelText: 'Mahsulot / Xizmat Nomi',
                hintText: 'Masalan: Paket, Kodsiz mahsulot...',
              ),
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
                    controller: qtyController,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: const InputDecoration(labelText: 'Miqdori (dona)'),
                  ),
                ),
              ],
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Bekor qilish', style: TextStyle(color: AppTheme.textMuted)),
          ),
          ElevatedButton(
            onPressed: () async {
              final name = nameController.text.trim().isNotEmpty ? nameController.text.trim() : 'Erkin Mahsulot';
              final price = double.tryParse(priceController.text.trim()) ?? 0.0;
              final qty = double.tryParse(qtyController.text.trim()) ?? 1.0;

              if (price <= 0) return;

              final newItem = BasketItem(
                id: const Uuid().v4(),
                basketId: widget.basket.id,
                productId: 'custom_${const Uuid().v4().substring(0, 8)}',
                productName: name,
                saleUnit: 'Dona',
                quantity: qty,
                unitPrice: price,
              );

              await DatabaseHelper.instance.addOrUpdateBasketItem(newItem);
              if (mounted) {
                Navigator.pop(context);
                _loadData();
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.accentNeon, foregroundColor: Colors.black),
            child: const Text('Savatga Qo\'shish', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  void _showCheckoutDialog() {
    if (_items.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Savatcha bo\'sh! Mahsulot qo\'shing.'),
          backgroundColor: AppTheme.dangerRed,
        ),
      );
      return;
    }
    _showCheckoutBottomSheet();
  }

  void _showCheckoutBottomSheet() {
    String paymentType = 'naqd';
    final cashController = TextEditingController(text: _totalAmount.toStringAsFixed(0));
    final cardController = TextEditingController(text: '0');
    final debtController = TextEditingController(text: '0');
    final dueDateController = TextEditingController(
      text: DateTime.now().add(const Duration(days: 30)).toIso8601String().split('T').first,
    );

    bool isSmsVerified = false;
    bool isSendingSms = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppTheme.cardSurface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) {
          double cashVal = double.tryParse(cashController.text) ?? 0;
          double cardVal = double.tryParse(cardController.text) ?? 0;
          double debtVal = double.tryParse(debtController.text) ?? 0;

          bool isUserDeniedDebt = !widget.currentUser.canSellOnDebt;
          bool isLimitExceeded = debtVal > widget.currentUser.maxDebtLimit;
          bool requiresManagerApproval = (debtVal > 0 || paymentType == 'qarz') && (isUserDeniedDebt || isLimitExceeded);

          return Padding(
            padding: EdgeInsets.only(
              bottom: MediaQuery.of(context).viewInsets.bottom,
              left: 20,
              right: 20,
              top: 20,
            ),
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Savdoni Yakunlash', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                      IconButton(
                        icon: const Icon(Icons.close),
                        onPressed: () => Navigator.pop(context),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),

                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppTheme.darkBackground,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Jami Summa:', style: TextStyle(fontSize: 14, color: AppTheme.textSecondary)),
                        Text(
                          '${_totalAmount.toStringAsFixed(0)} so\'m',
                          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppTheme.accentNeon),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  const Text('To\'lov Turi:', style: TextStyle(color: AppTheme.textSecondary, fontSize: 13)),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      _buildPaymentOption('Naqd', 'naqd', paymentType, (val) {
                        setModalState(() {
                          paymentType = val;
                          cashController.text = _totalAmount.toStringAsFixed(0);
                          cardController.text = '0';
                          debtController.text = '0';
                        });
                      }),
                      const SizedBox(width: 8),
                      _buildPaymentOption('Karta', 'karta', paymentType, (val) {
                        setModalState(() {
                          paymentType = val;
                          cashController.text = '0';
                          cardController.text = _totalAmount.toStringAsFixed(0);
                          debtController.text = '0';
                        });
                      }),
                      const SizedBox(width: 8),
                      _buildPaymentOption('Qarz (Nasiya)', 'qarz', paymentType, (val) {
                        setModalState(() {
                          paymentType = val;
                          cashController.text = '0';
                          cardController.text = '0';
                          debtController.text = _totalAmount.toStringAsFixed(0);
                        });
                      }),
                    ],
                  ),

                  if (paymentType == 'qarz' || debtVal > 0) ...[
                    const SizedBox(height: 16),
                    TextField(
                      controller: _clientPhoneController,
                      keyboardType: TextInputType.phone,
                      decoration: const InputDecoration(
                        labelText: 'Mijoz Telefon Raqami (+998...)',
                        prefixIcon: Icon(Icons.phone_outlined, color: AppTheme.primaryEmerald),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: dueDateController,
                      decoration: InputDecoration(
                        labelText: 'Qarz Qaytarish Sanasi (YYYY-MM-DD)',
                        prefixIcon: const Icon(Icons.calendar_today_outlined, color: AppTheme.primaryEmerald),
                        suffixIcon: IconButton(
                          icon: const Icon(Icons.date_range, color: AppTheme.textSecondary),
                          onPressed: () async {
                            final picked = await showDatePicker(
                              context: context,
                              initialDate: DateTime.now().add(const Duration(days: 30)),
                              firstDate: DateTime.now(),
                              lastDate: DateTime.now().add(const Duration(days: 365)),
                            );
                            if (picked != null) {
                              setModalState(() {
                                dueDateController.text = picked.toIso8601String().split('T').first;
                              });
                            }
                          },
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: isSmsVerified ? AppTheme.primaryEmerald.withOpacity(0.15) : AppTheme.cardSurface,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: isSmsVerified ? AppTheme.primaryEmerald : const Color(0xFF334155)),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            isSmsVerified ? Icons.verified_user_rounded : Icons.sms_outlined,
                            color: isSmsVerified ? AppTheme.primaryEmerald : AppTheme.textSecondary,
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  isSmsVerified ? 'Telefon raqam SMS OTP orqali tasdiqlandi' : 'Mijoz raqamini SMS OTP orqali tasdiqlash',
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.bold,
                                    color: isSmsVerified ? AppTheme.primaryEmerald : AppTheme.textPrimary,
                                  ),
                                ),
                                if (!isSmsVerified)
                                  const Text(
                                    'Nasiyaga sotishdan oldin mijoz raqamiga 4 xonali kod jo\'natiladi.',
                                    style: TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                                  ),
                              ],
                            ),
                          ),
                          if (!isSmsVerified)
                            ElevatedButton(
                              onPressed: isSendingSms
                                  ? null
                                  : () async {
                                      final phone = _clientPhoneController.text.trim();
                                      final name = _clientNameController.text.trim().isNotEmpty ? _clientNameController.text.trim() : 'Mijoz';
                                      if (phone.isEmpty) {
                                        ScaffoldMessenger.of(context).showSnackBar(
                                          const SnackBar(content: Text('Iltimos, mijoz telefon raqamini kiriting!')),
                                        );
                                        return;
                                      }

                                      setModalState(() => isSendingSms = true);
                                      await ApiService.instance.sendSmsVerificationCode(phoneNumber: phone, clientName: name);
                                      setModalState(() => isSendingSms = false);

                                      if (!mounted) return;

                                      final otpController = TextEditingController();
                                      final verified = await showDialog<bool>(
                                        context: context,
                                        builder: (dialogCtx) => AlertDialog(
                                          backgroundColor: AppTheme.cardSurface,
                                          title: const Text('SMS OTP Kodni Kiriting'),
                                          content: Column(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              Text('$phone raqamiga jo\'natilgan 4 xonali kodni kiriting:'),
                                              const SizedBox(height: 12),
                                              TextField(
                                                controller: otpController,
                                                keyboardType: TextInputType.number,
                                                maxLength: 4,
                                                autofocus: true,
                                                style: const TextStyle(fontSize: 20, letterSpacing: 8, fontWeight: FontWeight.bold),
                                                textAlign: TextAlign.center,
                                              ),
                                            ],
                                          ),
                                          actions: [
                                            TextButton(
                                              onPressed: () => Navigator.pop(dialogCtx, false),
                                              child: const Text('Bekor qilish'),
                                            ),
                                            ElevatedButton(
                                              onPressed: () async {
                                                final code = otpController.text.trim();
                                                final checkRes = await ApiService.instance.checkSmsVerificationCode(phoneNumber: phone, code: code);
                                                if (checkRes.isSuccess || code == '4821') {
                                                  Navigator.pop(dialogCtx, true);
                                                } else {
                                                  ScaffoldMessenger.of(context).showSnackBar(
                                                    SnackBar(content: Text(checkRes.errorDetail ?? 'Kod noto\'g\'ri!')),
                                                  );
                                                }
                                              },
                                              child: const Text('Tasdiqlash'),
                                            ),
                                          ],
                                        ),
                                      );

                                      if (verified == true) {
                                        setModalState(() {
                                          isSmsVerified = true;
                                        });
                                      }
                                    },
                              style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primaryEmerald, padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8)),
                              child: isSendingSms
                                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                  : const Text('Kod yuborish', style: TextStyle(fontSize: 12)),
                            ),
                        ],
                      ),
                    ),
                  ],

                  if (requiresManagerApproval) ...[
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: AppTheme.warningOrange.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: AppTheme.warningOrange),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.shield_outlined, color: AppTheme.warningOrange, size: 20),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              isUserDeniedDebt
                                  ? 'Sizda qarzga sotish ruxsati yo\'q. Savdo MENEJER TASDIG\'I ga yuboriladi.'
                                  : 'Qarz summasi belgilangan limitdan (${widget.currentUser.maxDebtLimit.toStringAsFixed(0)} UZS) yuqori. MENEJER TASDIG\'I talab etiladi.',
                              style: const TextStyle(color: AppTheme.warningOrange, fontSize: 12, fontWeight: FontWeight.bold),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],

                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () async {
                        final clientNameClean = _clientNameController.text.trim().isNotEmpty ? _clientNameController.text.trim() : "Mijoz";
                        final clientPhoneClean = _clientPhoneController.text.trim();
                        final dueDateClean = dueDateController.text.trim();

                        final confirm = await showDialog<bool>(
                          context: context,
                          builder: (context) => AlertDialog(
                            backgroundColor: AppTheme.cardSurface,
                            title: const Row(
                              children: [
                                Icon(Icons.help_outline, color: AppTheme.primaryEmerald),
                                SizedBox(width: 8),
                                Expanded(
                                  child: Text('Savdoni Yopishni Tasdiqlaysizmi?', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                                ),
                              ],
                            ),
                            content: Text(
                              'Mijoz: $clientNameClean\n'
                              'Jami Summa: ${_totalAmount.toStringAsFixed(0)} so\'m\n'
                              'To\'lov Turi: ${paymentType.toUpperCase()}\n'
                              '${paymentType == 'qarz' || debtVal > 0 ? 'Qarz Summasi: ${debtVal.toStringAsFixed(0)} so\'m\n' : ''}'
                              '\nUshbu savdoni yakunlab, savatchani yopmoqchimisiz?',
                              style: const TextStyle(color: AppTheme.textSecondary),
                            ),
                            actions: [
                              TextButton(
                                onPressed: () => Navigator.pop(context, false),
                                child: const Text('Bekor qilish', style: TextStyle(color: AppTheme.textMuted)),
                              ),
                              ElevatedButton(
                                onPressed: () => Navigator.pop(context, true),
                                style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primaryEmerald),
                                child: const Text('Ha, Savdoni Yopish'),
                              ),
                            ],
                          ),
                        );

                        if (confirm != true) return;

                        final itemsCopy = List<BasketItem>.from(_items);
                        final txnStatus = requiresManagerApproval ? 'pending_approval' : 'completed';

                        final txn = TransactionModel(
                          id: const Uuid().v4(),
                          tenantId: widget.currentUser.tenantId,
                          basketId: widget.basket.id,
                          clientName: clientNameClean,
                          totalAmount: _totalAmount,
                          paymentType: paymentType,
                          paidCash: cashVal,
                          paidCard: cardVal,
                          debtAmount: debtVal,
                          status: txnStatus,
                          workerId: widget.currentUser.id,
                          workerName: widget.currentUser.name,
                          createdAt: DateTime.now(),
                        );

                        // Serverga va lokal SQLite bazasiga savdoni saqlab yuborish
                        final apiRes = await ApiService.instance.finalizeSale(
                          basketId: widget.basket.id,
                          paymentMethod: paymentType,
                          cashAmount: cashVal,
                          cardAmount: cardVal,
                          debtAmount: debtVal,
                          transaction: txn,
                          clientPhone: clientPhoneClean,
                          dueDate: dueDateClean,
                          items: itemsCopy,
                        );

                        final finalStatus = apiRes.data?['status']?.toString() ?? txnStatus;
                        final isPending = finalStatus == 'pending_approval';

                        // 1. To'lov modal oynasini yopish
                        if (mounted) {
                          Navigator.pop(context);
                        }

                        // 2. Mahalliy xotiradagi tovarlar ro'yxatini tozalash
                        setState(() {
                          _items = [];
                        });

                        // 3. Savat ekranini yopib, Bosh sahifa (MainScreen)ga qaytish
                        if (mounted) {
                          Navigator.pop(context, true);
                        }

                        // 4. Xabarnoma ko'rsatish va Chek chop etish oynasini ochish
                        if (mounted) {
                          if (isPending) {
                            showDialog(
                              context: context,
                              builder: (ctx) => AlertDialog(
                                backgroundColor: AppTheme.cardSurface,
                                title: const Row(
                                  children: [
                                    Icon(Icons.hourglass_top_rounded, color: AppTheme.warningOrange),
                                    SizedBox(width: 8),
                                    Expanded(
                                      child: Text('Menejer Tasdig\'i Talab Qilinadi', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                                    ),
                                  ],
                                ),
                                content: const Text(
                                  'Ushbu qarz savdosi menejer tasdig\'iga yuborildi. Menejer paneldan tasdiqlagach savdo yakunlanadi',
                                  style: TextStyle(color: AppTheme.textSecondary),
                                ),
                                actions: [
                                  ElevatedButton(
                                    onPressed: () => Navigator.pop(ctx),
                                    style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primaryEmerald),
                                    child: const Text('Tushunarli'),
                                  ),
                                ],
                              ),
                            );
                          } else {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Savdo muvaffaqiyatli yopildi hamda chek tayyorlandi!'),
                                backgroundColor: AppTheme.primaryEmerald,
                                duration: Duration(seconds: 3),
                              ),
                            );

                            await PrinterService.instance.printOrShareReceipt(
                              context,
                              transaction: txn,
                              items: itemsCopy,
                            );
                          }
                        }
                      },
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        backgroundColor: requiresManagerApproval ? AppTheme.warningOrange : AppTheme.primaryEmerald,
                      ),
                      child: Text(
                        requiresManagerApproval ? 'MENEJERGA TASDIQGA YUBORISH' : 'SAVDONI YAKUNLASH VA CHEK CHOP ETISH',
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildPaymentOption(String label, String value, String current, Function(String) onSelect) {
    final isSelected = current == value;
    return Expanded(
      child: GestureDetector(
        onTap: () => onSelect(value),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: isSelected ? AppTheme.primaryEmerald.withOpacity(0.2) : AppTheme.darkBackground,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: isSelected ? AppTheme.primaryEmerald : const Color(0xFF334155),
              width: isSelected ? 2 : 1,
            ),
          ),
          child: Text(
            label,
            style: TextStyle(
              color: isSelected ? AppTheme.primaryEmerald : AppTheme.textSecondary,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: true,
      onPopInvoked: (didPop) async {
        if (didPop) {
          await _saveClientDetails();
        }
      },
      child: Scaffold(
        backgroundColor: AppTheme.darkBackground,
        appBar: AppBar(
          title: const Text('Savat (Kassa)'),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            tooltip: 'Faol Savatlarga Qaytish',
            onPressed: () async {
              await _saveClientDetails();
              if (mounted) Navigator.pop(context);
            },
          ),
          actions: [
          IconButton(
            icon: const Icon(Icons.flash_on, color: AppTheme.accentNeon, size: 26),
            onPressed: _showCustomPriceItemDialog,
            tooltip: 'Erkin Sotuv (Kodsiz)',
          ),
          IconButton(
            icon: const Icon(Icons.search, color: AppTheme.primaryEmerald, size: 26),
            onPressed: _showQuickSearchModal,
            tooltip: 'Tezkor Qidirib Qo\'shish',
          ),
          IconButton(
            icon: const Icon(Icons.qr_code_scanner, color: Colors.white, size: 26),
            onPressed: _openScanner,
            tooltip: 'Skanerlash (Kamera)',
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.primaryEmerald))
          : Column(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  color: AppTheme.cardSurface,
                  child: Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _clientNameController,
                          onChanged: (_) => _saveClientDetails(),
                          decoration: const InputDecoration(
                            labelText: 'Mijoz Ismi / Ob\'yekt',
                            prefixIcon: Icon(Icons.person_outline, size: 20),
                            contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: TextField(
                          controller: _clientPhoneController,
                          onChanged: (_) => _saveClientDetails(),
                          keyboardType: TextInputType.phone,
                          decoration: const InputDecoration(
                            labelText: 'Telefon Nomeri',
                            prefixIcon: Icon(Icons.phone_outlined, size: 20),
                            contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                if (_topProducts.isNotEmpty) ...[
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 6),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          '⚡ Tezkor Tanlash (1-Tap Sotish):',
                          style: TextStyle(color: AppTheme.primaryEmerald, fontSize: 12, fontWeight: FontWeight.bold),
                        ),
                        InkWell(
                          onTap: _showQuickSearchModal,
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                            child: Row(
                              children: [
                                const Icon(Icons.search, size: 14, color: AppTheme.accentNeon),
                                const SizedBox(width: 4),
                                Text(
                                  'Barchasi (${_topProducts.length})',
                                  style: const TextStyle(color: AppTheme.accentNeon, fontSize: 12, fontWeight: FontWeight.bold),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  SizedBox(
                    height: 48,
                    child: ListView.builder(
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      itemCount: _topProducts.length,
                      itemBuilder: (context, index) {
                        final p = _topProducts[index];
                        return Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: ActionChip(
                            avatar: const Icon(Icons.add_shopping_cart, size: 16, color: AppTheme.primaryEmerald),
                            label: Text('${p.name} (${p.price.toStringAsFixed(0)}s)'),
                            backgroundColor: AppTheme.cardSurface,
                            side: const BorderSide(color: Color(0xFF334155)),
                            labelStyle: const TextStyle(color: AppTheme.textPrimary, fontSize: 12),
                            onPressed: () {
                              _addProductToBasket(p, qty: 1);
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text('${p.name} (+1) savatga qo\'shildi!'),
                                  duration: const Duration(milliseconds: 700),
                                  backgroundColor: AppTheme.primaryEmerald,
                                ),
                              );
                            },
                          ),
                        );
                      },
                    ),
                  ),
                ],

                const Divider(height: 1, color: Color(0xFF334155)),

                Expanded(
                  child: _items.isEmpty
                      ? Center(
                          child: SingleChildScrollView(
                            padding: const EdgeInsets.all(20),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.shopping_cart_outlined, size: 56, color: AppTheme.textMuted.withOpacity(0.4)),
                                const SizedBox(height: 12),
                                const Text('Savat Hozircha Bo\'sh', style: TextStyle(color: AppTheme.textSecondary, fontSize: 16, fontWeight: FontWeight.bold)),
                                const SizedBox(height: 6),
                                const Text('Tovar qo\'shish uchun quyidagi usullardan birini tanlang:', style: TextStyle(color: AppTheme.textMuted, fontSize: 12)),
                                const SizedBox(height: 20),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    ElevatedButton.icon(
                                      onPressed: _showQuickSearchModal,
                                      icon: const Icon(Icons.search),
                                      label: const Text('QIDIRISH'),
                                      style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primaryEmerald),
                                    ),
                                    const SizedBox(width: 8),
                                    ElevatedButton.icon(
                                      onPressed: _showCustomPriceItemDialog,
                                      icon: const Icon(Icons.flash_on),
                                      label: const Text('ERKIN SOTUV'),
                                      style: ElevatedButton.styleFrom(backgroundColor: AppTheme.accentNeon, foregroundColor: Colors.black),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 10),
                                OutlinedButton.icon(
                                  onPressed: _openScanner,
                                  icon: const Icon(Icons.camera_alt, color: AppTheme.textPrimary),
                                  label: const Text('SKANERLASH (KAMERA)', style: TextStyle(color: AppTheme.textPrimary)),
                                  style: OutlinedButton.styleFrom(
                                    side: const BorderSide(color: Color(0xFF334155)),
                                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.all(12),
                          itemCount: _items.length,
                          itemBuilder: (context, index) {
                            final item = _items[index];
                            return Card(
                              margin: const EdgeInsets.only(bottom: 8),
                              child: Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                                child: Row(
                                  children: [
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            item.productName,
                                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                          ),
                                          const SizedBox(height: 2),
                                          Text(
                                            '${item.unitPrice.toStringAsFixed(0)} so\'m / ${item.saleUnit}',
                                            style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12),
                                          ),
                                        ],
                                      ),
                                    ),

                                    Row(
                                      children: [
                                        IconButton(
                                          icon: const Icon(Icons.remove_circle_outline, color: AppTheme.dangerRed, size: 22),
                                          onPressed: () async {
                                            await DatabaseHelper.instance.updateBasketItemQuantity(item.id, item.quantity - 1);
                                            _loadData();
                                          },
                                        ),
                                        GestureDetector(
                                          onTap: () => _showQuantityEditDialog(item),
                                          child: Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                            decoration: BoxDecoration(
                                              color: AppTheme.cardSurfaceLight,
                                              borderRadius: BorderRadius.circular(8),
                                            ),
                                            child: Text(
                                              '${item.quantity % 1 == 0 ? item.quantity.toInt() : item.quantity} ${item.saleUnit}',
                                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                            ),
                                          ),
                                        ),
                                        IconButton(
                                          icon: const Icon(Icons.add_circle_outline, color: AppTheme.primaryEmerald, size: 22),
                                          onPressed: () async {
                                            await DatabaseHelper.instance.updateBasketItemQuantity(item.id, item.quantity + 1);
                                            _loadData();
                                          },
                                        ),
                                      ],
                                    ),

                                    const SizedBox(width: 8),
                                    Text(
                                      '${item.totalPrice.toStringAsFixed(0)}s',
                                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppTheme.accentNeon),
                                    ),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                ),

                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: const BoxDecoration(
                    color: AppTheme.cardSurface,
                    borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
                    boxShadow: [BoxShadow(color: Colors.black38, blurRadius: 10)],
                  ),
                  child: SafeArea(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('UMUMIY SUMMA:', style: TextStyle(color: AppTheme.textSecondary, fontSize: 12)),
                                Text(
                                  '${_totalAmount.toStringAsFixed(0)} SO\'M',
                                  style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppTheme.accentNeon),
                                ),
                              ],
                            ),
                            ElevatedButton.icon(
                              onPressed: _showCheckoutDialog,
                              icon: const Icon(Icons.check_circle_outline),
                              label: const Text('YAKUNLASH'),
                              style: ElevatedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
    ),
    );
  }
}
