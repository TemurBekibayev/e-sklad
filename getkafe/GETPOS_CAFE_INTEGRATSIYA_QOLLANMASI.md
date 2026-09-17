# "GetPOS Kafe" — To'liq Integratsiya Qo'llanmasi va API Hujjati

Ushbu qo'llanma **GetPOS Kafe** (Flutter mobil ilovasi, Desktop Kassa va Oshxona KDS ekrani) dasturchisi uchun backend, Admin panel va **REGOS VCR / Soliq.uz** fiskallashtirish tizimiga to'liq ulanish bo'yicha tayyorlandi.

---

## 1. Tizim Arxitekturasi va Bog'lanish sxemasi

```
 ┌────────────────────────────────────────────────────────────────────────┐
 │                         ADMIN BOSHQARUV PANELI                         │
 │     (Filiallar, Menyular, MXIK kodlar, Ofitsiant & Kassir PIN-kodlar)  │
 └───────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
 ┌────────────────────────────────────────────────────────────────────────┐
 │                      GETPOS BACKEND CLOUD / LOCAL                      │
 │    (Auth, Stollar, Buyurtmalar, Real-time WebSockets, Sync Queue)      │
 └──────┬────────────────────────────┬─────────────────────────────┬──────┘
        │                            │                             │
        ▼                            ▼                             ▼
┌───────────────┐           ┌────────────────┐            ┌────────────────┐
│ OFITSIANT     │           │ KASSA DESKTOP  │            │ OSHXONA (KDS)  │
│ MOBIL ILOVA   │           │ (Touch Kassa / │            │ (Begunok chek /│
│ (Flutter)     │           │ Regos Soliq)   │            │ Planshet ekran)│
└───────────────┘           └───────┬────────┘            └────────────────┘
                                    │
                                    ▼
                     ┌─────────────────────────────┐
                     │   REGOS VCR & SOLIQ.UZ      │
                     │  (Fiskal Chek, QR-kod, QQS) │
                     └─────────────────────────────┘
```

---

## 2. Admin Panel orqali Filial va Xodimlarni Boshqarish

### 2.1. Filial (Tenant) va Xodimlar ro'yxati:
1. **Admin Panel:** `http://localhost:5173` yoki server havolasi.
2. **Xodimlar boshqaruvi (Workers) bo'limida:**
   - Yangi xodim qo'shish tugmasi orqali lavozimi tanlanadi:
     - 📱 **`waiter` (Ofitsiant)** — Stol ochish, menyudan buyurtma terish, oshxonaga jo'natish, hisob so'rash.
     - 💳 **`cashier` (Kassir)** — To'lovlarni qabul qilish, REGOS Soliq fiskal chekini chiqarish, smena ochish/yopish.
     - 🍳 **`cook` (Oshpaz)** — Oshxona ekrani (KDS) orqali tushgan taomlarni ko'rish va tayyorlash.
     - 👔 **`manager` / `admin`** — Boshqaruvchi.
   - Har bir xodimga **4 xonali shaxsiy PIN-kod** beriladi (Masalan: `1111`, `2222`, `1234`).

---

## 3. Autentifikatsiya va Smena (Auth API)

### 3.1. Filialdagi xodimlar ro'yxatini olish
* **Metod:** `GET`
* **URL:** `/api/auth/users?tenantId={TENANT_ID}`
* **Javob:**
```json
[
  {
    "id": "usr_9481a8c3",
    "name": "Sardor Rahimov",
    "role": "waiter",
    "status": "active"
  },
  {
    "id": "usr_7381b2d1",
    "name": "Madina Karimova",
    "role": "cashier",
    "status": "active"
  }
]
```

### 3.2. PIN-kod orqali tizimga kirish
* **Metod:** `POST`
* **URL:** `/api/auth/login`
* **So'rov (Request):**
```json
{
  "userId": "usr_9481a8c3",
  "pin": "1234"
}
```
* **Muvaffaqiyatli Javob:**
```json
{
  "id": "usr_9481a8c3",
  "name": "Sardor Rahimov",
  "role": "waiter",
  "tenantId": "ten_849201",
  "tenantName": "GetPOS Kafe Chilonzor"
}
```

---

## 4. Stollar va Menyu Boshqaruvi

