# 📱 GetPOS Kafe & Savdo — Mobil Dasturchi Uchun API Qo‘llanmasi (v2.0)

> **Ushbu hujjat:** Flutter, React Native, Kotlin (Android) yoki Swift (iOS) orqali GetPOS ekotizimiga mobil ilova (Ofitsiant, Savdo agenti, Kuryer, Mijoz savati) yaratayotgan dasturchilar uchun to'liq texnik qo'llanma hisoblanadi.

---

## 🌐 1. Server Manzillari va Arxitektura

| Parametr | Qiymat / URL | Vazifasi |
| :--- | :--- | :--- |
| **Markaziy Server (Cloud API)** | `https://getpos.uz/api/v1` | Do'konlar, xodimlar, tovarlar va savatlar serveri |
| **Muqobil Server URL** | `https://getpos.uz/api` | Eski versiyalar bilan to'liq mos keluvchi yo'nalish |
| **Realtime WebSocket** | `wss://getpos.uz/ws/baskets/{tenantId}/` | Savatlar, buyurtmalar va to'lovlar jonli oqimi |
| **Lokal Wi-Fi Kassa API** | `http://<KASSA_IP>:4000/api/v1` | Kafedagi lokal kassa serveri (Oflayn va Oshxona printeri) |
| **Format** | `JSON` (`application/json`) | Barcha so'rov va javoblar JSON formatida |

### ⚠️ Eng Muhim Qoidalar:
1. **Har bir so'rovda do'kon ID'si (`tenantId` yoki `tenant_id`) yuborilishi shart.** Tizim `camelCase` va `snake_case` formatlarining ikkalasini ham qabul qiladi.
2. **Avtorizatsiyadan so'ng barcha so'rovlar sarlavhasida JWT token yuboriladi:**
   ```http
   Authorization: Bearer <access_token>
   Content-Type: application/json
   ```

---

## 🏢 2. Haqiqiy Do'konlar va Sinov Foydalanuvchilari (Test Credentials)

Backend dasturchi tomonidan yaratilgan haqiqiy do'konlar va ularning faol xodimlari:

### 1) Test Kafe (Asosiy Kafe filiali):
* **`tenantId`:** `90e04abf-246d-4683-91eb-1ac34d7b2ee7`
* **Do'kon nomi:** `Test Kafe` (Manzil: Mang'it)
* **Xodim:** `Kafee` (Boshqaruvchi / `manager`)
* **PIN-kod:** **`3333`**

### 2) Test (Sinov va Savdo filiali):
* **`tenantId`:** `5322a772-e9db-402a-8d2b-6293edd03832`
* **Xodim 1:** `John` (Boshqaruvchi / `manager`) — PIN: **`1111`**
* **Xodim 2:** `Ali (Xodim)` (Ofitsiant / `worker`) — PIN: **`2222`**

### 3) Rustam Telefon:
* **`tenantId`:** `57341e59-3c24-409f-af62-9aaec212b689`
* **Xodim 1:** `Rustam` (Boshqaruvchi) — PIN: **`1111`**
* **Xodim 2:** `Sardor Karimov` (Xodim) — PIN: **`1234`**

---

## 🔐 3. Avtorizatsiya va Xodimlar (Auth API)

### 3.1. Server holatini tekshirish (Health Check)
* **Metod:** `GET`
* **URL:** `/health` yoki `/api/health` yoki `/api/v1/health`
* **Javob (200 OK):**
```json
{
  "status": "ok",
  "timestamp": "2026-09-14T14:30:00.000Z"
}
```

### 3.2. Do'konlar / Filiallar ro'yxatini olish (Tenants)
Mobil ilova ochilganda xodim o'z filialini tanlashi uchun chiqariladi.
* **Metod:** `GET`
* **URL:** `/api/v1/tenants/`
* **Javob (200 OK):**
```json
{
  "count": 4,
  "results": [
    {
      "id": "90e04abf-246d-4683-91eb-1ac34d7b2ee7",
      "name": "Test Kafe",
      "address": "Mang'it",
      "status": "active",
      "users_count": 1,
      "products_count": 0
    },
    {
      "id": "5322a772-e9db-402a-8d2b-6293edd03832",
      "name": "Test",
      "address": "Mangit",
      "status": "active",
      "users_count": 2,
      "products_count": 2
    }
  ]
}
```

