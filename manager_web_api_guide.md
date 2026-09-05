# SotuvPro — Manager Web App (Menejer Paneli) API Hujjati va Integratsiya Qo'llanmasi

**Mo'ljallangan:** Manager Web App Dasturchisi (React / Vite / Next.js)  
**Tizim:** SotuvPro — Do'kon menejeri boshqaruv paneli  
**Hujjat versiyasi:** 2.0 (Ishlab chiqarish darajasi)

---

## 📌 1. Umumiy Ma'lumotlar va Ulanish

- **Server Base URL:** `http://<SERVER_IP>:8000/api/v1`
- **WebSocket URL:** `ws://<SERVER_IP>:8000/ws/tenant/baskets/?token=<access_token>`
- **Swagger / OpenAPI Dokumentatsiya:** `http://<SERVER_IP>:8000/api/docs/`
- **So'rov/Javob formati:** `application/json`
- **Autentifikatsiya:** Barcha himoyalangan so'rovlarda `Authorization` sarlavhasi (header) majburiy:
  ```http
  Authorization: Bearer <access_token>
  ```
- **Ko'p-tenantlik (Multi-tenancy):** Menejer faqat o'z do'koniga tegishli ma'lumotlarni ko'ra oladi va boshqaradi. `tenant_id` avtomatik ravishda **JWT token ichidan** aniqlanadi.

---

## 🔐 2. Autentifikatsiya (Menejer)

Menejer **Email+Parol** yoki **PIN-kod** orqali kirishi mumkin.

### 2.1. Tizimga kirish
`POST /auth/login/`

**Request Body (Email va Parol bilan):**
```json
{
  "email": "manager@toshkent.uz",
  "password": "managerpass2026"
}
```

**Request Body (PIN bilan):**
```json
{
  "pin": "1234"
}
```

**Muvaffaqiyatli javob (200 OK):**
```json
{
  "access": "eyJhbGciOiJIUzI1NiIsIn...",
  "refresh": "eyJhbGciOiJIUzI1NiIsIn...",
  "user": {
    "id": "b2f65a10-2222-3333-4444-555566667777",
    "name": "Sardor Aliyev",
    "email": "manager@toshkent.uz",
    "role": "manager",
    "tenant_id": "787ad36d-9fc0-4f9e-a89e-05a9ee083fae",
    "tenant_name": "Toshkent Elektron",
    "tenant_status": "active"
  }
}
```

### 2.2. Tokenni yangilash
`POST /auth/refresh/`

**Request Body:** `{"refresh": "<refresh_token>"}`

---

## ⚡ 3. Real-Vaqt WebSocket Nazorat Paneli (Live Dashboard)

Menejer brauzerda asosiy boshqaruv panelini ochishi bilan WebSocket kanaliga ulanadi va xodimlar harakatini real-vaqtda kuzatadi.

### 3.1. Ulanish manzili
`ws://<SERVER_IP>:8000/ws/tenant/baskets/?token=<access_token>`

### 3.2. Jonli xabarlar (Events)
Xodim savatga tovar qo'shganda, miqdorini o'zgartirganda yoki savdoni yuborganda menejerga quyidagi JSON hodisa keladi:

```json
{
  "event": "basket:update",
  "data": {
    "basket_id": "e8d7c6b5-0001-4000-8000-abcdef123456",
    "worker_id": "c1f76d90-3620-4bb5-8669-0df487e411b4",
    "worker_name": "Bekzod Rahimov",
    "client_name": "Alisher Turg'unov",
    "status": "active",
    "items_count": 3,
    "total_amount": "16570000.00",
    "updated_at": "14:32:15"
  }
}
```
*Menejer interfeysida o'sha xodimning kartochkasi va savat summasi darhol yangilanadi.*

---

## 📦 4. Sklad Boshqaruvi va O'lchov Birligi Konversiyasi

Menejer mahsulotlarni kiritishda **kelish birligi** (qop, tonna, rulon) va **sotish birligi** (dona, metr, kg) hamda **konversiya koeffitsienti**ni belgilaydi.

### 4.1. Yangi mahsulot qo'shish
`POST /products/`