### 4.1. Stollar ro'yxati va holati (Tables)
* **Metod:** `GET`
* **URL:** `/api/tables?tenantId={TENANT_ID}`
* **Stol statuslari:**
  * 🟢 `"free"` — Bo'sh, yangi mijoz qabul qilishga tayyor.
  * 🔴 `"busy"` — Band, ichida faol buyurtma bor.
  * 🟡 `"bill_requested"` — Mijoz hisob so'ragan (Kassada sariq yonadi).
* **Javob:**
```json
[
  {
    "id": 1,
    "number": 1,
    "name": "Stol 1",
    "capacity": 4,
    "status": "busy",
    "activeOrderId": "ord_178912389",
    "activeWaiterName": "Sardor Rahimov",
    "totalAmount": 145000
  },
  {
    "id": 2,
    "number": 2,
    "name": "Stol 2",
    "capacity": 6,
    "status": "free",
    "activeOrderId": null,
    "activeWaiterName": null,
    "totalAmount": 0
  }
]
```

### 4.2. Menyu va Davlat Soliq (MXIK) rekvizitlari
* **Metod:** `GET`
* **URL:** `/api/menu?tenantId={TENANT_ID}`
* **Javob:**
```json
{
  "categories": [
    { "id": "cat-1", "name": "Quyuq taomlar" },
    { "id": "cat-2", "name": "Ichimliklar" },
    { "id": "cat-3", "name": "Shashliklar" }
  ],
  "products": [
    {
      "id": "prod_1",
      "name": "Osh (Choyxona palov)",
      "price": 35000,
      "unit": "dona",
      "category": "Quyuq taomlar",
      "mxik_code": "10701002001000000",
      "package_code": "796",
      "vat_percent": 12,
      "is_available": true
    },
    {
      "id": "prod_2",
      "name": "Ko'k choy (Limonli)",
      "price": 8000,
      "unit": "dona",
      "category": "Ichimliklar",
      "mxik_code": "10701002001000000",
      "package_code": "796",
      "vat_percent": 12,
      "is_available": true
    }
  ]
}
```

---

## 5. Buyurtmalar va Oshxona (KDS Begunok)

### 5.1. Buyurtma yuborish / Taom qo'shish
* **Metod:** `POST`
* **URL:** `/api/orders`
* **So'rov (Request):**
```json
{
  "tenantId": "ten_849201",
  "tableId": 1,
  "waiterId": "usr_9481a8c3",
  "waiterName": "Sardor Rahimov",
  "items": [
    {
      "product_id": "prod_1",
      "product_name": "Osh (Choyxona palov)",
      "quantity": 2,
      "price": 35000,
      "comment": "Go'shti ko'proq bo'lsin",
      "ikpu_code": "10701002001000000",
      "package_code": "796",
      "vat_percent": 12
    },
    {
      "product_id": "prod_2",
      "product_name": "Ko'k choy (Limonli)",
      "quantity": 1,
      "price": 8000,
      "comment": "Muzsiz, qaynoq",
      "ikpu_code": "10701002001000000",
      "package_code": "796",
      "vat_percent": 12
    }
  ]
}
```
* **Javob:**
```json
{
  "success": true,
  "order": {
    "id": "ord_178912389",
    "tableNumber": 1,
    "totalAmount": 78000,
    "status": "open"
  },
  "kitchenTicket": {
    "id": "ticket_178912390",
    "tableNumber": 1,
    "waiterName": "Sardor Rahimov",
    "items": [
      { "product_name": "Osh (Choyxona palov)", "quantity": 2, "comment": "Go'shti ko'proq bo'lsin" },
      { "product_name": "Ko'k choy (Limonli)", "quantity": 1, "comment": "Muzsiz, qaynoq" }
    ]
  }
}
```
> **Diqqat:** Oshxona begunok chekida va KDS ekranida **narxlar ko'rsatilmaydi!** Faqat stol, taom nomi, miqdori, ofitsiant va izoh chiqadi.

### 5.2. Stol bo'yicha faol buyurtmani ko'rish
* **Metod:** `GET`
* **URL:** `/api/orders/table/{TABLE_ID}?tenantId={TENANT_ID}`

### 5.3. Ofitsiant tomonidan hisob so'rash (Pre-Chek / Bill Request)
* **Metod:** `POST`
* **URL:** `/api/orders/{ORDER_ID}/bill-request`
* **So'rov:**
```json
{
  "tenantId": "ten_849201"
}
```
*(Bu amal stol statusini `"bill_requested"` ga o'tkazadi va kassada stol sariq bo'lib yonadi).*