### 3.3. Filial xodimlari ro'yxatini olish
Tanlangan filialga tegishli xodimlar ro'yxatini ekranga chiqarish (Avatar / Chip ko'rinishida).
* **Metod:** `GET`
* **URL:** `/api/v1/auth/users?tenantId={tenantId}`
* **Javob (200 OK):**
```json
[
  {
    "id": "b58d74f3-3541-4341-acf8-ff00c13964c7",
    "name": "Kafee",
    "role": "manager",
    "status": "active",
    "phone": "+998881111111",
    "email": "kafee@gmail.com",
    "can_sell_on_debt": false,
    "max_debt_limit": 1500000.0
  }
]
```

### 3.4. Xodim PIN-kod orqali kirish (Login)
Xodim o'z PIN-kodini kiritadi. Server JWT token qaytaradi.
* **Metod:** `POST`
* **URL:** `/api/v1/auth/login`
* **Body (JSON):**
```json
{
  "userId": "b58d74f3-3541-4341-acf8-ff00c13964c7",
  "pin": "3333"
}
```
*(Eslatma: agar `userId` yuborilmasa ham faqat `{ "pin": "3333" }` bilan ham tizim xodimni aniqlay oladi).*

* **Muvaffaqiyatli javob (200 OK):**
```json
{
  "success": true,
  "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "id": "b58d74f3-3541-4341-acf8-ff00c13964c7",
  "name": "Kafee",
  "role": "manager",
  "tenantId": "90e04abf-246d-4683-91eb-1ac34d7b2ee7",
  "tenantName": "Test Kafe",
  "user": {
    "id": "b58d74f3-3541-4341-acf8-ff00c13964c7",
    "name": "Kafee",
    "role": "manager",
    "tenant_id": "90e04abf-246d-4683-91eb-1ac34d7b2ee7",
    "tenant_name": "Test Kafe"
  }
}
```
* **Xato javob (401 Unauthorized):**
```json
{
  "success": false,
  "message": ["Login, PIN kod yoki parol noto'g'ri."]
}
```

---

## 📦 4. Mahsulotlar va Kategoriyalar (Products & Menu)

### 4.1. Do'kon mahsulotlarini olish va Qidirish
* **Metod:** `GET`
* **URL:** `/api/v1/products/?tenantId={tenantId}`
* **Headers:** `Authorization: Bearer <access_token>`
* **Qidiruv filtrlari:**
  * Nomi bo'yicha: `/api/v1/products/?tenantId={tenantId}&search=lavash`
  * Shtrix-kod bo'yicha: `/api/v1/products/?tenantId={tenantId}&barcode=4780012345678`
* **Javob (200 OK):**
```json
{
  "count": 2,
  "results": [
    {
      "id": "c0abc21b-8552-4004-acbc-33b091c90f8a",
      "name": "Mini Lavash Mol go'shti",
      "barcode": "4780012345678",
      "price_per_sale_unit": "28000.00",
      "current_stock": "50.0000",
      "sale_unit": "dona",
      "category_id": 1,
      "tenant_id": "90e04abf-246d-4683-91eb-1ac34d7b2ee7"
    }
  ]
}
```

### 4.2. Kategoriyalar ro'yxatini olish
* **Metod:** `GET`
* **URL:** `/api/v1/categories/?tenantId={tenantId}`
* **Javob (200 OK):**
```json
[
  { "id": 1, "name": "Fast Food", "icon": "🍔" },
  { "id": 2, "name": "Ichimliklar", "icon": "🥤" },
  { "id": 3, "name": "Issiq taomlar", "icon": "🍲" }
]
```

