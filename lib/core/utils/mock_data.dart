import '../../models/waiter.dart';
import '../../models/hall_table.dart';
import '../../models/category.dart';
import '../../models/product.dart';
import '../../models/order.dart';

class MockData {
  static List<Waiter> get waiters => [
        Waiter(id: '1', name: 'Alisher Rahimov', pin: '1234', role: 'Katta ofitsiyant'),
        Waiter(id: '2', name: 'Malika Karimova', pin: '1111', role: 'Ofitsiyant'),
        Waiter(id: '3', name: 'Jamshid Umarov', pin: '0000', role: 'Ofitsiyant'),
      ];

  static List<Hall> get halls => [
        Hall(id: '1', name: 'Asosiy zal', orderIndex: 0),
        Hall(id: '2', name: 'Yozgi Terassa', orderIndex: 1),
        Hall(id: '3', name: 'VIP Xonalar', orderIndex: 2),
      ];

  static List<RestaurantTable> get tables => [
        // Asosiy zal
        RestaurantTable(
          id: 't1',
          hallId: '1',
          number: 'Stol 1',
          seats: 4,
          status: TableStatus.busy,
          activeOrderId: 'ord_1',
          activeWaiterName: 'Alisher Rahimov',
          guestCount: 3,
          totalAmount: 245000,
          openedAt: DateTime.now().subtract(const Duration(minutes: 35)),
        ),
        RestaurantTable(
          id: 't2',
          hallId: '1',
          number: 'Stol 2',
          seats: 4,
          status: TableStatus.free,
        ),
        RestaurantTable(
          id: 't3',
          hallId: '1',
          number: 'Stol 3',
          seats: 6,
          status: TableStatus.billRequested,
          activeOrderId: 'ord_2',
          activeWaiterName: 'Malika Karimova',
          guestCount: 5,
          totalAmount: 480000,
          openedAt: DateTime.now().subtract(const Duration(minutes: 75)),
        ),
        RestaurantTable(
          id: 't4',
          hallId: '1',
          number: 'Stol 4',
          seats: 2,
          status: TableStatus.free,
        ),
        RestaurantTable(
          id: 't5',
          hallId: '1',
          number: 'Stol 5',
          seats: 8,
          status: TableStatus.reserved,
        ),
        RestaurantTable(
          id: 't6',
          hallId: '1',
          number: 'Stol 6',
          seats: 4,
          status: TableStatus.busy,
          activeOrderId: 'ord_3',
          activeWaiterName: 'Jamshid Umarov',
          guestCount: 2,
          totalAmount: 135000,
          openedAt: DateTime.now().subtract(const Duration(minutes: 18)),
        ),

        // Terassa
        RestaurantTable(
          id: 't7',
          hallId: '2',
          number: 'Terassa 1',
          seats: 4,
          status: TableStatus.free,
        ),
        RestaurantTable(
          id: 't8',
          hallId: '2',
          number: 'Terassa 2',
          seats: 4,
          status: TableStatus.busy,
          activeOrderId: 'ord_4',
          activeWaiterName: 'Alisher Rahimov',
          guestCount: 4,
          totalAmount: 310000,
          openedAt: DateTime.now().subtract(const Duration(minutes: 50)),
        ),
        RestaurantTable(
          id: 't9',
          hallId: '2',
          number: 'Terassa 3',
          seats: 6,
          status: TableStatus.free,
        ),

        // VIP
        RestaurantTable(
          id: 't10',
          hallId: '3',
          number: 'VIP 1 (Sharq)',
          seats: 12,
          status: TableStatus.busy,
          activeOrderId: 'ord_5',
          activeWaiterName: 'Alisher Rahimov',
          guestCount: 10,
          totalAmount: 1250000,
          openedAt: DateTime.now().subtract(const Duration(minutes: 90)),
        ),
        RestaurantTable(
          id: 't11',
          hallId: '3',
          number: 'VIP 2 (Yevropa)',
          seats: 10,
          status: TableStatus.free,
        ),
      ];

