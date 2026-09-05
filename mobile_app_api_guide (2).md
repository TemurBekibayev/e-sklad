# SotuvPro — Mobile App (Savdo Xodimi) API Hujjati va Integratsiya Qo'llanmasi

**Mo'ljallangan:** Mobile App Dasturchisi (React Native / Expo)  
**Tizim:** SotuvPro — Savdo xodimi mobil ilovasi  
**Hujjat versiyasi:** 2.0 (Ishlab chiqarish darajasi)

---

## 📌 1. Umumiy Ma'lumotlar va Ulanish

- **Server Base URL:** `https://amuhr.uz/api/v1`
- **Swagger / OpenAPI Dokumentatsiya:** `https://amuhr.uz/api/docs/`
- **So'rov/Javob formati:** `application/json`
- **Autentifikatsiya:** Barcha himoyalangan so'rovlarda `Authorization` sarlavhasi (header) majburiy:
  ```http
  Authorization: Bearer <access_token>
  ```
- **Muhim arxitektura tamoyili:** Do'kon identifikatori (`tenant_id`) hech qachon so'rov tanasida (body) yoki parametrda yuborilmaydi — server uni avtomatik ravishda **JWT token ichidan** o'qiydi.

---

## 🔐 2. Autentifikatsiya (PIN Kod orqali)

Mobil ilovada xodimlar **4 xonali PIN-kod** orqali kiradi.

### 2.1. PIN orqali kirish
`POST /auth/login/`

**Request Body:**
```json
{
  "pin": "5555"
}
```
*(Agar bitta qurilmadan bir nechta xodim foydalansa, xodim ismi bilan yuborish mumkin: `{"login": "Bekzod Rahimov", "pin": "5555"}`)*

**Muvaffaqiyatli javob (200 OK):**
```json
{
  "access": "eyJhbGciOiJIUzI1NiIsIn...",
  "refresh": "eyJhbGciOiJIUzI1NiIsIn...",
  "user": {
    "id": "c1f76d90-3620-4bb5-8669-0df487e411b4",
    "name": "Bekzod Rahimov",
    "email": "bekzod@toshkent.uz",
    "role": "worker",
    "tenant_id": "787ad36d-9fc0-4f9e-a89e-05a9ee083fae",
    "tenant_name": "Toshkent Elektron",
    "tenant_status": "active"
  }
}
```

> [!CAUTION]
> **Xavfsizlik qoidasi (Brute-force himoyasi):**
> Ketma-ket 5 marta noto'g'ri PIN kiritilsa, hisob 5 daqiqaga qulflanadi (`401 Unauthorized`, `detail: "Hisob vaqtincha bloklangan"`). Mobil ilovada bu vaqtda taymer ko'rsatilishi kerak.

### 2.2. Tokenni yangilash (Refresh)
`POST /auth/refresh/`

**Request Body:**
```json
{
  "refresh": "<refresh_token>"
}
```

**Javob (200 OK):**
```json
{
  "access": "eyJhbGciOiJIUzI1NiIsIn..."
}
```

---

## 📦 3. Skanerlash va Mahsulotlarni Qidirish

Mobil ilova kameradan Shtrix-kod (EAN-13, Code128 va h.k.) yoki QR kodni o'qiydi.

### 3.1. Skanerlangan kod orqali tovar topish
`GET /products/lookup/?barcode=<SKANERLANGAN_KOD>`

**Misol:** `GET /products/lookup/?barcode=4780001234567`

**Javob (200 OK — O'z do'konida topildi):**
```json
{
  "id": "a9d8e7b6-1234-4567-89ab-cdef01234567",
  "name": "iPhone 15 Pro Max",
  "purchase_unit": "blok",
  "sale_unit": "dona",
  "price_per_sale_unit": "16500000.00",
  "current_stock": "24.0000",
  "reserved_stock": "0.0000",
  "available_stock": "24.0000",
  "barcode": "4780001234567",
  "qr_code": "QR-IPHONE-15PM",
  "is_low_stock": false,
  "exists_globally": false
}
```
*Ilova foydalanuvchidan faqat miqdorni (sotish birligida) so'raydi va savatga qo'shadi.*

