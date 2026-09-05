import 'package:flutter/material.dart';
import 'package:uuid/uuid.dart';
import '../data/database_helper.dart';
import '../models/basket.dart';
import '../models/basket_item.dart';
import '../models/user.dart';
import '../services/sync_service.dart';
import '../theme/app_theme.dart';
import 'basket_screen.dart';
import 'history_screen.dart';
import 'products_screen.dart';
import 'settings_screen.dart';
import 'auth_screen.dart';

class MainScreen extends StatefulWidget {
  final User currentUser;

  const MainScreen({Key? key, required this.currentUser}) : super(key: key);

  @override
  _MainScreenState createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  int _selectedIndex = 0;
  List<Basket> _baskets = [];
  Map<String, List<BasketItem>> _basketItemsMap = {};
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadBaskets();
  }

  Future<void> _loadBaskets() async {
    setState(() => _isLoading = true);
    final baskets = await DatabaseHelper.instance.getActiveBaskets(
      widget.currentUser.id,
      tenantId: widget.currentUser.tenantId,
    );

    Map<String, List<BasketItem>> itemsMap = {};
    for (var b in baskets) {
      final items = await DatabaseHelper.instance.getBasketItems(b.id);
      itemsMap[b.id] = items;
    }

    setState(() {
      _baskets = baskets;
      _basketItemsMap = itemsMap;
      _isLoading = false;
    });
  }

  Future<void> _deleteBasket(Basket basket) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppTheme.cardSurface,
        title: const Text('Savatni O\'chirish'),
        content: Text('${basket.clientName} savatchasini o\'chirmoqchimisiz?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Yo\'q', style: TextStyle(color: AppTheme.textMuted)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.dangerRed),
            child: const Text('O\'chirish'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      await DatabaseHelper.instance.deleteBasket(basket.id);
      _loadBaskets();
    }
  }

  Future<void> _createNewBasket() async {
    final newId = const Uuid().v4();
    final now = DateTime.now();

    final newBasket = Basket(
      id: newId,
      tenantId: widget.currentUser.tenantId,
      clientName: 'Mijoz #${_baskets.length + 1}',
      workerId: widget.currentUser.id,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    );

    await DatabaseHelper.instance.saveBasket(newBasket);
    await _loadBaskets();

    if (mounted) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => BasketScreen(
            basket: newBasket,
            currentUser: widget.currentUser,
          ),
        ),
      ).then((_) => _loadBaskets());
    }
  }

  double _calculateBasketTotal(List<BasketItem>? items) {
    if (items == null) return 0.0;
    return items.fold(0.0, (sum, item) => sum + item.totalPrice);
  }

  @override
  Widget build(BuildContext context) {
    final List<Widget> pages = [
      _buildHomeView(),
      ProductsScreen(currentUser: widget.currentUser),
      HistoryScreen(key: ValueKey('history_tab_$_selectedIndex'), currentUser: widget.currentUser),
      SettingsScreen(currentUser: widget.currentUser),
    ];

    return Scaffold(
      backgroundColor: AppTheme.darkBackground,
      body: IndexedStack(
        index: _selectedIndex,
        children: pages,
      ),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          border: Border(
            top: BorderSide(color: Color(0xFF334155), width: 1),
          ),
        ),
        child: BottomNavigationBar(
          currentIndex: _selectedIndex,
          onTap: (index) {
            setState(() {
              _selectedIndex = index;
            });
            if (index == 0) {
              _loadBaskets();
            }
          },
          backgroundColor: AppTheme.cardSurface,
          selectedItemColor: AppTheme.primaryEmerald,
          unselectedItemColor: AppTheme.textMuted,
          selectedLabelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
          unselectedLabelStyle: const TextStyle(fontSize: 12),
          type: BottomNavigationBarType.fixed,
          items: const [
            BottomNavigationBarItem(
              icon: Icon(Icons.home_outlined),
              activeIcon: Icon(Icons.home),
              label: 'Home',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.inventory_2_outlined),
              activeIcon: Icon(Icons.inventory_2),
              label: 'Sklad',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.history_outlined),
              activeIcon: Icon(Icons.history),
              label: 'Tarix',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.settings_outlined),
              activeIcon: Icon(Icons.settings),
              label: 'Sozlamalar',
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHomeView() {
    return Scaffold(
      backgroundColor: AppTheme.darkBackground,
      appBar: AppBar(
        title: Row(
          children: [
            CircleAvatar(
              radius: 16,
              backgroundColor: AppTheme.primaryEmerald.withOpacity(0.2),
              child: Text(
                widget.currentUser.name.isNotEmpty ? widget.currentUser.name.substring(0, 1) : 'U',
                style: const TextStyle(color: AppTheme.primaryEmerald, fontWeight: FontWeight.bold),
              ),
            ),
            const SizedBox(width: 10),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  widget.currentUser.name,
                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                ),
                const Text(
                  'Faol Savatlar',
                  style: TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                ),
              ],
            ),
          ],
        ),
        actions: [
          StreamBuilder<bool>(
            stream: SyncService.instance.onNetworkStatusChanged,
            initialData: SyncService.instance.isOnline,
            builder: (context, snapshot) {
              final isOnline = snapshot.data ?? true;
              return IconButton(
                icon: Icon(
                  isOnline ? Icons.wifi : Icons.wifi_off,
                  color: isOnline ? AppTheme.primaryEmerald : AppTheme.dangerRed,
                ),
                tooltip: isOnline ? 'Online (Internet va Server ulangan)' : 'Offline (Internet uzilgan)',
                onPressed: () async {
                  final onlineNow = await SyncService.instance.checkConnectivityNow();
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(
                          onlineNow
                              ? ' Internet mavjud (Online). Fonda sinxronizatsiya bajarilmoqda.'
                              : ' Internet uzilgan (Offline rejim). Barcha ma\'lumotlar mahalliy SQLite bazasida saqlanadi.',
                        ),
                        backgroundColor: onlineNow ? AppTheme.primaryEmerald : AppTheme.warningOrange,
                        duration: const Duration(seconds: 2),
                      ),
                    );
                  }
                },
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.logout, color: AppTheme.dangerRed),
            tooltip: 'Chiqish',
            onPressed: () {
              Navigator.pushReplacement(
                context,
                MaterialPageRoute(builder: (context) => const AuthScreen()),
              );
            },
          ),
        ],
      ),
      body: Column(
        children: [
          StreamBuilder<bool>(
            stream: SyncService.instance.onNetworkStatusChanged,
            initialData: SyncService.instance.isOnline,
            builder: (context, snapshot) {
              final isOnline = snapshot.data ?? true;
              if (isOnline) return const SizedBox.shrink();

              return Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 16),
                color: AppTheme.warningOrange.withOpacity(0.2),
                child: const Row(
                  children: [
                    Icon(Icons.warning_amber_rounded, color: AppTheme.warningOrange, size: 18),
                    SizedBox(width: 8),
                    Text(
                      'Offline rejim. Amallar internet qaytgach avtomatik sinxronlanadi.',
                      style: TextStyle(color: AppTheme.warningOrange, fontSize: 12),
                    ),
                  ],
                ),
              );
            },
          ),

          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: AppTheme.primaryEmerald))
                : _baskets.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.shopping_basket_outlined, size: 64, color: AppTheme.textMuted.withOpacity(0.5)),
                            const SizedBox(height: 16),
                            const Text(
                              'Hozircha faol savatlar yo\'q',
                              style: TextStyle(color: AppTheme.textSecondary, fontSize: 16),
                            ),
                            const SizedBox(height: 8),
                            const Text(
                              'Yangi mijoz uchun "Yangi Savat" tugmasini bosing',
                              style: TextStyle(color: AppTheme.textMuted, fontSize: 13),
                            ),
                          ],
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: _loadBaskets,
                        color: AppTheme.primaryEmerald,
                        child: ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: _baskets.length,
                          itemBuilder: (context, index) {
                            final basket = _baskets[index];
                            final items = _basketItemsMap[basket.id] ?? [];
                            final total = _calculateBasketTotal(items);
                            final isStale = basket.isStale;

                            return GestureDetector(
                              onTap: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (context) => BasketScreen(
                                      basket: basket,
                                      currentUser: widget.currentUser,
                                    ),
                                  ),
                                ).then((_) => _loadBaskets());
                              },
                              child: Card(
                                margin: const EdgeInsets.only(bottom: 14),
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
                                                  color: AppTheme.primaryEmerald.withOpacity(0.15),
                                                  borderRadius: BorderRadius.circular(10),
                                                ),
                                                child: const Icon(Icons.person, color: AppTheme.primaryEmerald, size: 20),
                                              ),
                                              const SizedBox(width: 10),
                                              Column(
                                                crossAxisAlignment: CrossAxisAlignment.start,
                                                children: [
                                                  Text(
                                                    basket.clientName,
                                                    style: const TextStyle(
                                                      fontSize: 16,
                                                      fontWeight: FontWeight.bold,
                                                      color: AppTheme.textPrimary,
                                                    ),
                                                  ),
                                                  if (basket.clientPhone.isNotEmpty)
                                                    Text(
                                                      basket.clientPhone,
                                                      style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                                                    ),
                                                ],
                                              ),
                                            ],
                                          ),

                                          Row(
                                            children: [
                                              if (isStale)
                                                Container(
                                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                                  decoration: BoxDecoration(
                                                    color: AppTheme.warningOrange.withOpacity(0.2),
                                                    borderRadius: BorderRadius.circular(8),
                                                    border: Border.all(color: AppTheme.warningOrange),
                                                  ),
                                                  child: const Row(
                                                    children: [
                                                      Icon(Icons.access_time, color: AppTheme.warningOrange, size: 12),
                                                      SizedBox(width: 4),
                                                      Text(
                                                        'Eskirgan',
                                                        style: TextStyle(color: AppTheme.warningOrange, fontSize: 10, fontWeight: FontWeight.bold),
                                                      ),
                                                    ],
                                                  ),
                                                )
                                              else if (basket.status == 'waiting')
                                                Container(
                                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                                  decoration: BoxDecoration(
                                                    color: AppTheme.infoBlue.withOpacity(0.2),
                                                    borderRadius: BorderRadius.circular(8),
                                                  ),
                                                  child: const Text(
                                                    'Menejer kutilmoqda',
                                                    style: TextStyle(color: AppTheme.infoBlue, fontSize: 11, fontWeight: FontWeight.bold),
                                                  ),
                                                ),
                                              const SizedBox(width: 4),
                                              IconButton(
                                                icon: const Icon(Icons.delete_outline, color: AppTheme.dangerRed, size: 20),
                                                tooltip: 'Savatni O\'chirish',
                                                onPressed: () => _deleteBasket(basket),
                                              ),
                                            ],
                                          ),
                                        ],
                                      ),

                                      const Divider(height: 24, color: Color(0xFF334155)),

                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Text(
                                            '${items.length} xil mahsulot',
                                            style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13),
                                          ),
                                          Text(
                                            '${total.toStringAsFixed(0)} so\'m',
                                            style: const TextStyle(
                                              fontSize: 18,
                                              fontWeight: FontWeight.bold,
                                              color: AppTheme.accentNeon,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
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
        onPressed: _createNewBasket,
        backgroundColor: AppTheme.primaryEmerald,
        icon: const Icon(Icons.add_shopping_cart, color: Colors.white),
        label: const Text(
          'YANGI SAVAT',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15),
        ),
      ),
    );
  }
}