  static List<Category> get categories => [
        Category(id: 'c1', name: 'Barchasi', iconName: 'all_inclusive', orderIndex: 0),
        Category(id: 'c2', name: 'Milliy taomlar', iconName: 'restaurant', orderIndex: 1),
        Category(id: 'c3', name: 'Shashliklar', iconName: 'outdoor_grill', orderIndex: 2),
        Category(id: 'c4', name: 'Sho\'rvalar', iconName: 'soup_kitchen', orderIndex: 3),
        Category(id: 'c5', name: 'Salatlar', iconName: 'eco', orderIndex: 4),
        Category(id: 'c6', name: 'Ichimliklar', iconName: 'local_cafe', orderIndex: 5),
        Category(id: 'c7', name: 'Desertlar', iconName: 'cake', orderIndex: 6),
      ];

  static List<Product> get products => [
        // Milliy taomlar
        Product(
          id: 'p1',
          categoryId: 'c2',
          name: 'Choyxona Palov (To\'y oshi)',
          price: 45000,
          unit: 'porsiya',
          description: 'Devzira guruch, barra qo\'y go\'shti, qazi va bedana tuxumi bilan',
          modifiers: [
            ProductModifier(id: 'm1', name: 'Qo\'shimcha Qazi', extraPrice: 12000),
            ProductModifier(id: 'm2', name: 'Bedana tuxumi (2 dona)', extraPrice: 4000),
          ],
        ),
        Product(
          id: 'p2',
          categoryId: 'c2',
          name: 'Qozon Kabob',
          price: 75000,
          unit: 'porsiya',
          description: 'Qovurilgan qarsildoq kartoshka va yumshoq qo\'zichoq go\'shti',
          modifiers: [
            ProductModifier(id: 'm3', name: 'Achchiq sous bilan', extraPrice: 3000),
          ],
        ),
        Product(
          id: 'p3',
          categoryId: 'c2',
          name: 'Norin',
          price: 40000,
          unit: 'porsiya',
          description: 'Qazi va ot go\'shti solingan mayda xamir, sho\'rva bilan',
        ),

        // Shashliklar
        Product(
          id: 'p4',
          categoryId: 'c3',
          name: 'Qiyma Shashlik',
          price: 22000,
          unit: 'six',
          description: 'Dumbasi bilan tozalangan barra mol va qo\'y qiymasi',
          modifiers: [
            ProductModifier(id: 'm4', name: 'Piyoz bilan', extraPrice: 0),
            ProductModifier(id: 'm5', name: 'Sirka (uksus) qo\'shib', extraPrice: 0),
          ],
        ),
        Product(
          id: 'p5',
          categoryId: 'c3',
          name: 'Kuskovoy Shashlik (Mol go\'shti)',
          price: 28000,
          unit: 'six',
          description: 'Maxsus ziravorlarda marinadlangan mol go\'shti',
        ),
        Product(
          id: 'p6',
          categoryId: 'c3',
          name: 'Tovuq Shashlik',
          price: 20000,
          unit: 'six',
          description: 'Yumshoq tovuq filesi shashligi',
        ),
        Product(
          id: 'p7',
          categoryId: 'c3',
          name: 'Jigar Shashlik',
          price: 20000,
          unit: 'six',
          description: 'Dumba yog\'i bilan jigar',
          isStopList: true, // Stop-list testi uchun
        ),

        // Sho'rvalar
        Product(
          id: 'p8',
          categoryId: 'c4',
          name: 'Ko\'za Sho\'rva',
          price: 38000,
          unit: 'porsiya',
          description: 'Sopol ko\'zada pishirilgan xushbo\'y qo\'y go\'shti sho\'rvasi',
        ),
        Product(
          id: 'p9',
          categoryId: 'c4',
          name: 'Lag\'mon (Cho\'zma)',
          price: 36000,
          unit: 'porsiya',
          description: 'Qo\'lda cho\'zilgan xamir, yangi sabzavotlar va go\'sht qaylasi',
        ),

        // Salatlar
        Product(
          id: 'p10',
          categoryId: 'c5',
          name: 'Achchiq-Chuchuk',
          price: 18000,
          unit: 'porsiya',
          description: 'Yozgi shirin pomidor, piyoz va qalampir',
        ),
        Product(
          id: 'p11',
          categoryId: 'c5',
          name: 'Sezar Salati (Tovuqli)',
          price: 42000,
          unit: 'porsiya',
          description: 'Aysberg, qovurilgan tovuq filesi, parmezan va maxsus sous',
        ),
        Product(
          id: 'p12',
          categoryId: 'c5',
          name: 'Fransuz Salati',
          price: 32000,
          unit: 'porsiya',
          description: 'Qizil lavlagi, go\'sht, qarsildoq kartoshka pay va mayonez',
        ),

        // Ichimliklar
        Product(
          id: 'p13',
          categoryId: 'c6',
          name: 'Ko\'k Choy (Choynak)',
          price: 8000,
          unit: 'choynak',
          description: 'Navro\'z 95 ko\'k choyi, limon va novvot bilan',
          modifiers: [
            ProductModifier(id: 'm6', name: 'Limon qo\'shish', extraPrice: 3000),
            ProductModifier(id: 'm7', name: 'Novvot', extraPrice: 3000),
          ],
        ),
        Product(
          id: 'p14',
          categoryId: 'c6',
          name: 'Qora Choy (Choynak)',
          price: 8000,
          unit: 'choynak',
        ),
        Product(
          id: 'p15',
          categoryId: 'c6',
          name: 'Coca-Cola 1.5L',
          price: 18000,
          unit: 'dona',
          modifiers: [
            ProductModifier(id: 'm8', name: 'Muz bilan', extraPrice: 0),
            ProductModifier(id: 'm9', name: 'Muzsiz / Iliq', extraPrice: 0),
          ],
        ),
        Product(
          id: 'p16',
          categoryId: 'c6',
          name: 'Karamolli Muzdek Choy',
          price: 22000,
          unit: 'grafin',
        ),

        // Non
        Product(
          id: 'p17',
          categoryId: 'c2',
          name: 'Tandir Non (Toshkent)',
          price: 6000,
          unit: 'dona',
        ),
        Product(
          id: 'p18',
          categoryId: 'c2',
          name: 'Patir Non',
          price: 12000,
          unit: 'dona',
        ),
      ];

