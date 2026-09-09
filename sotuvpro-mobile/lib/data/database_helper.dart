import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import '../models/user.dart';
import '../models/product.dart';
import '../models/basket.dart';
import '../models/basket_item.dart';
import '../models/transaction.dart';
import '../models/debt.dart';
import '../services/security_service.dart';

class DatabaseHelper {
  static final DatabaseHelper instance = DatabaseHelper._init();
  static Database? _database;

  DatabaseHelper._init();

  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDB('sotuvpro_v2.db');
    return _database!;
  }

  Future<Database> _initDB(String filePath) async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, filePath);

    return await openDatabase(
      path,
      version: 5,
      onCreate: _createDB,
      onUpgrade: _onUpgrade,
    );
  }

  Future<void> _onUpgrade(Database db, int oldVersion, int newVersion) async {
    if (oldVersion < 3) {
      try {
        await db.execute('ALTER TABLE products ADD COLUMN isSynced INTEGER NOT NULL DEFAULT 1');
      } catch (_) {}
    }
    if (oldVersion < 4) {
      try {
        await db.execute('ALTER TABLE users ADD COLUMN tenantName TEXT DEFAULT "SotuvPro Store"');
        await db.execute('ALTER TABLE users ADD COLUMN phoneNumber TEXT DEFAULT ""');
        await db.execute('ALTER TABLE users ADD COLUMN canSellOnDebt INTEGER NOT NULL DEFAULT 1');
        await db.execute('ALTER TABLE users ADD COLUMN maxDebtLimit REAL NOT NULL DEFAULT 1500000.0');
      } catch (_) {}
      try {
        await db.execute('''
          CREATE TABLE IF NOT EXISTS debts (
            id TEXT PRIMARY KEY,
            tenantId TEXT NOT NULL,
            clientName TEXT NOT NULL,
            clientPhone TEXT NOT NULL,
            totalDebt REAL NOT NULL,
            paidAmount REAL NOT NULL,
            remainingDebt REAL NOT NULL,
            dueDate TEXT NOT NULL,
            status TEXT NOT NULL,
            isOverdue INTEGER NOT NULL DEFAULT 0,
            createdAt TEXT NOT NULL
          )
        ''');
      } catch (_) {}
    }
    if (oldVersion < 5) {
      try {
        await db.execute('ALTER TABLE products ADD COLUMN costPrice REAL NOT NULL DEFAULT 0.0');
      } catch (_) {}
    }
  }

  Future<void> _createDB(Database db, int version) async {
    await db.execute('''
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        tenantId TEXT NOT NULL,
        tenantName TEXT,
        name TEXT NOT NULL,
        phoneNumber TEXT,
        pinHash TEXT NOT NULL,
        role TEXT NOT NULL,
        avatarUrl TEXT,
        isActive INTEGER NOT NULL DEFAULT 1,
        canSellOnDebt INTEGER NOT NULL DEFAULT 1,
        maxDebtLimit REAL NOT NULL DEFAULT 1500000.0
      )
    ''');

    await db.execute('''
      CREATE TABLE products (
        id TEXT PRIMARY KEY,
        tenantId TEXT NOT NULL,
        name TEXT NOT NULL,
        purchaseUnit TEXT NOT NULL,
        saleUnit TEXT NOT NULL,
        conversionRate REAL NOT NULL,
        price REAL NOT NULL,
        costPrice REAL NOT NULL DEFAULT 0.0,
        stockQuantity REAL NOT NULL,
        barcode TEXT NOT NULL,
        qrCode TEXT NOT NULL,
        lowStockThreshold REAL NOT NULL,
        isTopSeller INTEGER NOT NULL DEFAULT 0,
        isSynced INTEGER NOT NULL DEFAULT 1
      )
    ''');

    await db.execute('''
      CREATE TABLE baskets (
        id TEXT PRIMARY KEY,
        tenantId TEXT NOT NULL,
        clientName TEXT NOT NULL,
        clientPhone TEXT,
        workerId TEXT NOT NULL,
        status TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )
    ''');

    await db.execute('''
      CREATE TABLE basket_items (
        id TEXT PRIMARY KEY,
        basketId TEXT NOT NULL,
        productId TEXT NOT NULL,
        productName TEXT NOT NULL,
        saleUnit TEXT NOT NULL,
        quantity REAL NOT NULL,
        unitPrice REAL NOT NULL,
        FOREIGN KEY (basketId) REFERENCES baskets (id) ON DELETE CASCADE
      )
    ''');

    await db.execute('''
      CREATE TABLE transactions (
        id TEXT PRIMARY KEY,
        tenantId TEXT NOT NULL,
        basketId TEXT NOT NULL,
        clientName TEXT NOT NULL,
        totalAmount REAL NOT NULL,
        paymentType TEXT NOT NULL,
        paidCash REAL NOT NULL,
        paidCard REAL NOT NULL,
        debtAmount REAL NOT NULL,
        status TEXT NOT NULL,
        workerId TEXT NOT NULL,
        workerName TEXT NOT NULL,
        createdAt TEXT NOT NULL
      )
    ''');

    await db.execute('''
      CREATE TABLE debts (
        id TEXT PRIMARY KEY,
        tenantId TEXT NOT NULL,
        clientName TEXT NOT NULL,
        clientPhone TEXT NOT NULL,
        totalDebt REAL NOT NULL,
        paidAmount REAL NOT NULL,
        remainingDebt REAL NOT NULL,
        dueDate TEXT NOT NULL,
        status TEXT NOT NULL,
        isOverdue INTEGER NOT NULL DEFAULT 0,
        createdAt TEXT NOT NULL
      )
    ''');

    await _seedInitialData(db);
  }

  Future<void> _seedInitialData(Database db) async {
    // Backend serverga ulanish: Dastlabki mock ma'lumotlar o'chirildi
  }

  // --- USER OPERATIONS ---
  Future<void> saveUser(User user) async {
    final db = await instance.database;
    await db.insert(
      'users',
      user.toMap(),
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<List<User>> getUsers() async {
    final db = await instance.database;
    final result = await db.query('users', where: 'isActive = ?', whereArgs: [1]);
    return result.map((json) => User.fromMap(json)).toList();
  }

  Future<User?> verifyUserPin(String userId, String rawPin) async {
    final db = await instance.database;
    final hashedPin = SecurityService.instance.hashPin(rawPin);

    final result = await db.query(
      'users',
      where: 'id = ? AND pinHash = ? AND isActive = ?',
      whereArgs: [userId, hashedPin, 1],
    );

    if (result.isNotEmpty) {
      return User.fromMap(result.first);
    }
    return null;
  }

  // --- PRODUCT OPERATIONS ---
  Future<List<Product>> getProducts({String tenantId = 'tenant_store_101'}) async {
    final db = await instance.database;
    final result = await db.query(
      'products',
      where: 'tenantId = ?',
      whereArgs: [tenantId],
    );
    return result.map((json) => Product.fromMap(json)).toList();
  }

  Future<Product?> getProductByCode(String code, {String? tenantId}) async {
    final cleanCode = code.trim();
    if (cleanCode.isEmpty) return null;

    final db = await instance.database;
    List<Map<String, dynamic>> result = [];

    if (tenantId != null && tenantId.isNotEmpty) {
      result = await db.query(
        'products',
        where: '(tenantId = ? OR tenantId = "tenant_store_101" OR tenantId = "tenant_default") AND (LOWER(TRIM(barcode)) = LOWER(?) OR LOWER(TRIM(qrCode)) = LOWER(?))',
        whereArgs: [tenantId, cleanCode, cleanCode],
      );
    }

    if (result.isEmpty) {
      // Fallback: Agar tenantId mos tushmasa, mahalliy bazadagi barcha mahsulotlar orasida barcode bo'yicha izlaymiz
      result = await db.query(
        'products',
        where: 'LOWER(TRIM(barcode)) = LOWER(?) OR LOWER(TRIM(qrCode)) = LOWER(?)',
        whereArgs: [cleanCode, cleanCode],
      );
    }

    if (result.isNotEmpty) {
      return Product.fromMap(result.first);
    }
    return null;
  }

  Future<void> addProduct(Product product) async {
    final db = await instance.database;
    final cleanBarcode = product.barcode.trim();

    if (cleanBarcode.isNotEmpty) {
      final existing = await getProductByCode(cleanBarcode, tenantId: product.tenantId);
      if (existing != null && existing.id != product.id) {
        final updatedStock = existing.stockQuantity + product.stockQuantity;
        await db.update(
          'products',
          {
            'name': product.name.isNotEmpty ? product.name : existing.name,
            'price': product.price > 0 ? product.price : existing.price,
            'stockQuantity': updatedStock,
            'purchaseUnit': product.purchaseUnit,
            'saleUnit': product.saleUnit,
            'isSynced': product.isSynced ? 1 : 0,
          },
          where: 'id = ?',
          whereArgs: [existing.id],
        );
        return;
      }
    }

    await db.insert('products', product.toMap(), conflictAlgorithm: ConflictAlgorithm.replace);
  }

  Future<void> updateProductStock(String productId, double newStock, {double? newPrice}) async {
    final db = await instance.database;
    final Map<String, dynamic> values = {
      'stockQuantity': newStock,
    };
    if (newPrice != null && newPrice > 0) {
      values['price'] = newPrice;
    }
    await db.update('products', values, where: 'id = ?', whereArgs: [productId]);
  }

  Future<List<Product>> getUnsyncedProducts({String tenantId = 'tenant_store_101'}) async {
    final db = await instance.database;
    final result = await db.query(
      'products',
      where: 'tenantId = ? AND isSynced = ?',
      whereArgs: [tenantId, 0],
    );
    return result.map((json) => Product.fromMap(json)).toList();
  }

  Future<void> markProductSynced(String oldId, String newServerId) async {
    final db = await instance.database;
    if (oldId != newServerId) {
      await db.rawUpdate(
        'UPDATE products SET id = ?, isSynced = 1 WHERE id = ?',
        [newServerId, oldId],
      );
    } else {
      await db.update(
        'products',
        {'isSynced': 1},
        where: 'id = ?',
        whereArgs: [oldId],
      );
    }
  }

  Future<void> replaceSyncedProductsFromServer(List<Product> serverProducts, {String tenantId = 'tenant_store_101'}) async {
    final db = await instance.database;
    await db.transaction((txn) async {
      await txn.delete(
        'products',
        where: 'isSynced = 1 AND (tenantId = ? OR tenantId = "tenant_store_101" OR tenantId = "tenant_default")',
        whereArgs: [tenantId],
      );
      for (var p in serverProducts) {
        await txn.insert(
          'products',
          p.toMap(),
          conflictAlgorithm: ConflictAlgorithm.replace,
        );
      }
    });
  }

  Future<void> upsertProductsFromServer(List<Product> serverProducts) async {
    final db = await instance.database;
    await db.transaction((txn) async {
      for (var p in serverProducts) {
        await txn.insert(
          'products',
          p.toMap(),
          conflictAlgorithm: ConflictAlgorithm.replace,
        );
      }
    });
  }

  // --- BASKET OPERATIONS ---
  Future<List<Basket>> getActiveBaskets(String workerId, {String? tenantId}) async {
    final db = await instance.database;
    final tId = (tenantId != null && tenantId.isNotEmpty) ? tenantId : 'tenant_store_101';

    final result = await db.query(
      'baskets',
      where: '(tenantId = ? OR tenantId = "tenant_store_101" OR tenantId = "tenant_default") AND (workerId = ? OR workerId = "user_1" OR workerId = "" OR ? = "user_1") AND status IN ("active", "waiting")',
      whereArgs: [tId, workerId, workerId],
      orderBy: 'updatedAt DESC',
    );
    return result.map((json) => Basket.fromMap(json)).toList();
  }

  Future<void> deleteBasket(String basketId) async {
    final db = await instance.database;
    await db.delete('basket_items', where: 'basketId = ?', whereArgs: [basketId]);
    await db.delete('baskets', where: 'id = ?', whereArgs: [basketId]);
  }

  Future<void> saveBasket(Basket basket) async {
    final db = await instance.database;
    await db.insert('baskets', basket.toMap(), conflictAlgorithm: ConflictAlgorithm.replace);
  }

  Future<void> updateBasketClient(String basketId, String name, String phone) async {
    final db = await instance.database;
    final cleanName = SecurityService.instance.sanitizeInput(name);
    final cleanPhone = SecurityService.instance.sanitizeInput(phone);

    await db.update(
      'baskets',
      {
        'clientName': cleanName,
        'clientPhone': cleanPhone,
        'updatedAt': DateTime.now().toIso8601String(),
      },
      where: 'id = ?',
      whereArgs: [basketId],
    );
  }

  // --- BASKET ITEM OPERATIONS ---
  Future<List<BasketItem>> getBasketItems(String basketId) async {
    final db = await instance.database;
    final result = await db.query('basket_items', where: 'basketId = ?', whereArgs: [basketId]);
    return result.map((json) => BasketItem.fromMap(json)).toList();
  }

  Future<void> addOrUpdateBasketItem(BasketItem item) async {
    final db = await instance.database;
    final cleanQty = SecurityService.instance.validateQuantity(item.quantity);

    final existing = await db.query(
      'basket_items',
      where: 'basketId = ? AND productId = ?',
      whereArgs: [item.basketId, item.productId],
    );

    if (existing.isNotEmpty) {
      final currentItem = BasketItem.fromMap(existing.first);
      final newQty = currentItem.quantity + cleanQty;
      await db.update(
        'basket_items',
        {'quantity': newQty},
        where: 'id = ?',
        whereArgs: [currentItem.id],
      );
    } else {
      await db.insert('basket_items', item.toMap());
    }

    await db.update(
      'baskets',
      {'updatedAt': DateTime.now().toIso8601String()},
      where: 'id = ?',
      whereArgs: [item.basketId],
    );
  }

  Future<void> updateBasketItemQuantity(String itemId, double newQuantity) async {
    final db = await instance.database;
    final cleanQty = SecurityService.instance.validateQuantity(newQuantity);

    if (cleanQty <= 0) {
      await db.delete('basket_items', where: 'id = ?', whereArgs: [itemId]);
    } else {
      await db.update(
        'basket_items',
        {'quantity': cleanQty},
        where: 'id = ?',
        whereArgs: [itemId],
      );
    }
  }

  // --- TRANSACTION OPERATIONS ---
  Future<void> completeSale(TransactionModel transaction) async {
    final db = await instance.database;
    await db.transaction((txn) async {
      await txn.insert('transactions', transaction.toMap());

      await txn.update(
        'baskets',
        {'status': transaction.status == 'pending_approval' ? 'waiting' : 'completed'},
        where: 'id = ?',
        whereArgs: [transaction.basketId],
      );

      if (transaction.status == 'completed') {
        final items = await txn.query('basket_items', where: 'basketId = ?', whereArgs: [transaction.basketId]);
        for (var map in items) {
          final item = BasketItem.fromMap(map);
          await txn.rawUpdate(
            'UPDATE products SET stockQuantity = stockQuantity - ? WHERE id = ? AND tenantId = ?',
            [item.quantity, item.productId, transaction.tenantId],
          );
        }
      }
    });
  }

  Future<List<TransactionModel>> getWorkerTransactions(String workerId, {String? tenantId}) async {
    final db = await instance.database;
    List<String> whereClauses = [];
    List<dynamic> whereArgs = [];

    if (tenantId != null && tenantId.isNotEmpty) {
      whereClauses.add('(tenantId = ? OR tenantId = "tenant_default" OR tenantId = "tenant_store_101" OR tenantId IS NULL OR tenantId = "")');
      whereArgs.add(tenantId);
    }
    if (workerId.isNotEmpty) {
      whereClauses.add('(workerId = ? OR workerId = "user_1" OR workerId = "" OR ? = "user_1" OR workerId IS NULL)');
      whereArgs.addAll([workerId, workerId]);
    }

    final whereString = whereClauses.isNotEmpty ? whereClauses.join(' AND ') : null;

    final result = await db.query(
      'transactions',
      where: whereString,
      whereArgs: whereArgs.isNotEmpty ? whereArgs : null,
      orderBy: 'createdAt DESC',
    );
    return result.map((json) => TransactionModel.fromMap(json)).toList();
  }

  // --- DEBT OPERATIONS ---
  Future<void> saveDebt(DebtModel debt) async {
    final db = await instance.database;
    await db.insert('debts', debt.toMap(), conflictAlgorithm: ConflictAlgorithm.replace);
  }

  Future<List<DebtModel>> getDebtsFromLocal({String? search, bool? isOverdue}) async {
    final db = await instance.database;
    List<String> whereClauses = [];
    List<dynamic> whereArgs = [];

    if (search != null && search.trim().isNotEmpty) {
      whereClauses.add('(LOWER(clientName) LIKE ? OR clientPhone LIKE ?)');
      final term = '%${search.trim().toLowerCase()}%';
      whereArgs.addAll([term, term]);
    }

    if (isOverdue == true) {
      whereClauses.add('isOverdue = 1');
    }

    final whereString = whereClauses.isNotEmpty ? whereClauses.join(' AND ') : null;

    final result = await db.query(
      'debts',
      where: whereString,
      whereArgs: whereArgs.isNotEmpty ? whereArgs : null,
      orderBy: 'createdAt DESC',
    );

    return result.map((json) => DebtModel.fromMap(json)).toList();
  }

  Future<void> updateDebtPaymentInLocal(String debtId, double paidAmount) async {
    final db = await instance.database;
    final existing = await db.query('debts', where: 'id = ?', whereArgs: [debtId]);
    if (existing.isNotEmpty) {
      final current = DebtModel.fromMap(existing.first);
      final newPaid = current.paidAmount + paidAmount;
      final newRemaining = current.totalDebt - newPaid;
      final newStatus = newRemaining <= 0 ? 'paid' : current.status;

      await db.update(
        'debts',
        {
          'paidAmount': newPaid,
          'remainingDebt': newRemaining < 0 ? 0.0 : newRemaining,
          'status': newStatus,
        },
        where: 'id = ?',
        whereArgs: [debtId],
      );
    }
  }
}