**Request Body:**
```json
{
  "name": "Sement M-500",
  "purchase_unit": "qop",
  "sale_unit": "kg",
  "conversion_factor": 50.0,
  "price_per_sale_unit": 1800.00,
  "current_stock": 0.0,
  "low_stock_threshold": 250.0,
  "barcode": "4780009998881",
  "qr_code": "QR-SEMENT-M500"
}
```
*(1 qop = 50 kg deb kiritildi. Narx 1 kg uchun 1,800 so'm).*

### 4.2. Skladga Kirim kiritish (Bulk-to-Unit)
`POST /products/{product_id}/stock-movements/`

Kirim **kelish birligida** kiritiladi:

**Request Body:**
```json
{
  "type": "kirim",
  "purchase_unit_amount": 20.0,
  "reason": "Zavoddan yangi partiya keldi"
}
```
*Backend avtomatik tarzda `20 qop * 50 = 1000 kg` hisoblab, `current_stock`ga 1,000 kg qo'shadi va `stock_movements` tarixiga yozadi.*

### 4.3. Inventarizatsiya tuzatishi kiritish
`POST /products/{product_id}/stock-movements/`

Fizik sanash natijasida sklad qoldig'ini to'g'rilash:

**Request Body:**
```json
{
  "type": "tuzatish",
  "sale_unit_amount": 950.0,
  "reason": "Qoplardan biri yirtilgani sababli to'kilgan"
}
```

### 4.4. Mahsulot narxini o'zgartirish
`PUT /products/{product_id}/`

**Request Body:**
```json
{
  "price_per_sale_unit": 2000.00
}
```
*Eski narx avtomatik tarzda `price_history` jadvaliga yoziladi.*

### 4.5. Yorliq (Barcode/QR Label) generatsiya qilish
`GET /products/{product_id}/label/`

Chop etish uchun tayyor etiketka (PDF yoki ESC/POS formati).

---

## 💰 5. Savdoni Yakunlash, Tasdiqlash va Qaytarish (Refund)

### 5.1. Murakkab savdoni yakunlash (Aralash to'lov / Qarz)
`POST /baskets/{basket_id}/finalize/`

**Request Body (Qisman naqd + qisman qarz):**
```json
{
  "payment_method": "mixed",
  "cash_amount": 500000.00,
  "card_amount": 0.00,
  "debt_amount": 700000.00,
  "discount_amount": 50000.00,
  "client_name": "Alisher Turg'unov",
  "client_phone": "+998901239988",
  "due_date": "2026-09-15"
}
```
*Backend avtomatik tarzda:*
1. Sklad qoldig'idan tovarlarni yechadi.
2. `debts` jadvaliga Alisher Turg'unov nomiga 700,000 so'm qarz yozadi.
3. Tranzaksiyani yakunlaydi.

### 5.2. Kutilayotgan savdoni tasdiqlash
`POST /transactions/{transaction_id}/approve/`

Xodim tomonidan yuborilgan `pending_approval` holatidagi savdoni tasdiqlash.

### 5.3. Savdoni qaytarish (Refund)
`POST /transactions/{transaction_id}/refund/`

Mijoz tovarni qaytarganda:

**Request Body:**
```json
{
  "refund_reason": "Tovarda nuqson aniqlandi, mijozga puli qaytarildi"
}
```
*Backend avtomatik tarzda sklad qoldig'ini tiklaydi va agar qarz bo'lsa, qarz summasidan o'chiradi.*

---

## 📋 6. Qarz Daftari (Debts & SMS Eslatmalar)

### 6.1. Qarzdorlar ro'yxatini olish
`GET /debts/`

**Query Parametrlar:**
- `is_overdue=true` — faqat muddati o'tgan qarzlar
- `search=Alisher` — ism yoki telefon bo'yicha qidiruv

**Javob (200 OK):**
```json
[
  {
    "id": "d1e2f3a4-7777-8888-9999-000011112222",
    "client_name": "Alisher Turg'unov",
    "client_phone": "+998901239988",
    "total_debt": "1200000.00",
    "remaining_debt": "700000.00",
    "due_date": "2026-09-15",
    "is_overdue": false,
    "last_sms_sent_at": null
  }
]
```

### 6.2. Qarz to'lovini qabul qilish
`POST /debts/{debt_id}/payments/`

**Request Body:**
```json
{
  "amount": 300000.00,
  "payment_method": "cash",
  "notes": "Qarzning bir qismi to'landi"
}
```

### 6.3. Qo'lda SMS eslatma yuborish
`POST /debts/{debt_id}/send-sms/`

Mijoz telefoniga qarz eslatmasini darhol jo'natish.

---

## 👥 7. Xodimlarni Boshqarish (Staff Management)

### 7.1. Xodimlar ro'yxati
`GET /users/`

### 7.2. Yangi savdo xodimi qo'shish
`POST /users/`

**Request Body:**
```json
{
  "name": "Jasur Abdullayev",
  "phone_number": "+998909876543",
  "pin": "7788",
  "role": "worker"
}
```

### 7.3. Xodim PIN kodini o'zgartirish / Faolsizlantirish
`PATCH /users/{user_id}/`

**Request Body (PIN tiklash):**
```json
{
  "pin": "1122"
}
```

**Request Body (Ishdan bo'shatish / Faolsizlantirish):**
```json
{
  "is_active": false
}
```

---

## 📊 8. Hisobotlar va Statistika (Analytics)

### 8.1. Savdo hisoboti (Sana oralig'ida)
`GET /reports/sales/?from=2026-08-01&to=2026-08-24`

**Javob (200 OK):**
```json
{
  "total_sales": "24500000.00",
  "total_transactions": 142,
  "payment_methods": {
    "cash": "15000000.00",
    "card": "6300000.00",
    "debt": "3200000.00"
  },
  "top_products": [
    { "name": "iPhone 15 Pro Max", "sold_quantity": 8, "total_sum": "132000000.00" }
  ]
}
```

### 8.2. Xodimlar samaradorligi hisoboti
`GET /reports/by-worker/?from=2026-08-01&to=2026-08-24`

### 8.3. Kam qolgan tovarlar
`GET /reports/low-stock/`

---

## ⚠️ 9. Xatolik Kodlari

| HTTP Status | Ma'nosi | Menejer ekrani reaksiyasi |
|---|---|---|
| `400 Bad Request` | Formadagi noto'g'ri qiymatlar | Validatsiya xatosini ko'rsatish |
| `401 Unauthorized` | Parol xato yoki token eskirgan | Qaytadan login oynasiga yo'naltirish |
| `403 Forbidden` | Amal uchun menejer huquqi yetarli emas | Ruxsat yo'qligini bildirish |
| `404 Not Found` | Mahsulot yoki xodim topilmadi | Xatolik bildirishnomasi |
| `409 Conflict` | Sklad qoldig'i yetarli emas | Sklad zaxirasi yetmasligini ogohlantirish |