  static RestaurantOrder getInitialOrderForTable(RestaurantTable table) {
    if (table.activeOrderId == 'ord_1') {
      return RestaurantOrder(
        id: 'ord_1',
        tableId: table.id,
        tableName: table.number,
        waiterId: '1',
        waiterName: 'Alisher Rahimov',
        guestCount: 3,
        serviceFeePercent: 10.0,
        createdAt: table.openedAt ?? DateTime.now(),
        items: [
          OrderItem(
            id: 'item_1',
            productId: 'p1',
            productName: 'Choyxona Palov (To\'y oshi)',
            unitPrice: 45000,
            quantity: 3,
            selectedModifiers: ['Qo\'shimcha Qazi'],
            modifiersExtraPrice: 12000,
            status: OrderItemStatus.sent,
          ),
          OrderItem(
            id: 'item_2',
            productId: 'p10',
            productName: 'Achchiq-Chuchuk',
            unitPrice: 18000,
            quantity: 2,
            status: OrderItemStatus.sent,
          ),
          OrderItem(
            id: 'item_3',
            productId: 'p13',
            productName: 'Ko\'k Choy (Choynak)',
            unitPrice: 8000,
            quantity: 1,
            selectedModifiers: ['Limon qo\'shish'],
            modifiersExtraPrice: 3000,
            status: OrderItemStatus.sent,
          ),
          OrderItem(
            id: 'item_4',
            productId: 'p17',
            productName: 'Tandir Non (Toshkent)',
            unitPrice: 6000,
            quantity: 2,
            status: OrderItemStatus.sent,
          ),
        ],
      );
    }

    return RestaurantOrder(
      id: 'ord_${table.id}_${DateTime.now().millisecondsSinceEpoch}',
      tableId: table.id,
      tableName: table.number,
      waiterId: '1',
      waiterName: 'Ofitsiyant',
      guestCount: table.seats > 2 ? 2 : 1,
      serviceFeePercent: 10.0,
      createdAt: DateTime.now(),
      items: [],
    );
  }
}
