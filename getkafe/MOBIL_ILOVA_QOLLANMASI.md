# GetPOS Kafe — Ofitsiantlar va Xodimlar Mobil Ilovasi (Flutter / React Native / Kotlin / Swift) uchun To'liq Texnik Qo'llanma va API Hujjati

> **Hujjat maqsadi:** Ushbu qo'llanma **GetPOS Kafe** ekotizimidagi **Ofitsiantlar (Waiters), Oshpazlar (KDS) va Do'kon xodimlari mobil ilovasi**ni ishlab chiquvchi dasturchi uchun mo'ljallangan. Ilova orqali xodimlar stol tanlash, menyudan buyurtma terish, oshxona/bar printeriga begunok yuborish, hisob so'rash va real-vaqtda stollar holatini kuzatishlari mumkin.

---

## 1. Tizim Arxitekturasi va Ishlash Rejimlari

GetPOS Kafe **Offline-First (Avtonom)** gibrid arxitekturada ishlaydi. Mobil ilova 2 xil rejimda ulanishi mumkin:

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                         1. LOKAL WI-FI KASSA REJIMI                            │
│           (Kafening ichki Wi-Fi tarmog'ida internet yo'qligida ham ishlaydi)    │
│                                                                                │
│   📱 OFITSIANT MOBIL ILOVA  ◄───[ Wi-Fi HTTP / WS ]───►  🖥️ POS KASSA SERVER   │
│       (Smartfon / Planshet)                                (Port: 4000)        │
│                                                                 │              │
│                                                          [ USB / LAN ]         │
│                                                                 ▼              │
│                                                       🖨️ OSHXONA BEGUNOK PRINTER
└────────────────────────────────────────────────────────────────────────────────┘
                                       ▲
                                       │ (Avtomatik fon sinxronizatsiyasi)
                                       ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│                        2. MARKAZIY BULUT BACKEND REJIMI                        │
