# GetPOS Mobile — Yangilangan To'liq API Qo'llanmasi (v2.0)

> **Ushbu qo'llanma:** Mobil ilova (Flutter / React Native / Kotlin / Swift) yaratayotgan dasturchi uchun mo'ljallangan. GetPOS ekotizimida ofitsiantlar, do'kon xodimlari va kuryerlar ushbu API orqali markaziy bulut serveri (`https://getpos.uz`) va lokal kassa bilan to'liq ishlaydi.

---

## Asosiy Server Manzillari (Base URLs)

| Parametr | Qiymat / URL | Izoh |
| :--- | :--- | :--- |
| **Asosiy Server API** | `https://getpos.uz` | Markaziy bulut backend |
| **WebSocket URL** | `wss://getpos.uz/ws/baskets/{tenantId}/` | Savatlar va buyurtmalar jonli oqimi |
| **Lokal Kassa API** | `http://<KASSA_IP>:4000/api` | Kafedagi lokal Wi-Fi kassa serveri |
| **Lokal WebSocket** | `ws://<KASSA_IP>:4000/ws` | Mahalliy stollar va begunok printer oqimi |

> 📌 **Eslatma:** Server API marshrutlari ham `/api/...`, ham `/api/v1/...` formatida to'liq ishlaydi.

---

## ⚙️ 1. Server Ulanishi va Do'kon Tanlash (Config)

### 1.1. Server holatini tekshirish (Health Check)
* **Metod:** `GET`
* **URL:** `/health` yoki `/api/health`
* **Javob (200 OK):**
```json
{
  "status": "ok",
  "timestamp": "2026-09-10T11:57:05.697851+00:00"
}
```

### 1.2. Do'konlar ro'yxatini olish (Tenants)
Foydalanuvchi qaysi filialda ishlayotganini tanlashi uchun chiqariladi.
* **Metod:** `GET`
* **URL:** `/api/tenants/`
* **Javob (200 OK):**
```json
{
  "count": 1,
  "results": [
    {
      "id": "5322a772-e9db-402a-8d2b-6293edd03832",
      "name": "Test",
      "address": "Toshkent sh.",
      "status": "active"
    }
  ]
}
```

---

## 🔐 2. Avtorizatsiya va Xodimlar (Auth & Login)

### 2.1. Do'kon xodimlari ro'yxatini olish
Kirish ekranida xodimni tanlash uchun avatar ko'rinishida chiqariladi.
* **Metod:** `GET`
* **URL:** `/api/auth/users?tenantId={tenantId}`
* **Javob (200 OK):**
```json
[
  {
    "id": "60612290-8399-4949-83f8-9f8216fab884",
    "name": "Ali (Xodim)",
    "role": "worker",
    "phone": "+998901234567",
    "status": "active",
    "is_active": true,
    "can_sell_on_debt": true,
    "max_debt_limit": 2000000
  },
  {
    "id": "447a1ad6-e23f-4dde-b4a2-d9256c7af5a7",
    "name": "John",
    "role": "manager",
    "phone": "+998880542304",
    "status": "active",
    "is_active": true
  }
]
```

### 2.2. Xodim PIN-kodi orqali kirish (Login)
Har bir xodim o'zining shaxsiy PIN-kodi bilan kiradi:
* **John (Boshqaruvchi / Admin):** PIN: `1111`
* **Ali (Xodim / Ofitsiant):** PIN: `2222`

* **Metod:** `POST`
* **URL:** `/api/auth/login`
* **Body (JSON):**
```json
{
  "userId": "60612290-8399-4949-83f8-9f8216fab884",
  "pin": "2222"
}
```
* **Javob (200 OK):**
```json
{
  "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "userId": "60612290-8399-4949-83f8-9f8216fab884",
  "name": "Ali (Xodim)",
  "role": "worker",
  "tenantId": "5322a772-e9db-402a-8d2b-6293edd03832",
  "tenantName": "Test",
  "user": {
    "id": "60612290-8399-4949-83f8-9f8216fab884",
    "name": "Ali (Xodim)",
    "role": "worker",
    "can_sell_on_debt": true,
    "max_debt_limit": 2000000
  }
}
```
> 🔑 **Muhim:** Keyingi barcha so'rovlarda Headerda jo'natiladi:  
> `Authorization: Bearer {access}`

---

## 📦 3. Mahsulotlar va Sklad (Products)

### 3.1. Do'kondagi mahsulotlarni olish / Qidirish
* **Metod:** `GET`
* **URL:** `/api/products/?tenant_id={tenantId}`
* **Qidiruv parametrlari:**
  * Qidiruv matni bo'yicha: `/api/products/?tenant_id={tenantId}&search=cola`
  * Shtrix-kod bo'yicha: `/api/products/?tenant_id={tenantId}&barcode=3454634536456`
* **Javob (200 OK):**
```json
{
  "count": 2,
  "results": [
    {
      "id": "c0abc21b-8552-4004-acbc-33b091c90f8a",
      "name": "Coca-Cola 1.5",
      "barcode": "3454634536456",
      "price_per_sale_unit": "18000.00",
      "current_stock": "96.0000",
      "sale_unit": "dona",
      "tenant_id": "5322a772-e9db-402a-8d2b-6293edd03832"
    }
  ]
}
```

### 3.2. Yangi tovar qo'shishda Global Bazadan qidirish
Agar do'konda tovar bo'lmasa, nomini qo'lda yozmaslik uchun shtrix-kod skaner qilinganda tekshiriladi:
* **Metod:** `GET`
* **URL:** `/api/products/lookup-barcode/?barcode=3454634536456`
* **Javob (Topilsa):**
```json
{
  "found": true,
  "name": "Coca-Cola 1.5",
  "unit": "dona",
  "icon": "🥤"
}
```
* **Javob (Topilmasa):**
```json
{
  "found": false
}
```

