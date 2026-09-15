import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../providers/auth_provider.dart';
import '../providers/sync_provider.dart';
import 'login_screen.dart';

class WorkerDashboard extends StatefulWidget {
  const WorkerDashboard({super.key});

  @override
  State<WorkerDashboard> createState() => _WorkerDashboardState();
}

class _WorkerDashboardState extends State<WorkerDashboard> {
  final _clientNameController = TextEditingController();
  final _searchQueryController = TextEditingController();
  final _manualQtyController = TextEditingController(text: '1');
  
  bool _isScannerOpen = false;
  dynamic _selectedProductToAdd;
  String _searchQuery = '';

  @override
  void dispose() {
    _clientNameController.dispose();
    _searchQueryController.dispose();
    _manualQtyController.dispose();
    super.dispose();
  }

  void _onCodeScanned(String code, SyncProvider sync) {
    setState(() {
      _isScannerOpen = false;
    });

    final product = sync.products.firstWhere(
      (p) => p['barcode'] == code || p['qrCode'] == code,
      orElse: () => null,
    );

    if (product != null) {
      sync.addItemToBasket(
        Provider.of<AuthProvider>(context, listen: false).currentUser!['id'],
        sync.activeBasketId!,
        product,
        1.0,
      );
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('${product['name']} savatga qo\'shildi'),
          backgroundColor: const Color(0xFF10B981),
          duration: const Duration(seconds: 1),
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Mahsulot topilmadi: $code'),
          backgroundColor: Colors.orangeAccent,
        ),
      );
    }
  }

  void _openManualAdd(dynamic product) {
    setState(() {
      _selectedProductToAdd = product;
      _manualQtyController.text = '1';
    });
  }

  void _confirmManualAdd(SyncProvider sync) {
    final qty = double.tryParse(_manualQtyController.text);
    if (qty == null || qty <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Miqdorini to\'g\'ri kiriting'), backgroundColor: Colors.redAccent),
      );
      return;
    }

    sync.addItemToBasket(
      Provider.of<AuthProvider>(context, listen: false).currentUser!['id'],
      sync.activeBasketId!,
      _selectedProductToAdd,
      qty,
    );

    setState(() {
      _selectedProductToAdd = null;
      _searchQuery = '';
      _searchQueryController.clear();
    });
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final sync = Provider.of<SyncProvider>(context);

    // Active basket reference
    final activeBasket = sync.baskets.firstWhere(
      (b) => b['id'] == sync.activeBasketId,
      orElse: () => null,
    );

    if (activeBasket != null && _clientNameController.text != activeBasket['clientName'] && !FocusScope.of(context).hasFocus) {
      _clientNameController.text = activeBasket['clientName'];
    }

    final double basketTotal = activeBasket != null
        ? (activeBasket['items'] as List).fold(0.0, (sum, item) {
            final price = double.parse(item['product']['price'].toString());
            final qty = double.parse(item['quantity'].toString());
            return sum + (price * qty);
          })
        : 0.0;

    return Stack(
      children: [
        Scaffold(
          backgroundColor: const Color(0xFF0F0C20),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0A061A),
        elevation: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '${auth.currentUser?['name']}',
              style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold),
            ),
            Text(
              'Do\'kon: ${auth.tenantName}',
              style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
            ),
          ],
        ),
        actions: [
          // Sync indicator
          if (sync.syncQueue.isNotEmpty)
            Container(
              margin: const EdgeInsets.only(right: 8),
              child: Chip(
                backgroundColor: const Color(0xFFF59E0B),
                labelPadding: const EdgeInsets.symmetric(horizontal: 4),
                label: Text(
                  '${sync.syncQueue.length} offline',
                  style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold),
                ),
              ),
            ),
          // Connection state
          Icon(
            auth.isOnline ? Icons.wifi : Icons.wifi_off,
            color: auth.isOnline ? const Color(0xFF10B981) : const Color(0xFFEF4444),
            size: 18,
          ),
          const SizedBox(width: 12),
          // Logout
          IconButton(
            onPressed: () {
              auth.logout();
              Navigator.pushReplacement(
                context,
                MaterialPageRoute(builder: (context) => const LoginScreen()),
              );
            },
            icon: const Icon(Icons.logout, color: Color(0xFFEF4444), size: 20),
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Parallel Baskets Tabs Row
            Container(
              color: const Color(0xFF16112B),
              height: 50,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              child: Row(
                children: [
                  Expanded(
                    child: ListView.builder(
                      scrollDirection: Axis.horizontal,
                      itemCount: sync.baskets.length,
                      itemBuilder: (context, index) {
                        final b = sync.baskets[index];
                        final active = b['id'] == sync.activeBasketId;
                        return GestureDetector(
                          onTap: () => sync.setActiveBasket(b['id']),
                          child: Container(
                            margin: const EdgeInsets.only(right: 8),
                            decoration: BoxDecoration(
                              color: active ? const Color(0xFF6366F1) : const Color(0x1AFFFFFF),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(
                                color: active ? const Color(0xFF818CF8) : const Color(0x14FFFFFF),
                              ),
                            ),
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                            alignment: Alignment.center,
                            child: Row(
                              children: [
                                Text(
                                  b['clientName'],
                                  style: TextStyle(
                                    color: active ? Colors.white : const Color(0xFF94A3B8),
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                if (b['items'].length > 0) ...[
                                  const SizedBox(width: 4),
                                  Container(
                                    decoration: const BoxDecoration(
                                      shape: BoxShape.circle,
                                      color: Colors.white24,
                                    ),
                                    padding: const EdgeInsets.all(4),
                                    child: Text(
                                      '${b['items'].length}',
                                      style: const TextStyle(color: Colors.white, fontSize: 8),
                                    ),
                                  ),
                                ]
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                  GestureDetector(
                    onTap: () => sync.createLocalBasket(auth.currentUser!['id']),
                    child: Container(
                      width: 32,
                      height: 32,
                      decoration: const BoxDecoration(
                        shape: BoxShape.circle,
                        color: Color(0xFF10B981),
                      ),
                      child: const Icon(Icons.add, color: Colors.white, size: 18),
                    ),
                  ),
                ],
              ),
            ),

            // Active Basket Area
            Expanded(
              child: activeBasket == null
                  ? const Center(
                      child: Text(
                        'Faol savatlar yo\'q. Oynani yaratish uchun yuqoridagi yashil plyusni bosing.',
                        style: TextStyle(color: Color(0xFF64748B)),
                      ),
                    )
                  : Column(
                      children: [
                        // Client name input
                        Padding(
                          padding: const EdgeInsets.all(16.0),
                          child: Row(
                            children: [
                              const Icon(Icons.person_outline, color: Color(0xFF94A3B8), size: 18),
                              const SizedBox(width: 8),
                              Expanded(
                                child: TextField(
                                  controller: _clientNameController,
                                  style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold),
                                  decoration: const InputDecoration(
                                    hintText: 'Mijoz ismini yozing...',
                                    hintStyle: TextStyle(color: Color(0xFF64748B)),
                                    border: InputBorder.none,
                                  ),
                                  onChanged: (val) {
                                    sync.updateBasketClientName(auth.currentUser!['id'], activeBasket['id'], val);
                                  },
                                ),
                              ),
                              IconButton(
                                onPressed: () {
                                  sync.cancelLocalBasket(auth.currentUser!['id'], activeBasket['id']);
                                },
                                icon: const Icon(Icons.delete_outline, color: Color(0xFFEF4444), size: 20),
                                tooltip: 'Savatni bekor qilish',
                              ),
                            ],
                          ),
                        ),
                        const Divider(color: Color(0x14FFFFFF), height: 1),

                        // Basket items list
                        Expanded(
                          child: (activeBasket['items'] as List).isEmpty
                              ? _buildEmptyBasketView(sync, auth)
                              : ListView.builder(
                                  padding: const EdgeInsets.all(16),
                                  itemCount: activeBasket['items'].length,
                                  itemBuilder: (context, index) {
                                    final item = activeBasket['items'][index];
                                    final p = item['product'];
                                    final qty = double.parse(item['quantity'].toString());
                                    final price = double.parse(p['price'].toString());
                                    
                                    return Container(
                                      margin: const EdgeInsets.only(bottom: 12),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFF16112B),
                                        borderRadius: BorderRadius.circular(8),
                                        border: Border.all(color: const Color(0x0FFFFFFF)),
                                      ),
                                      padding: const EdgeInsets.all(12),
                                      child: Row(
                                        children: [
                                          Expanded(
                                            child: Column(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                Text(
                                                  p['name'],
                                                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                                                ),
                                                const SizedBox(height: 4),
                                                Text(
                                                  '${_formatCurrency(price)} / ${p['unit']}',
                                                  style: const TextStyle(color: Color(0xFF10B981), fontSize: 11),
                                                ),
                                              ],
                                            ),
                                          ),
                                          
                                          // Counter controls
                                          Row(
                                            children: [
                                              GestureDetector(
                                                onTap: () {
                                                  sync.removeItemFromBasket(
                                                    auth.currentUser!['id'],
                                                    activeBasket['id'],
                                                    item['id'],
                                                    p['id'],
                                                    qty,
                                                  );
                                                },
                                                child: Container(
                                                  decoration: BoxDecoration(
                                                    color: const Color(0x1AFFFFFF),
                                                    borderRadius: BorderRadius.circular(4),
                                                  ),
                                                  padding: const EdgeInsets.all(6),
                                                  child: const Icon(Icons.remove, color: Colors.white, size: 14),
                                                ),
                                              ),
                                              Padding(
                                                padding: const EdgeInsets.symmetric(horizontal: 10.0),
                                                child: Text(
                                                  _formatQty(qty, p['unit']),
                                                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                                                ),
                                              ),
                                              GestureDetector(
                                                onTap: () {
                                                  sync.addItemToBasket(
                                                    auth.currentUser!['id'],
                                                    activeBasket['id'],
                                                    p,
                                                    1.0,
                                                  );
                                                },
                                                child: Container(
                                                  decoration: BoxDecoration(
                                                    color: const Color(0x1AFFFFFF),
                                                    borderRadius: BorderRadius.circular(4),
                                                  ),
                                                  padding: const EdgeInsets.all(6),
                                                  child: const Icon(Icons.add, color: Colors.white, size: 14),
                                                ),
                                              ),
                                            ],
                                          ),
                                          const SizedBox(width: 16),
                                          
                                          // Item subtotal
                                          Text(
                                            _formatCurrency(price * qty),
                                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                                          ),
                                        ],
                                      ),
                                    );
                                  },
                                ),
                        ),

                        // Action Bar at Bottom
                        Container(
                          decoration: const BoxDecoration(
                            color: Color(0xFF0A061A),
                            border: Border(top: BorderSide(color: Color(0x14FFFFFF))),
                          ),
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  const Text('Jami summa:', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 14)),
                                  Text(
                                    _formatCurrency(basketTotal),
                                    style: const TextStyle(color: Color(0xFF10B981), fontSize: 20, fontWeight: FontWeight.bold),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 16),
                              Row(
                                children: [
                                  // Barcode scanner trigger
                                  Expanded(
                                    child: ElevatedButton.icon(
                                      onPressed: () => setState(() => _isScannerOpen = true),
                                      icon: const Icon(Icons.qr_code_scanner, color: Colors.white),
                                      label: const Text('Kamerada Skanerlash', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: const Color(0xFF6366F1),
                                        padding: const EdgeInsets.symmetric(vertical: 12),
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  // Manual catalog search
                                  Expanded(
                                    child: OutlinedButton.icon(
                                      onPressed: () => _showCatalogSearchDialog(context, sync),
                                      icon: const Icon(Icons.search, color: Color(0xFF6366F1)),
                                      label: const Text('Tovarlar Ro\'yxati', style: TextStyle(color: Color(0xFF6366F1), fontWeight: FontWeight.bold)),
                                      style: OutlinedButton.styleFrom(
                                        side: const BorderSide(color: Color(0xFF6366F1)),
                                        padding: const EdgeInsets.symmetric(vertical: 12),
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                      ),
                                    ),
                                  ),
                                ],
                              )
                            ],
                          ),
                        )
                      ],
                    ),
            ),
          ],
        ),
      ),
      
      // Camera barcode scanner Overlay
      bottomSheet: _isScannerOpen
          ? Container(
              color: Colors.black,
              height: double.infinity,
              width: double.infinity,
              child: Stack(
                children: [
                  MobileScanner(
                    onDetect: (capture) {
                      final List<Barcode> barcodes = capture.barcodes;
                      for (final barcode in barcodes) {
                        if (barcode.rawValue != null) {
                          _onCodeScanned(barcode.rawValue!, sync);
                          break;
                        }
                      }
                    },
                  ),
                  // Target box graphic
                  Center(
                    child: Container(
                      width: 250,
                      height: 250,
                      decoration: BoxDecoration(
                        border: Border.all(color: const Color(0xFF6366F1), width: 3),
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                  // Instructions
                   Positioned(
                    bottom: 40,
                    left: 20,
                    right: 20,
                    child: Container(
                      decoration: BoxDecoration(
                        color: const Color(0xCC0F0C20),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      padding: const EdgeInsets.all(12),
                      child: const Text(
                        'Shtrix-kod yoki QR kodni kvadrat ichiga joylashtiring',
                        style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ),
                  // Close button
                  Positioned(
                    top: 40,
                    right: 20,
                    child: IconButton(
                      icon: const Icon(Icons.close, color: Colors.white, size: 28),
                      onPressed: () => setState(() => _isScannerOpen = false),
                    ),
                  )
                ],
              ),
            )
          : null,
        ),
        if (_selectedProductToAdd != null)
          _buildManualQtyModal(sync),
      ],
    );
  }

  Widget _buildEmptyBasketView(SyncProvider sync, AuthProvider auth) {
    // Quick add items grid (items with no scanner needed)
    final quickItems = sync.products.take(4).toList();

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const SizedBox(height: 20),
          const Icon(Icons.shopping_basket_outlined, size: 54, color: Color(0xFF2E245C)),
          const SizedBox(height: 12),
          const Text(
            'Savat hozircha bo\'sh',
            style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15),
          ),
          const SizedBox(height: 6),
          const Text(
            'Kamera yordamida shtrix-kod skanerlang yoki tovarlar ro\'yxatidan qo\'shing',
            style: TextStyle(color: Color(0xFF64748B), fontSize: 12),
            textAlign: TextAlign.center,
          ),
          
          if (quickItems.isNotEmpty) ...[
            const SizedBox(height: 40),
            const Align(
              alignment: Alignment.centerLeft,
              child: Text(
                'Tezkor qo\'shish tugmalari:',
                style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12, fontWeight: FontWeight.bold),
              ),
            ),
            const SizedBox(height: 12),
            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                childAspectRatio: 2.2,
              ),
              itemCount: quickItems.length,
              itemBuilder: (context, idx) {
                final prod = quickItems[idx];
                return InkWell(
                  onTap: () {
                    sync.addItemToBasket(auth.currentUser!['id'], sync.activeBasketId!, prod, 1.0);
                  },
                  child: Container(
                    decoration: BoxDecoration(
                      color: const Color(0xFF16112B),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0x14FFFFFF)),
                    ),
                    padding: const EdgeInsets.all(8),
                    alignment: Alignment.centerLeft,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          prod['name'],
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 11),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          _formatCurrency(double.parse(prod['price'].toString())),
                          style: const TextStyle(color: Color(0xFF10B981), fontSize: 10, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                  ),
                );
              },
            )
          ]
        ],
      ),
    );
  }

  void _showCatalogSearchDialog(BuildContext context, SyncProvider sync) {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return StatefulBuilder(
          builder: (context, setStateDialog) {
            final filtered = sync.products.where((p) {
              final name = p['name'].toString().toLowerCase();
              final barcode = (p['barcode'] ?? '').toString().toLowerCase();
              final q = _searchQuery.toLowerCase();
              return name.contains(q) || barcode.contains(q);
            }).toList();

            return Dialog(
              backgroundColor: const Color(0xFF0F0C20),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              child: Container(
                padding: const EdgeInsets.all(16),
                width: double.infinity,
                constraints: const BoxConstraints(maxWidth: 400, maxHeight: 500),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Mahsulot tanlang', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                        IconButton(
                          onPressed: () => Navigator.pop(context),
                          icon: const Icon(Icons.close, color: Color(0xFF94A3B8)),
                        )
                      ],
                    ),
                    const SizedBox(height: 8),
                    // Search bar
                    Container(
                      decoration: BoxDecoration(
                        color: const Color(0x40000000),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: const Color(0x14FFFFFF)),
                      ),
                      padding: const EdgeInsets.symmetric(horizontal: 10),
                      child: TextField(
                        style: const TextStyle(color: Colors.white, fontSize: 13),
                        decoration: const InputDecoration(
                          hintText: 'Qidiruv...',
                          hintStyle: TextStyle(color: Color(0xFF64748B)),
                          border: InputBorder.none,
                          icon: Icon(Icons.search, color: Color(0xFF64748B), size: 16),
                        ),
                        onChanged: (val) {
                          setStateDialog(() {
                            _searchQuery = val;
                          });
                        },
                      ),
                    ),
                    const SizedBox(height: 16),
                    // List
                    Expanded(
                      child: filtered.isEmpty
                          ? const Center(child: Text('Tegishli tovar topilmadi', style: TextStyle(color: Color(0xFF64748B))))
                          : ListView.builder(
                              itemCount: filtered.length,
                              itemBuilder: (context, idx) {
                                final p = filtered[idx];
                                return ListTile(
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                  title: Text(p['name'], style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold)),
                                  subtitle: Text('${_formatCurrency(double.parse(p['price'].toString()))} / ${p['unit']}', style: const TextStyle(color: Color(0xFF10B981), fontSize: 11)),
                                  trailing: const Icon(Icons.add_shopping_cart, color: Color(0xFF6366F1), size: 20),
                                  onTap: () {
                                    Navigator.pop(context);
                                    _openManualAdd(p);
                                  },
                                );
                              },
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

  // --- MANUAL QUANTITY ENTRY MODAL ---
  Widget _buildManualQtyModal(SyncProvider sync) {
    if (_selectedProductToAdd == null) return const SizedBox.shrink();

    return Center(
      child: Container(
        color: const Color(0x99000000),
        width: double.infinity,
        height: double.infinity,
        alignment: Alignment.center,
        child: Container(
          width: 320,
          decoration: BoxDecoration(
            color: const Color(0xFF16112B),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0x14FFFFFF)),
          ),
          padding: const EdgeInsets.all(20),
          child: Material(
            color: Colors.transparent,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Savatga qo\'shish', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                    IconButton(
                      onPressed: () => setState(() => _selectedProductToAdd = null),
                      icon: const Icon(Icons.close, color: Color(0xFF94A3B8)),
                    )
                  ],
                ),
                const SizedBox(height: 12),
                Text(_selectedProductToAdd['name'], style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
                const SizedBox(height: 4),
                Text(
                  'Sotish narxi: ${_formatCurrency(double.parse(_selectedProductToAdd['price'].toString()))}',
                  style: const TextStyle(color: Color(0xFF10B981), fontSize: 12, fontWeight: FontWeight.bold),
                ),
                Text(
                  'Zaxiradagi qoldiq: ${_selectedProductToAdd['currentStock']} ${_selectedProductToAdd['unit']}',
                  style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                ),
                const SizedBox(height: 20),
                Text('Miqdori (${_selectedProductToAdd['unit']}):', style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                const SizedBox(height: 8),
                TextField(
                  controller: _manualQtyController,
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: InputDecoration(
                    filled: true,
                    fillColor: const Color(0x40000000),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0x14FFFFFF))),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0x14FFFFFF))),
                  ),
                ),
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  height: 44,
                  child: ElevatedButton(
                    onPressed: () => _confirmManualAdd(sync),
                    style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF10B981)),
                    child: const Text('Tasdiqlash', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                  ),
                )
              ],
            ),
          ),
        ),
      ),
    );
  }

  // Formatting helpers
  String _formatCurrency(double amount) {
    return '${amount.toStringAsFixed(0).replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (Match m) => '${m[1]} ')} UZS';
  }

  String _formatQty(double qty, String unit) {
    final str = qty.toStringAsFixed(1);
    return str.endsWith('.0') ? '${qty.toInt()} $unit' : '$str $unit';
  }
}