**Javob (200 OK — Umumiy bazada (Global Catalog) topildi, boshqa do'konga tegishli):**
```json
{
  "id": "4bc2e309-5dbb-4bae-bcb8-9537e0787f33",
  "name": "Coca-Cola 1.5 L",
  "purchase_unit": "Blok",
  "sale_unit": "Dona",
  "price_per_sale_unit": "11000.00",
  "current_stock": "120.0000",
  "barcode": "4780001234567",
  "exists_globally": true
}
```
*Ilova ushbu nom (name) va birliklarni (purchase_unit, sale_unit) avtomatik to'ldirib beradi. Sotuvchi faqat o'z narxi va ombor qoldig'ini yozib saqlaydi.*

**Javob (404 Not Found — Mutlaqo topilmadi):**
```json
{
  "detail": "Mahsulot topilmadi.",
  "scanned_code": "4780001234567"
}
```
*Ilovada darhol "Yangi mahsulot qo'shish" formasi ochiladi va skanerlangan kod formaga avtomatik joylanadi.*

### 3.2. Mahsulotlar katalogi (Tezkor Grid va Offline Kesh)
`GET /products/`

**Query Parametrlar (ixtiyoriy):**
- `search` — nomi yoki kodi bo'yicha qidiruv
- `is_archived=false` — faqat faol tovarlar

**Javob (200 OK):**
```json
{
  "count": 12,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": "a9d8e7b6-1234-4567-89ab-cdef01234567",
      "name": "iPhone 15 Pro Max",
      "sale_unit": "dona",
      "price_per_sale_unit": "16500000.00",
      "available_stock": "24.0000",
      "barcode": "4780001234567"
    }
  ]
}
```

---

## 🛒 4. Savatchalar Boshqaruvi (Baskets)

Bir vaqtning o'zida bir nechta parallel xaridorga xizmat ko'rsatish mumkin.

### 4.1. Xodimning faol savatlarini olish
`GET /baskets/active/`

**Javob (200 OK):**
```json
[
  {
    "id": "e8d7c6b5-0001-4000-8000-abcdef123456",
    "client_name": "Alisher Turg'unov",
    "client_phone": "+998901239988",
    "status": "active",
    "items_count": 2,
    "total_amount": "16535000.00",
    "created_at": "2026-08-24T14:30:00+05:00",
    "updated_at": "2026-08-24T14:32:15+05:00",
    "items": [
      {
        "id": "b1a2c3d4-1111-2222-3333-444455556666",
        "product_id": "a9d8e7b6-1234-4567-89ab-cdef01234567",
        "product_name": "iPhone 15 Pro Max",
        "sale_unit": "dona",
        "unit_price": "16500000.00",
        "quantity": "1.0000",
        "subtotal": "16500000.00"
      },
      {
        "id": "b1a2c3d4-2222-3333-4444-555566667777",
        "product_id": "c8d7e6f5-5555-6666-7777-888899990000",
        "product_name": "USB kabel (Type-C)",
        "sale_unit": "dona",
        "unit_price": "35000.00",
        "quantity": "1.0000",
        "subtotal": "35000.00"
      }
    ]
  }
]
```

### 4.2. Yangi savat ochish
`POST /baskets/`

**Request Body:**
```json
{
  "client_name": "Alisher Turg'unov",
  "client_phone": "+998901239988",
  "notes": "Tezkor yetkazish"
}
```

### 4.3. Savatga tovar qo'shish
`POST /baskets/{basket_id}/items/`

**Request Body:**
```json
{
  "product_id": "a9d8e7b6-1234-4567-89ab-cdef01234567",
  "quantity": 1.0
}
```
> [!NOTE]
> Tovar savatga tushganda bazada `reserved_stock` oshiriladi. Bu boshqa xodimlar bir vaqtda ayni tovarni ortiqcha sotib yubormasligini ta'minlaydi.

### 4.4. Tovar miqdorini o'zgartirish (+ / -)
`PATCH /baskets/{basket_id}/items/{item_id}/`

**Request Body:**
```json
{
  "quantity": 3.0
}
```

### 4.5. Tovarni savatdan o'chirish
`DELETE /baskets/{basket_id}/items/{item_id}/`

*(Mahsulot band qilingan qoldiqdan (`reserved_stock`) qaytariladi).*

---

## 💳 5. Savdoni Yakunlash (Finalize Sale)

Savdo xodimi oddiy naqd to'lovli savdolarni o'zi yakunlashi mumkin.

`POST /baskets/{basket_id}/finalize/`

**Request Body:**
```json
{
  "payment_method": "cash",
  "cash_amount": 35000.00,
  "card_amount": 0.00,
  "debt_amount": 0.00,
  "discount_amount": 0.00
}
```

**Muvaffaqiyatli yakunlanganda (201 Created):**
```json
{
  "transaction_id": "f5e4d3c2-9999-8888-7777-666655554444",
  "status": "completed",
  "total_amount": "35000.00",
  "message": "Savdo muvaffaqiyatli yakunlandi."
}
```

**Menejer tasdig'i talab qilinganda (200 OK):**
```json
{
  "transaction_id": "f5e4d3c2-9999-8888-7777-666655554444",
  "status": "pending_approval",
  "total_amount": "16535000.00",
  "message": "Savdo summasi limitdan yuqori bo'lgani sababli menejer tasdig'iga yuborildi."
}
```
*(Bunday holatda mobil ilovada "Menejer tasdig'i kutilmoqda" xabari ko'rsatiladi).*

---

## 📴 6. Oflayn Sinxronizatsiya (Offline Sync)

Internet yo'q bo'lganda amallar mahalliy SQLite bazasida navbatga qo'yiladi. Internet qaytgach, bir so'rovda serverga jo'natiladi.

`POST /baskets/sync-offline/`

**Request Body:**
```json
{
  "events": [
    {
      "action": "create_basket",
      "temp_basket_id": "offline-b-001",
      "client_name": "Sardor",
      "created_at": "2026-08-24T15:10:00Z"
    },
    {
      "action": "add_item",
      "temp_basket_id": "offline-b-001",
      "product_id": "a9d8e7b6-1234-4567-89ab-cdef01234567",
      "quantity": 2.0
    },
    {
      "action": "finalize",
      "temp_basket_id": "offline-b-001",
      "payment_method": "cash",
      "total_amount": 33000000.00
    }
  ]
}
```

**Javob (200 OK):**
```json
{
  "synced_count": 3,
  "conflicts": []
}
```

---

## 🖨️ 7. Yorliq va Chek Generatsiyasi (Bluetooth Printer)

Mahsulot yorlig'ini (Shtrix-kod/QR + Narxi + Nomi) chop etish uchun:

`GET /products/{product_id}/label/`

**Javob:** Termoprinter (ESC/POS) uchun tayyor format yoki PDF fayl havolasi.

---

## ⚠️ 8. Xatolik Kodlari Jadvali

| HTTP Status | Ma'nosi | Ilova nima qilishi kerak? |
|---|---|---|
| `400 Bad Request` | Noto'g'ri kiritilgan ma'lumot (masalan manfiy son) | Xatolik matnini xodimga ko'rsatish |
| `401 Unauthorized` | PIN xato yoki token eskirgan | PIN kiritish ekraniga yo'naltirish |
| `403 Forbidden` | Do'kon muzlatilgan yoki ruxsat yo'q | Ogohlantirish ko'rsatish |
| `404 Not Found` | Tovar yoki savat topilmadi | Yangi tovar qo'shish oynasini ochish |
| `409 Conflict` | Sklad qoldig'i yetarli emas | Qoldiq yetarli emasligini bildirish |
| `502 Bad Gateway` | Serverda texnik ishlar ketmoqda | Server bilan aloqa uzilganini bildirish va birozdan so'ng qayta urinish |

---

## 📊 9. Yangi API Endpoint'lar va Do'kon Tafsilotlari

### 9.1. Qarzlar Daftari (Debts)
- **GET /debts/** — Do'konga tegishli barcha qarzlar ro'yxatini olish.
- **POST /debts/** — Yangi qarz yaratish.
- **PATCH /debts/{id}/** — Qarz ma'lumotlarini tahrirlash (to'lov qilish va h.k.).

### 9.2. Savdolar va Tranzaksiyalar (Transactions)
- **GET /transactions/** — Barcha amalga oshirilgan savdo tranzaksiyalari ro'yxati.
- **POST /transactions/** — Yangi savdo tranzaksiyasini yaratish.
- **GET /products/** — Mahsulotlar ro'yxati.

### 9.3. Do'kon Tafsilotlari (Tenant Details)
`GET /tenants/{id}/`

**Javob tarkibidagi yangi real hisoblangan qiymatlar:**
```json
{
  "id": "82c1ecfb-7a39-4aa8-b597-3c8745a661b1",
  "name": "Toshkent Elektron",
  "products_count": 142,
  "users_count": 5,
  "today_sales": "4,850,000 so'm",
  "total_debts": "1,200,000 so'm"
}
```

### 9.4. Super Admin uchun Do'kon bo'yicha filtrlash (Query Parameters)
- `GET /users/?tenant_id={tenant_id}` — Tanlangan do'kon xodimlari ro'yxati.
- `GET /products/?tenant_id={tenant_id}` — Tanlangan do'kon mahsulotlari ro'yxati.
- `GET /debts/?tenant_id={tenant_id}` — Tanlangan do'konning qarzlari ro'yxati.
- `GET /transactions/?tenant_id={tenant_id}` — Tanlangan do'konning savdolari ro'yxati.