---

## 🛒 5. Jonli Savat va Kassaga Uzatish (Baskets — Send to Kassa)

Ofitsiant yoki savdo agenti mobil ilovada savat yig'ib, 1 ta tugma bilan uni **Kassa kompyuteriga uzatadi**. Kassa dasturida bir zumda **`📥 Mobil Savat`** tugmasi yonadi va kassir uni chekka yuklaydi.

### 5.1. Yangi savat ochish
* **Metod:** `POST`
* **URL:** `/api/v1/baskets/`
* **Headers:** `Authorization: Bearer <access_token>`
* **Body (JSON):**
```json
{
  "tenantId": "90e04abf-246d-4683-91eb-1ac34d7b2ee7",
  "workerId": "b58d74f3-3541-4341-acf8-ff00c13964c7",
  "clientName": "Stol 5 / Anvar"
}
```
* **Javob (201 Created):**
```json
{
  "id": "a81d4b2e-2e91-4c19-9db3-d73c713b1902",
  "status": "draft",
  "tenantId": "90e04abf-246d-4683-91eb-1ac34d7b2ee7",
  "workerName": "Kafee",
  "clientName": "Stol 5 / Anvar",
  "totalAmount": 0,
  "items": []
}
```

### 5.2. Savatga mahsulot qo'shish yoki miqdorini o'zgartirish
* **Metod:** `POST`
* **URL:** `/api/v1/baskets/{basketId}/items/`
* **Body (JSON):**
```json
{
  "productId": "c0abc21b-8552-4004-acbc-33b091c90f8a",
  "quantity": 2,
  "comment": "Piyozi ko'proq bo'lsin"
}
```

### 5.3. Savatdan mahsulotni o'chirish
* **Metod:** `DELETE`
* **URL:** `/api/v1/baskets/{basketId}/items/{itemId}/`
* **Javob (204 No Content / 200 OK)**

### 5.4. Savatni "Kassaga Uzatish" (Statusni faollashtirish)
Savat to'liq yig'ilgach, uni kassa kompyuteriga yuborish:
* **Metod:** `PATCH`
* **URL:** `/api/v1/baskets/{basketId}/`
* **Body (JSON):**
```json
{
  "status": "active"
}
```
> ⚡️ **Natija:** Kassa dasturida bir vaqtning o'zida ovozli signal chalinadi va savatlar soni ko'rinadi (masalan: `📥 Mobil Savat (1)`).

### 5.5. Faol savatlar ro'yxatini ko'rish
* **Metod:** `GET`
* **URL:** `/api/v1/baskets/?tenantId={tenantId}&status=active`
* **Javob (200 OK):**
```json
[
  {
    "id": "a81d4b2e-2e91-4c19-9db3-d73c713b1902",
    "clientName": "Stol 5 / Anvar",
    "totalAmount": 56000,
    "status": "active",
    "itemsCount": 2,
    "createdAt": "2026-09-14T14:32:00Z"
  }
]
```

---

## 🍽️ 6. Kafe va Stollar Rejimi (Lokal Kassa API — Wi-Fi)

Ofitsiant kafening ichki Wi-Fi tarmog'ida to'g'ridan-to'g'ri kassa kompyuteriga (`http://<KASSA_IP>:4000/api`) ulanib ishlaganda:

### 6.1. Stollar holatini olish
* **Metod:** `GET`
* **URL:** `/api/tables`
* **Javob (200 OK):**
```json
[
  { "id": 1, "number": 1, "name": "STOL - 1", "status": "free", "hall": "Основной" },
  { "id": 2, "number": 2, "name": "STOL - 2", "status": "busy", "hall": "Основной", "total": 124000, "waiter": "Ali" }
]
```
*(Holatlar: `free` — Bo'sh, `busy` — Band, `bill_requested` — Pre-chek so'ralgan)*.