### 3.3. Do'kon omboriga yangi tovar kiritish
* **Metod:** `POST`
* **URL:** `/api/products/`
* **Headers:** `Authorization: Bearer {token}`
* **Body (JSON):**
```json
{
  "tenant_id": "5322a772-e9db-402a-8d2b-6293edd03832",
  "name": "Coca-Cola 1.5",
  "price_per_sale_unit": 18000,
  "current_stock": 100,
  "sale_unit": "dona",
  "purchase_unit": "dona",
  "conversion_factor": 1.0,
  "barcode": "3454634536456"
}
```

---

## 🛒 4. Savat va Kassaga Uzatish (Baskets / Send to Kassa)

### 4.1. Yangi savat ochish
* **Metod:** `POST`
* **URL:** `/api/baskets/`
* **Body (JSON):**
```json
{
  "tenant_id": "5322a772-e9db-402a-8d2b-6293edd03832",
  "worker_id": "60612290-8399-4949-83f8-9f8216fab884",
  "client_name": "Mijoz 1"
}
```

### 4.2. Savatga tovar qo'shish / Soni o'zgartirish
* **Metod:** `POST`
* **URL:** `/api/baskets/{basketId}/items/`
* **Body (JSON):**
```json
{
  "product_id": "c0abc21b-8552-4004-acbc-33b091c90f8a",
  "quantity": 2,
  "scanned_by": "Ali (Xodim)"
}
```

### 4.3. Savatdan tovarni o'chirish
* **Metod:** `DELETE`
* **URL:** `/api/baskets/{basketId}/items/{itemId}/`

### 4.4. Savatni "Kassaga Uzatish"
Savat to'liq yig'ilgach, uni kassir qabul qilishi uchun statusini faollashtirish:
* **Metod:** `PATCH`
* **URL:** `/api/baskets/{basketId}/`
* **Body (JSON):**
```json
{
  "status": "active",
  "client_name": "Ali Valiyev (Zal 1)"
}
```
> ⚡️ **Eslatma:** Ushbu so'rov yuborilishi bilan, kompyuterdagi Kassa dasturida avtomatik ravishda **`📥 Mobil Savat`** tugmasi yonadi va kassir uni 1 ta tugma bilan chekka yuklab to'lovni oladi.

### 4.5. Xodimning o'ziga tegishli faol savatlarini olish
* **Metod:** `GET`
* **URL:** `/api/baskets/?tenant_id={tenantId}&worker_id={workerId}&status=active`

---

## 💰 5. To'g'ridan-to'g'ri Savdoni Yakunlash (Transactions)

Agar to'lovni kassaga yubormasdan, to'g'ridan-to'g'ri mobil ilovadan olish kerak bo'lsa:
* **Metod:** `POST`
* **URL:** `/api/transactions/`
* **Body (JSON):**
```json
{
  "tenant_id": "5322a772-e9db-402a-8d2b-6293edd03832",
  "basket_id": "832bc2ff-c7ee-4dea-81e8-64f4f264d4a3",
  "payment_method": "cash",
  "total_amount": 36000,
  "client_name": "Mijoz Ali",
  "client_phone": "+998901234567"
}
```
* **To'lov turlari (`payment_method`):**
  * `cash` — Naqd pul
  * `card` — Plastik karta / Humo / Uzcard terminal
  * `debt` — Qarz / Nasiya
  * `click` — Click orqali to'lov
  * `payme` — Payme orqali to'lov

---

## 🍽️ 6. Kafe va Stollar Rejimi (Lokal Kassa API)

Kafening ichki Wi-Fi tarmog'ida ofitsiant stollar bilan ishlaganda quyidagi lokal kassa API ishlatiladi (`http://<KASSA_IP>:4000/api`):

### 6.1. Stollar ro'yxatini olish
* **Metod:** `GET`
* **URL:** `/api/tables`
* **Response:**
```json
[
  { "id": 1, "number": 1, "name": "STOL - 1", "status": "free", "hall": "Основной" },
  { "id": 2, "number": 2, "name": "STOL - 2", "status": "busy", "hall": "Основной" }
]
```
*(Holatlar: `free` - yashil, `busy` - qizil, `bill_requested` - sariq)*.

### 6.2. Stolga buyurtma jo'natish (Oshxonaga begunok chiqarish)
* **Metod:** `POST`
* **URL:** `/api/orders`
* **Body (JSON):**
```json
{
  "tableId": 1,
  "waiterId": "60612290-8399-4949-83f8-9f8216fab884",
  "waiterName": "Ali (Xodim)",
  "items": [
    { "productId": 1, "name": "Mastava", "quantity": 2, "price": 32000, "comment": "Achchiq bo'lmasin" }
  ]
}
```

### 6.3. Hisob so'rash (Pre-check)
* **Metod:** `POST`
* **URL:** `/api/orders/{orderId}/bill-request`

---

## ⚡️ Muhim Qoidalar va Eslatmalar

1. **`tenant_id` majburiy:** Barcha so'rovlarda do'kon identifikatori (`tenant_id`) yuborilishi shart.
2. **Kassaga yuborish:** Xodim savatga tovar qo'shib, savatni saqlaganda u avtomatik ravishda server orqali Kassa dasturiga tushadi va kassir kompyuterida **`📥 Mobil Savat`** tugmasi yonadi.
3. **Ofitsiant va Admin PIN-kodlari:**
   * John (Admin / Manager): **`1111`**
   * Ali (Xodim / Ofitsiant): **`2222`**