│                         (https://amuhr.uz/api)                                 │
│                                                                                │
│   🏢 Markaziy ombor, xodimlar boshqaruvi, barcha savdolar va do'kon balansi     │
└────────────────────────────────────────────────────────────────────────────────┘
```

### 1.1. Asosiy Server Havolalari (Base URLs)

| Parametr | Qiymat / URL | Izoh |
| :--- | :--- | :--- |
| **Lokal Kassa REST API** | `http://<KASSA_IP>:4000/api` | Masalan: `http://192.168.1.100:4000/api` |
| **Lokal Real-Time WebSocket** | `ws://<KASSA_IP>:4000/ws` | Stollar va buyurtmalarni jonli sinxronlash |
| **Markaziy Bulut Serveri** | `https://amuhr.uz/api` | Tashqi internet orqali xodimlar va tovarlar |
| **Server Salomatligi (Ping)** | `GET /api/status` | Kassa serveri ishlayotganini tekshirish |

> 💡 **Mobil Dasturchiga muhim eslatma:** Kassa kompyuterining lokal IP manzili dastur ekranining yuqori qismida doim chiqib turadi (masalan: `Wi-Fi IP: 192.168.1.150:4000`). Mobil ilovaning birinchi kirish (Settings) ekranida Kassaning IP manzilini kiritish yoki saqlab qo'yish imkoniyatini taqdim eting.

---

## 2. Autentifikatsiya va Smena Ochish (Authentication API)

Har bir ofitsiant va xodim o'zining **4 xonali shaxsiy PIN-kodi** orqali tizimga kiradi.

### 2.1. Filialdagi xodimlar ro'yxatini olish
Mobil ilovaning kirish ekranida xodimlarning ismlarini avatar shaklida ko'rsatish uchun:

* **Metod:** `GET`
* **URL:** `/api/auth/users`
* **Query parametrlari (ixtiyoriy):** `?tenantId=5322a772-e9db-402a-8d2b-6293edd03832`
* **Response (200 OK):**
```json
[
  {
    "id": "60612290-8399-4949-83f8-9f8216fab884",
    "rawId": 6,
    "name": "Ali (Xodim)",
    "role": "waiter",
    "pin": "1111",
    "status": "active",
    "tenantId": "5322a772-e9db-402a-8d2b-6293edd03832",
    "tenantName": "Test (Mangit)"
  },
  {
    "id": "447a1ad6-e23f-4dde-b4a2-d9256c7af5a7",
    "rawId": 7,
    "name": "John (Boshqaruvchi)",
    "role": "admin",
    "pin": "2222",
    "status": "active",
    "tenantId": "5322a772-e9db-402a-8d2b-6293edd03832",
    "tenantName": "Test (Mangit)"
  },
  {
    "id": "usr_cashier_default",
    "rawId": 8,
    "name": "Kassir (GetPOS)",
    "role": "cashier",
    "pin": "1234",
    "status": "active",
    "tenantId": "5322a772-e9db-402a-8d2b-6293edd03832",
    "tenantName": "Test (Mangit)"
  }
]
```

---

### 2.2. PIN-kod orqali tizimga kirish (Login)
Xodim o'z ismini tanlab, 4 xonali PIN-kodini kiritadi.

* **Metod:** `POST`
* **URL:** `/api/auth/login`
* **Headers:** `Content-Type: application/json`
* **Request Body (JSON):**
```json
{
  "userId": "60612290-8399-4949-83f8-9f8216fab884",
  "pin": "1111"
}
```

* **Muvaffaqiyatli Response (200 OK):**
```json
{
  "success": true,
  "id": "60612290-8399-4949-83f8-9f8216fab884",
  "name": "Ali (Xodim)",
  "role": "waiter",
  "tenantId": "5322a772-e9db-402a-8d2b-6293edd03832",
  "tenantName": "Test (Mangit)",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "60612290-8399-4949-83f8-9f8216fab884",
    "rawId": 6,
    "name": "Ali (Xodim)",
    "role": "waiter",
    "tenantId": "5322a772-e9db-402a-8d2b-6293edd03832",
    "tenantName": "Test (Mangit)",
    "is_shift_open": 1
  }
}
```

* **Xatolik Response (401 Unauthorized):**
```json
{
  "success": false,
  "message": "Noto'g'ri PIN-kod!"
}
```

---

## 3. Zallar va Stollar Xaritasi (Tables API)

Kafeda 20 ta stol mavjud bo'lib, ular 4 ta zalga taqsimlangan:
- **Основной** (1 dan 5-gacha)
- **ZAL 1** (6 dan 10-gacha)
- **ZAL 2** (11 dan 15-gacha)
- **ZAL 3** (16 dan 20-gacha)

### 3.1. Barcha stollar ro'yxati va real holati
* **Metod:** `GET`
* **URL:** `/api/tables`
* **Response (200 OK):**
```json
[
  {
    "id": 1,
    "number": 1,
    "name": "STOL - 1",
    "capacity": 4,
    "hall": "Основной",
    "status": "free",
    "order_id": null,
    "waiter_name": null,
    "total_amount": 0,
    "order_created_at": null
  },
  {
    "id": 5,
    "number": 5,
    "name": "STOL - 5",
    "capacity": 6,
    "hall": "Основной",
    "status": "busy",
    "order_id": "ord_a7b8c9d0",
    "waiter_name": "Ali (Xodim)",
    "total_amount": 84000,
    "order_created_at": "2026-09-14 13:10:00"
  },
  {
    "id": 8,
    "number": 8,
    "name": "STOL - 8",
    "capacity": 4,
    "hall": "ZAL 1",
    "status": "bill_requested",
    "order_id": "ord_f1e2d3c4",
    "waiter_name": "Ali (Xodim)",
    "total_amount": 125000,
    "order_created_at": "2026-09-14 12:45:00"
  }
]
```

### 3.2. Stol Holatlari va Ranglar Standarti (UI UI/UX Guideline)

| Status | Holat | Rangi | Tavsif |
| :--- | :--- | :--- | :--- |
| `free` | **Bo'sh** | 🟢 **Yashil** (`#10b981`) | Stol bo'sh, mijoz kelganda bosib buyurtma ochiladi. |
| `busy` | **Band** | 🔴 **Qizil** (`#ef4444`) | Stol band. Taomlar berilgan, hisob davom etmoqda. |
| `bill_requested` | **Hisob so'ralgan** | 🟡 **Sariq** (`#f59e0b`) | Ofitsiant hisob so'ragan. Kassir chek chiqarishini kutmoqda. |

---

## 4. Menyu va Taomlar Katalogi (Menu API)

### 4.1. Toifalar va Taomlarni birgalikda olish
* **Metod:** `GET`
* **URL:** `/api/menu`
* **Response (200 OK):**
```json
{
  "categories": [
    {
      "id": 1,
      "name": "БИР ЗУМДА",
      "slug": "fastfood_1",
      "icon": "🍔",
      "image": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd..."
    },
    {
      "id": 2,
      "name": "БИРИНЧИ",
      "slug": "first_dish_2",
      "icon": "🍲",
      "image": "https://images.unsplash.com/photo-1547592166-23ac45744acd..."
    },
    {
      "id": 3,
      "name": "ИККИНЧИ",
      "slug": "second_dish_3",
      "icon": "🍖",
      "image": "https://images.unsplash.com/photo-1544025162-d76694265947..."
    },
    {
      "id": 4,
      "name": "КАБОБ",
      "slug": "kabob_4",
      "icon": "🍢",
      "image": "https://images.unsplash.com/photo-1555939594-58d7cb561ad1..."
    },
    {
      "id": 7,
      "name": "ЯХНА",
      "slug": "yahna_drinks_7",
      "icon": "🥤",
      "image": "https://images.unsplash.com/photo-1551024709-8f23befc6f87..."
    }
  ],
  "products": [
    {
      "id": 5,
      "category_id": 3,
      "name": "Choyxona Oshi (Palov)",
      "price": 42000,
      "cost_price": 28000,
      "workshop": "Кухня",
      "product_type": "Товар",
      "image": "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8...",
      "mxik_code": "10701002001000000",
      "package_code": "796",
      "vat_percent": 12,
      "is_available": 1
    },
    {
      "id": 6,
      "category_id": 4,
      "name": "Qo'y go'shti shashlik",
      "price": 25000,
      "cost_price": 17000,
      "workshop": "Кухня",
      "product_type": "Товар",
      "image": "https://images.unsplash.com/photo-1555939594-58d7cb561ad1...",
      "mxik_code": "10701002002000000",
      "package_code": "796",
      "vat_percent": 12,
      "is_available": 1
    },
    {
      "id": 54,
      "category_id": 7,
      "name": "Coca-Cola 1.5",
      "price": 18000,
      "cost_price": 12600,
      "workshop": "Бар",
      "product_type": "Товар",
      "barcode": "3454634536456",
      "remote_id": "c0abc21b-8552-4004-acbc-33b091c90f8a",
      "is_available": 1
    }
  ]
}
```

---

## 5. Buyurtma Berish va Oshxonaga Begunok Yuborish (Orders API)

### 5.1. Yangi buyurtma yuborish yoki ochiq stolga taom qo'shish
Ofitsiant menyudan taomlarni savatga yig'ib, **"Oshxonaga yuborish"** tugmasini bosganda ushbu so'rov yuboriladi.

* **Metod:** `POST`
* **URL:** `/api/orders`
* **Request Body (JSON):**
```json
{
  "tableId": 5,
  "waiterId": 6,
  "waiterName": "Ali (Xodim)",
  "items": [
    {
      "productId": 5,
      "productName": "Choyxona Oshi (Palov)",
      "quantity": 2,
      "price": 42000,
      "comment": "go'shti lahm bo'lsin"
    },
    {
      "productId": 54,
      "productName": "Coca-Cola 1.5",
      "quantity": 1,
      "price": 18000,
      "comment": "muzdek"
    }
  ]
}
```

* **Serverda bajariladigan avtomatik amallar:**
  1. Stol holati `busy` (Band - Qizil) ga o'tadi;
  2. Kassa va oshxona printeriga avtomatik **"Begunok"** cheki chop etiladi;
  3. Telegram JetBot'ga buyurtma haqida tezkor xabar boradi;
  4. Barcha ulangan planshetlarga WebSocket orqali yangilanish yuboriladi.

* **Response (200 OK):**
```json
{
  "success": true,
  "orderId": "ord_8f1a2b3c",
  "totalAmount": 102000,
  "order": {
    "id": "ord_8f1a2b3c",
    "tableNumber": 5,
    "totalAmount": 102000,
    "status": "open"
  },
  "kitchenTicket": {
    "id": "kt_1789207890123",
    "orderId": "ord_8f1a2b3c",
    "tableNumber": 5,
    "waiterName": "Ali (Xodim)",
    "ticketText": "========================================\n          OSHXONA BUYURTMASI           \nSTOL: 5-STOL | OFITSIANT: Ali (Xodim)\n1. Choyxona Oshi (Palov) x 2 (go'shti lahm bo'lsin)\n2. Coca-Cola 1.5 x 1 (muzdek)\n========================================"
  }
}
```

---

### 5.2. Stol bo'yicha joriy faol buyurtmani ko'rish
Ofitsiant band stol ustiga bosganida oldin nimalar buyurtma qilinganini ko'rish uchun:

* **Metod:** `GET`
* **URL:** `/api/orders/table/:tableId`
* **Misol:** `GET /api/orders/table/5`
* **Response (200 OK):**
```json
{
  "success": true,
  "order": {
    "id": "ord_8f1a2b3c",
    "table_id": 5,
    "waiter_id": 6,
    "waiter_name": "Ali (Xodim)",
    "status": "open",
    "total_amount": 102000,
    "created_at": "2026-09-14 13:20:15"
  },
  "items": [
    {
      "id": 41,
      "order_id": "ord_8f1a2b3c",
      "product_id": 5,
      "product_name": "Choyxona Oshi (Palov)",
      "quantity": 2,
      "price": 42000,
      "comment": "go'shti lahm bo'lsin",
      "status": "sent",
      "is_cancelled": 0
    },
    {
      "id": 42,
      "order_id": "ord_8f1a2b3c",
      "product_id": 54,
      "product_name": "Coca-Cola 1.5",
      "quantity": 1,
      "price": 18000,
      "comment": "muzdek",
      "status": "sent",
      "is_cancelled": 0
    }
  ],
  "table": {
    "id": 5,
    "number": 5,
    "name": "STOL - 5",
    "status": "busy"
  }
}
```

---

### 5.3. Taomni bekor qilish / Qaytarish (Cancel / Refund Item)
Agar mijoz biror taomni rad etsa yoki noto'g'ri kiritilgan bo'lsa:

* **Metod:** `POST`
* **URL:** `/api/orders/:orderId/cancel-item`
* **Misol:** `POST /api/orders/ord_8f1a2b3c/cancel-item`
* **Request Body (JSON):**
```json
{
  "itemId": 42,
  "cancelQty": 1,
  "reason": "Mijoz rad etdi (Fanta so'ragan ekan)"
}
```
* **Response (200 OK):**
```json
{
  "success": true,
  "message": "Taom muvaffaqiyatli bekor qilindi",
  "cancelledItem": {
    "id": 42,
    "product_name": "Coca-Cola 1.5",
    "cancel_qty": 1,
    "reason": "Mijoz rad etdi (Fanta so'ragan ekan)"
  },
  "newTotal": 84000
}
```

---

### 5.4. Hisob so'rash ("Pre-bill / Check" tugmasi)
Mijoz ovqatlanib bo'lib hisob so'raganda ofitsiant mobil ilovada **"Hisob so'rash"** tugmasini bosadi. Natijada Kassa ekranida stol **SARIQ** rangga aylanadi va kassir chek chiqaradi:

* **Metod:** `POST`
* **URL:** `/api/orders/:orderId/bill-request`
* **Misol:** `POST /api/orders/ord_8f1a2b3c/bill-request`
* **Response (200 OK):**
```json
{
  "success": true,
  "table": {
    "id": 5,
    "number": 5,
    "name": "STOL - 5",
    "status": "bill_requested",
    "total_amount": 102000,
    "waiter_name": "Ali (Xodim)"
  }
}
```

---

## 6. Real-Vaqtda WebSocket Sinxronizatsiyasi (WebSockets)

Mobil ilova doim kassa bilan jonli aloqada bo'lishi va boshqa ofitsiantlar yoki kassa qilgan o'zgarishlarni soniya ichida ko'rib turishi shart.

### 6.1. Ulanish manzili:
```
ws://<KASSA_IP>:4000/ws
```

### 6.2. Ulanish ochilganda yuboriladigan xabar (Handshake):
```json
{
  "event": "join_tenant",
  "data": {
    "tenantId": "5322a772-e9db-402a-8d2b-6293edd03832",
    "userId": "60612290-8399-4949-83f8-9f8216fab884",
    "role": "waiter"
  }
}
```

### 6.3. Serverdan keladigan jonli hodisalar (Events):

| Hodisa (Event) | Qachon keladi? | Ilova nima qilishi kerak? |
| :--- | :--- | :--- |
| `TABLE_UPDATED` | Stol holati, ofitsiant yoki summa o'zgarganda | Stollar ro'yxatida tegishli stol kartasini yangilash |
| `BILL_REQUESTED` | Biror stoldan hisob so'ralganda | Stolni sariq rangga bo'yash |
| `PAYMENT_COMPLETED` | Kassir to'lovni olib, stolni yopganda | Stolni bo'shatish (🟢 Yashil qilish) va savatni tozalash |
| `ORDER_ITEM_CANCELLED` | Taom bekor qilinganda | Buyurtmadagi summani yangilash |
| `PONG` | Heartbeat `PING` ga javob | Aloqa tirikligini tasdiqlash |

#### WebSocket Hodisalari misollari:
```json
// 1. Stol yangilanishi
{
  "event": "TABLE_UPDATED",
  "data": {
    "id": 5,
    "number": 5,
    "status": "busy",
    "total_amount": 102000,
    "waiter_name": "Ali (Xodim)"
  }
}

// 2. To'lov tugab stol bo'shashi
{
  "event": "PAYMENT_COMPLETED",
  "data": {
    "tableId": 5,
    "receipt": {
      "receiptSeq": 1012,
      "totalAmount": 102000
    }
  }
}
```

---

## 7. Flutter (Dart) — Tayyor Kod Namunalari

Mobil ilova dasturchisi to'g'ridan-to'g'ri o'z loyihasiga ko'chirib olishi mumkin bo'lgan professional Dart/Flutter servis namunalari:

### 7.1. API Service (`lib/services/api_service.dart`)

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiService {
  final String baseUrl; // Masalan: "http://192.168.1.150:4000/api"

  ApiService({required this.baseUrl});

  // 1. Xodimlar ro'yxatini olish
  Future<List<dynamic>> getUsers() async {
    final res = await http.get(Uri.parse('$baseUrl/auth/users'));
    if (res.statusCode == 200) {
      return jsonDecode(res.body);
    }
    throw Exception("Xodimlarni yuklashda xatolik: ${res.statusCode}");
  }

  // 2. PIN-kod orqali login qilish
  Future<Map<String, dynamic>> login(String userId, String pin) async {
    final res = await http.post(
      Uri.parse('$baseUrl/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'userId': userId, 'pin': pin}),
    );
    final data = jsonDecode(res.body);
    if (res.statusCode == 200 && data['success'] == true) {
      return data;
    }
    throw Exception(data['message'] ?? "PIN-kod noto'g'ri");
  }

  // 3. Stollar ro'yxatini olish
  Future<List<dynamic>> getTables() async {
    final res = await http.get(Uri.parse('$baseUrl/tables'));
    if (res.statusCode == 200) {
      return jsonDecode(res.body);
    }
    throw Exception("Stollarni yuklashda xatolik");
  }

  // 4. Menyu va taomlarni olish
  Future<Map<String, dynamic>> getMenu() async {
    final res = await http.get(Uri.parse('$baseUrl/menu'));
    if (res.statusCode == 200) {
      return jsonDecode(res.body);
    }
    throw Exception("Menyuni yuklashda xatolik");
  }

  // 5. Oshxonaga buyurtma yuborish
  Future<Map<String, dynamic>> sendOrder({
    required int tableId,
    required dynamic waiterId,
    required String waiterName,
    required List<Map<String, dynamic>> items,
  }) async {
    final res = await http.post(
      Uri.parse('$baseUrl/orders'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'tableId': tableId,
        'waiterId': waiterId,
        'waiterName': waiterName,
        'items': items,
      }),
    );
    final data = jsonDecode(res.body);
    if (res.statusCode == 200 && data['success'] == true) {
      return data;
    }
    throw Exception(data['message'] ?? "Buyurtma yuborishda xatolik");
  }

  // 6. Hisob so'rash (Pre-bill)
  Future<bool> requestBill(String orderId) async {
    final res = await http.post(Uri.parse('$baseUrl/orders/$orderId/bill-request'));
    return res.statusCode == 200;
  }
}
```

---

### 7.2. WebSocket Service (`lib/services/websocket_service.dart`)

```dart
import 'dart:async';
import 'dart:convert';
import 'package:web_socket_channel/web_socket_channel.dart';

class WebSocketService {
  WebSocketChannel? _channel;
  final String wsUrl; // Masalan: "ws://192.168.1.150:4000/ws"
  final Function(String event, dynamic data) onEventReceived;
  Timer? _pingTimer;

  WebSocketService({required this.wsUrl, required this.onEventReceived});

  void connect({required String tenantId, required String userId}) {
    try {
      _channel = WebSocketChannel.connect(Uri.parse(wsUrl));

      // Handshake xabari
      _channel?.sink.add(jsonEncode({
        'event': 'join_tenant',
        'data': {'tenantId': tenantId, 'userId': userId, 'role': 'waiter'}
      }));

      _channel?.stream.listen(
        (message) {
          final parsed = jsonDecode(message);
          final event = parsed['event'] ?? '';
          final data = parsed['data'];
          onEventReceived(event, data);
        },
        onError: (error) => _reconnect(tenantId: tenantId, userId: userId),
        onDone: () => _reconnect(tenantId: tenantId, userId: userId),
      );

      // Heartbeat ping (har 15 soniyada)
      _pingTimer?.cancel();
      _pingTimer = Timer.periodic(const Duration(seconds: 15), (_) {
        _channel?.sink.add(jsonEncode({'event': 'PING'}));
      });
    } catch (e) {
      _reconnect(tenantId: tenantId, userId: userId);
    }
  }

  void _reconnect({required String tenantId, required String userId}) {
    _pingTimer?.cancel();
    Future.delayed(const Duration(seconds: 3), () {
      connect(tenantId: tenantId, userId: userId);
    });
  }

  void disconnect() {
    _pingTimer?.cancel();
    _channel?.sink.close();
  }
}
```

---

## 8. React Native / TypeScript — Namuna

```typescript
import axios from 'axios';

export const createApiClient = (kassaIp: string) => {
  const api = axios.create({
    baseURL: `http://${kassaIp}:4000/api`,
    timeout: 5000,
    headers: { 'Content-Type': 'application/json' },
  });

  return {
    login: (userId: string, pin: string) => api.post('/auth/login', { userId, pin }),
    getTables: () => api.get('/tables'),
    getMenu: () => api.get('/menu'),
    sendOrder: (payload: { tableId: number; waiterId: any; waiterName: string; items: any[] }) =>
      api.post('/orders', payload),
    requestBill: (orderId: string) => api.post(`/orders/${orderId}/bill-request`),
  };
};
```

---

## 9. Mobil Dasturchi uchun UI/UX Tavsiyalari

1. **Tezkor Buyurtma Terish (Fast Cart):**
   - Ofitsiant mijoz yonida turganda taomni 1 ta bosishda savatga qo'shishi, sonini `+` va `-` tugmalari bilan oshirishi juda qulay bo'lishi kerak.
2. **Taom Qidiruvi (Search & Filter):**
   - Toifalar (Tabs) gorizontal skroll bo'lsin.
   - Tezkor qidiruv maydoni (Masalan: `Palov` deb yozishi bilanoq chiqishi).
3. **Kassa IP Manzilini Keshda Saqlash:**
   - Bir marta kiritilgan Kassa IP manzili (`192.168.x.x`) `SharedPreferences` (yoki `AsyncStorage`) da saqlansin, har gal qayta so'ramasin.
4. **Tarmoq Uzilishi Xabarnomasi:**
   - Agar planshet kafening Wi-Fi doirasidan chiqib ketsa yoki kassa o'chsa, ekranning yuqorisida qizil chiziqda *"Kassa bilan aloqa yo'q (Qayta ulanmoqda...)"* yozuvi tursin. Aloqa tiklanishi bilan WebSocket avtomatik stollarni yangilab olsin.
5. **Vibratsiya va Tovush:**
   - Oshxonaga buyurtma muvaffaqiyatli ketganda yoki taom tayyor bo'lgani haqida xabar kelganda qisqa haptik vibratsiya bering.

---

## 10. Savollar yoki Yordam Kerak Bo'lsa

- Kassa Serveri Porti: `4000` (REST & WebSocket)
- Test Menejer PIN-kodi: `2222` (John)
- Test Ofitsiant PIN-kodi: `1111` (Ali)
- Savol yoki yangi API kerak bo'lsa, backend dasturchi bilan bog'laning.