### 6.2. Stolga buyurtma yuborish (Oshxona printeri / KDS begunok chiqaradi)
* **Metod:** `POST`
* **URL:** `/api/orders`
* **Body (JSON):**
```json
{
  "tableId": 1,
  "waiterId": "b58d74f3-3541-4341-acf8-ff00c13964c7",
  "waiterName": "Kafee",
  "items": [
    { "productId": 1, "name": "Mastava", "quantity": 2, "price": 32000, "comment": "Achchiq bo'lmasin" }
  ]
}
```

### 6.3. Pre-chek / Hisob so'rash
* **Metod:** `POST`
* **URL:** `/api/orders/{orderId}/bill-request`

---

## 💰 7. To'lov va Savdoni Yakunlash (Transactions)

Agar to'lov kassaga bormasdan, ofitsiant yoki kuryer tomonidan joyida qabul qilinsa:
* **Metod:** `POST`
* **URL:** `/api/v1/transactions/`
* **Body (JSON):**
```json
{
  "tenantId": "90e04abf-246d-4683-91eb-1ac34d7b2ee7",
  "basketId": "a81d4b2e-2e91-4c19-9db3-d73c713b1902",
  "paymentMethod": "cash",
  "totalAmount": 56000,
  "clientName": "Anvar aka",
  "clientPhone": "+998901234567"
}
```

### To'lov turlari (`paymentMethod`):
* `cash` — Naqd pul
* `card` — Terminal (Humo / Uzcard)
* `click` — Click orqali to'lov
* `payme` — Payme orqali to'lov
* `debt` — Nasiya / Qarz (Mijoz nomi va telefoni talab qilinadi)

---

## 📡 8. Realtime WebSocket Oqimi (Live Sync)

* **WebSocket manzili:**
  `wss://getpos.uz/ws/baskets/{tenantId}/`

Ulanish hosil bo'lgach, server barcha o'zgarishlarni real vaqtda broadcast qiladi:
```json
{
  "event": "BASKET_CREATED",
  "data": {
    "basketId": "a81d4b2e-2e91-4c19-9db3-d73c713b1902",
    "clientName": "Stol 5 / Anvar",
    "totalAmount": 56000,
    "status": "active"
  }
}
```

---

## 💻 9. Mobil Dasturchi Uchun Tayyor Kod Namunalari

### Flutter (Dart) — Login va PIN tekshirish:
```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

Future<Map<String, dynamic>?> loginWithPin(String tenantId, String userId, String pin) async {
  final url = Uri.parse('https://getpos.uz/api/v1/auth/login');
  final response = await http.post(
    url,
    headers: {'Content-Type': 'application/json'},
    body: jsonEncode({
      'tenantId': tenantId,
      'userId': userId,
      'pin': pin,
    }),
  );

  if (response.statusCode == 200) {
    final data = jsonDecode(response.body);
    String token = data['access'] ?? data['token'];
    print('Muvaffaqiyatli kirdi: ${data['name']}, Token: $token');
    return data;
  } else {
    print('Xatolik: ${response.body}');
    return null;
  }
}
```

### React Native / Axios — Kassaga Savat Uzatish:
```javascript
import axios from 'axios';

const sendBasketToKassa = async (token, tenantId, workerId, clientName, items) => {
  try {
    // 1. Yangi savat ochish
    const createRes = await axios.post('https://getpos.uz/api/v1/baskets/', {
      tenantId,
      workerId,
      clientName,
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const basketId = createRes.data.id;

    // 2. Mahsulotlarni qo'shish
    for (const item of items) {
      await axios.post(`https://getpos.uz/api/v1/baskets/${basketId}/items/`, {
        productId: item.id,
        quantity: item.qty,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    }

    // 3. Kassaga faol qilib uzatish
    await axios.patch(`https://getpos.uz/api/v1/baskets/${basketId}/`, {
      status: 'active'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('Savat muvaffaqiyatli kassaga yuborildi!');
  } catch (error) {
    console.error('Xatolik yuz berdi:', error.response?.data || error.message);
  }
};
```