---

## 6. To'lovlar va REGOS VCR Soliq Fiskalizatsiyasi

### 6.1. To'lovni qabul qilish va Fiskal chek chiqarish
* **Metod:** `POST`
* **URL:** `/api/payments`
* **So'rov (Request):**
```json
{
  "tenantId": "ten_849201",
  "tableId": 1,
  "orderId": "ord_178912389",
  "paymentMethod": "split", // "cash", "card", "split"
  "cashAmount": 50000,
  "cardAmount": 28000
}
```
* **Backenddan qaytadigan rasmiy Fiskal javob:**
```json
{
  "success": true,
  "message": "To'lov muvaffaqiyatli amalga oshirildi va Soliq QR fiskallashtirildi",
  "receipt": {
    "receiptSeq": 1042,
    "totalAmount": 78000,
    "vatAmount": 8357,
    "fiscalSign": "892018492018",
    "terminalId": "VG298430008256",
    "fiscalQrUrl": "https://ofd.soliq.uz/check?t=VG298430008256&r=1042&c=20260912111500&s=78000.00",
    "dateTime": "2026-09-12T11:15:00.000Z"
  },
  "table": {
    "id": 1,
    "number": 1,
    "status": "free",
    "activeOrderId": null,
    "totalAmount": 0
  }
}
```
> **Muhim:** To'lov bo'lishi bilan stol avtomatik ravishda **`free` (bo'sh)** holatiga o'tadi!

### 6.2. REGOS VCR Smena buyruqlari (Kassir uchun)
* `GET /api/fiscal/status` — Virtual kassa holatini tekshirish (`Sys.GetInfo`).
* `POST /api/fiscal/open-shift` — Smena ochish (`ZReport.Open`).
* `POST /api/fiscal/close-shift` — Smena yopish va Z-Hisobot olish (`ZReport.Close`).
* `GET /api/fiscal/shift-info` — X-Hisobot ma'lumotlari (`ZReport.GetInfo`).

---

## 7. Real-Time WebSockets Aloqasi (`/ws` yoki Socket.io)

Ofitsiant, Kassa va Oshxona o'rtasida ma'lumotlar real vaqt rejimida (0.1 soniyada) yangilanadi:

1. **Ulanish va Filial xonasiga kirish:**
```javascript
socket.emit('join_tenant', {
  tenantId: 'ten_849201',
  userId: 'usr_9481a8c3',
  role: 'waiter'
});
```

2. **Tinglanadigan hodisalar (Events):**
* `TABLE_UPDATED` — Stol ochilganda, taom qo'shilganda yoki holati o'zgarganda.
* `KITCHEN_NEW_TICKET` — Oshxonaga yangi taom buyurtmasi tushganda (Oshxona ekrani audio signal chiqaradi).
* `BILL_REQUESTED` — Ofitsiant hisob so'raganda (Kassada stol sariq bo'ladi).
* `PAYMENT_COMPLETED` — Kassir to'lovni olganda (Stol bo'shaydi).

---

## 8. Oflayn Rejim (Offline Sync Queue)

Kafeda vaqtincha internet uzilib qolsa:
1. Mobil ilova va Kassa buyurtmalarni lokal xotirada (SQLite/Hive) saqlaydi.
2. Internet paydo bo'lishi bilan quyidagi API ga yuboriladi:
* **Metod:** `POST`
* **URL:** `/api/sync/offline-orders`
* **So'rov:**
```json
{
  "orders": [
    {
      "localOrderId": "loc_101",
      "tableId": 3,
      "items": [...],
      "totalAmount": 95000,
      "paymentMethod": "cash",
      "timestamp": "2026-09-12T10:45:00Z"
    }
  ]
}
```
* Backend barcha oflayn cheklarni qabul qilib, Soliqqa yuboradi va tasdiqlaydi.

---

## 9. Xulosa

Backend va Admin paneli yuqoridagi barcha standartlar bo'yicha to'liq tayyorlangan. Dasturchi ushbu endpointlar orqali mobil ilovani, kassa dasturini va oshxona KDS ekranini bir-biriga uzluksiz bog'lab ishga tushirishi mumkin!
