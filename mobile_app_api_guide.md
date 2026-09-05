# SotuvPro — Mobile App (Savdo Xodimi & Kassa) API Hujjati va Integratsiya Qo'llanmasi

**Mo'ljallangan:** Mobile App Dasturchisi (React Native / Flutter / Android / iOS)  
**Tizim:** SotuvPro — Do'kon xodimlari mobil savdo ilovasi  
**Hujjat versiyasi:** 3.1 (Kassa va Savdo jarayoniga to'liq moslashtirilgan)  
**Server Base URL:** `https://amuhr.uz/api/v1` (yoki lokal `http://<SERVER_IP>:8000/api/v1`)

---

## 📌 1. Umumiy Arxitektura va Qoidalar

1. **Format:** Barcha so'rov va javoblar `application/json` formatida.
2. **Autentifikatsiya:** Login qilingandan so'ng olingan JWT token barcha so'rovlar sarlavhasida (header) yuboriladi:
   ```http
   Authorization: Bearer <access_token>
   ```
3. **Multi-tenant xavfsizligi:** `tenant_id` so'rov tanasida yuborilmaydi. Backend uni tokendan avtomatik aniqlaydi.
4. **Muhim biznes qoidasi:** 
   > ⚠️ **Qarz Daftari (Umumiy qarzdorlar ro'yxati, qarz summalari va SMS eslatmalar jo'natish) to'liq Menejer panelida (`manager.amuhr.uz`) boshqariladi.**  
   > Mobil ilovada alohida qarz daftari ekrani ochilmaydi. Mobil ilovada sotuvchi faqat **savdo paytida to'lov turini "Qarzga / Nasiya"** deb tanlaydi va yangi mijoz telefonini SMS orqali tasdiqlaydi.

---

## 🔐 2. Autentifikatsiya (Xodim PIN-kodi orqali)

Xodim mobil ilovaga o'ziga berilgan **4 xonali PIN-kod** orqali kiradi.

### 2.1. PIN orqali tizimga kirish
**Endpoint:** `POST /auth/login/`

**Request Body:**
```json
{
  "pin": "2580"
}
```
*(Yoki xodim telefon raqami bilan: `{"phone_number": "+998901234567", "pin": "2580"}`)*

**Muvaffaqiyatli javob (200 OK):**
```json
{
  "access": "eyJhbGciOiJIUzI1NiIsIn...",
  "refresh": "eyJhbGciOiJIUzI1NiIsIn...",
  "user": {
    "id": "c1f76d90-3620-4bb5-8669-0df487e411b4",
    "name": "Sardor Karimov",
    "phone_number": "+998901234567",
    "role": "worker",
    "can_sell_on_debt": true,
    "max_debt_limit": "1500000.00",
    "tenant_id": "787ad36d-9fc0-4f9e-a89e-05a9ee083fae",
    "tenant_name": "SotuvPro Toshkent",
    "tenant_status": "active"
  }
}
```

#### 💡 Mobil ilovada saqlanishi kerak bo'lgan xodim parametrlari:
- `can_sell_on_debt` (`true`/`false`): Xodimning menejerdan ruxsat so'ramasdan to'g'ridan-to'g'ri qarzga sotish huquqi bor yoki yo'qligi.
- `max_debt_limit` (masalan `1500000.00`): Xodim ruxsatsiz sotishi mumkin bo'lgan maksimal qarz summasi.

---

## 📱 3. Yangi Mijoz Telefon Raqamini SMS OTP orqali Tasdiqlash

Mijoz birinchi marta qarzga xarid qilayotganda uning telefon raqami haqiqiyligini tekshirish uchun SMS orqali 4 xonali tasdiqlash kodi yuboriladi.

### 3.1. Tasdiqlash kodini yuborish
**Endpoint:** `POST /debts/verify-phone/send-code/`

**Request Body:**
```json
{
  "phone_number": "+998901234567",
  "client_name": "Jasur Aliyev"
}
```

**Javob (200 OK):**
```json
{
  "detail": "Tasdiqlash kodi SMS orqali yuborildi.",
  "phone_number": "+998901234567"
}
```

### 3.2. Mijoz aytgan SMS kodni tekshirish
**Endpoint:** `POST /debts/verify-phone/check-code/`

**Request Body:**
```json
{
  "phone_number": "+998901234567",
  "code": "4821"
}
```

**Muvaffaqiyatli javob (200 OK):**
```json
{
  "verified": true,
  "phone_number": "+998901234567",
  "detail": "Telefon raqami muvaffaqiyatli tasdiqlandi."
}
```

**Xato javob (400 Bad Request):**
```json
{
  "detail": "Tasdiqlash kodi noto'g'ri yoki muddati o'tgan."
}
```

---

## 📦 4. Shtrix-kod / QR Skanerlash va Tovarlar Qidiruvi

### 4.1. Skanerlangan kod orqali tovar qidirish
**Endpoint:** `GET /products/lookup/?barcode=<SKANERLANGAN_KOD>`

**Misol:** `GET /products/lookup/?barcode=4780001234567`

**Javob (200 OK — Tovar mavjud):**
```json
{
  "id": "a9d8e7b6-1234-4567-89ab-cdef01234567",
  "name": "Coca-Cola 1.5L",
  "sale_unit": "dona",
  "purchase_unit": "blok",
  "conversion_factor": "6.0000",
  "price_per_sale_unit": "14000.00",
  "current_stock": "48.0000",
  "available_stock": "48.0000",
  "barcode": "4780001234567",
  "is_low_stock": false
}
```

**Javob (404 Not Found — Tovar yangi):**
```json
{
  "detail": "Mahsulot topilmadi.",
  "scanned_code": "4780001234567"
}
```

### 4.2. Mahsulotlar katalogi (Kesh va Qidiruv uchun)
**Endpoint:** `GET /products/`

---

## 🛒 5. Savatchalar Boshqaruvi (Baskets)

### 5.1. Xodimning faol savatlarini olish
**Endpoint:** `GET /baskets/active/`

### 5.2. Yangi savat ochish
**Endpoint:** `POST /baskets/`
```json
{
  "client_name": "Alisher Turg'unov",
  "client_phone": "+998901239988"
}
```

### 5.3. Savatga tovar qo'shish
**Endpoint:** `POST /baskets/{basket_id}/items/`
```json
{
  "product_id": "a9d8e7b6-1234-4567-89ab-cdef01234567",
  "quantity": 2.0
}
```

### 5.4. Miqdorni o'zgartirish (+ / -)
**Endpoint:** `PATCH /baskets/{basket_id}/items/{item_id}/` (`{"quantity": 3.0}`)

### 5.5. Tovarni savatdan o'chirish
**Endpoint:** `DELETE /baskets/{basket_id}/items/{item_id}/`

---

## 💳 6. Savdoni Yakunlash va Qarz Qoidalari (Finalize Sale)

Savdoni yakunlash uchun `POST /baskets/{basket_id}/finalize/` yoki `POST /transactions/` endpointi ishlatiladi.

**To'lov turlari (`payment_method`):**
- `cash` — Faqat naqd pul
- `card` — Faqat plastik karta
- `debt` — To'liq qarzga (Nasiya)
- `mixed` — Aralash (qisman naqd/karta, qolgani qarz)

### 6.1. To'liq naqd yoki karta bilan sotish
**Endpoint:** `POST /baskets/{basket_id}/finalize/`

**Request Body:**
```json
{
  "payment_method": "cash",
  "cash_amount": 28000.00,
  "card_amount": 0.00,
  "debt_amount": 0.00,
  "discount_amount": 0.00
}
```

**Javob (201 Created):**
```json
{
  "transaction_id": "f5e4d3c2-9999-8888-7777-666655554444",
  "status": "completed",
  "total_amount": "28000.00",
  "message": "Savdo muvaffaqiyatli yakunlandi."
}
```

---

### 6.2. Qarzga sotish (Nasiya) — Qoidalar va Ssenariylar

**Request Body:**
```json
{
  "payment_method": "debt",
  "cash_amount": 0.00,
  "card_amount": 0.00,
  "debt_amount": 1200000.00,
  "client_name": "Jasur Aliyev",
  "client_phone": "+998901234567",
  "due_date": "2026-09-30"
}
```

#### 🛡️ Serverdagi Tasdiqlash Mantig'i:
1. **1-Ssenariy: Xodimda qarzga sotish ruxsati bor (`can_sell_on_debt == true`) va summa limitdan oshmagan (`debt_amount <= max_debt_limit`):**
   - **Javob (201 Created):**
     ```json
     {
       "transaction_id": "tx-8839210-uuid",
       "status": "completed",
       "total_amount": "1200000.00",
       "debt_amount": "1200000.00",
       "message": "Savdo muvaffaqiyatli yakunlandi. Qarz daftarga kiritildi."
     }
     ```
   - Tovarlar skladdan chiqariladi, mijoz nomiga Menejer panelidagi Qarz daftariga yoziladi.

2. **2-Ssenariy: Xodimda qarz huquqi yo'q (`can_sell_on_debt == false`) YOKI qarz summasi xodim limitidan yuqori (`debt_amount > max_debt_limit`):**
   - **Javob (200 OK):**
     ```json
     {
       "transaction_id": "tx-8839210-uuid",
       "status": "pending_approval",
       "total_amount": "2500000.00",
       "debt_amount": "2500000.00",
       "message": "Qarz summasi belgilangan limitdan (1,500,000 UZS) yuqori bo'lgani sababli menejer tasdig'iga yuborildi."
     }
     ```
   - Mobil ilovada foydalanuvchiga: *"Ushbu qarz savdosi menejer tasdig'iga yuborildi. Menejer paneldan tasdiqlagach savdo yakunlanadi"* degan bildirishnoma ko'rsatiladi.

---

## 📴 7. Oflayn Rejim (Offline Queue Sync)

Internet bo'lmaganda savdo amallari mobil ilovaning lokal xotirasida (SQLite) saqlanadi va internet paydo bo'lganda quyidagi endpointga jo'natiladi:

**Endpoint:** `POST /baskets/sync-offline/`

**Request Body:**
```json
{
  "events": [
    {
      "action": "finalize_sale",
      "temp_id": "local-tx-101",
      "payment_method": "cash",
      "total_amount": 45000.00,
      "items": [
        {
          "product_id": "a9d8e7b6-1234-4567-89ab-cdef01234567",
          "quantity": 3.0,
          "price": 15000.00
        }
      ],
      "created_at": "2026-09-05T11:00:00Z"
    }
  ]
}
```

---

## ⚠️ 8. HTTP Status Kodlari

| HTTP Status | Ma'nosi | Mobil ilova nima qilishi kerak? |
|---|---|---|
| `200 OK` / `201 Created` | Muvaffaqiyatli bajarildi | Savdoni yakunlash va chek chiqarish |
| `400 Bad Request` | Ma'lumot xato kiritilgan (masalan, noto'g'ri SMS kod) | Xatolik matnini (`detail`) xodimga ko'rsatish |
| `401 Unauthorized` | PIN kod xato yoki JWT token eskirgan | Qayta PIN so'rash yoki `/auth/refresh/` chaqirish |
| `403 Forbidden` | Do'kon faol emas yoki xodimga bu amal taqiqlangan | Ogohlantirish xabarini chiqarish |
| `404 Not Found` | Tovar topilmadi | Yangi yaratish formasini taklif qilish |
| `409 Conflict` | Sklad qoldig'i yetarli emas | Skladdagi haqiqiy mavjud sonni ko'rsatish |
