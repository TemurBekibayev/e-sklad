# "GetPOS Kafe" — Backend Dasturchi uchun Texnik Talablar va Tizim Imkoniyatlari

Ushbu hujjat **GetPOS Kafe** avtomatlashtirish tizimining server (backend) qismini ishlab chiquvchi dasturchi uchun mo'ljallangan. Tizim kassa kompyuteri (Desktop .exe / Docker), ofitsiantlar mobil ilovasi (Flutter) va oshxona (KDS) o'rtasida ishlaydi.

---

## 1. Tizimning Asosiy Maqsadi va Arxitekturasi

* **Tizim nomi:** GetPOS Kafe
* **Sohasi:** Kafe, restoran va umumiy ovqatlanish korxonalarini avtomatlashtirish.
* **Mijoz qurilmalari (Clients):**
  1. **Kassa Dasturi (Desktop / Windows .exe):** Kassir va administrator boshqaruv ekrani, stollar xaritasi, to'lovlarni qabul qilish va Soliq.uz fiskal chekini chop etish.
  2. **Ofitsiant Ilovasi (Mobile / Flutter):** Smartfon/planshet orqali stol ochish, menyudan taom tanlash, izoh yozish, buyurtma yuborish va hisob so'rash.
  3. **Oshxona Ekrani va Begunok Printeri (KDS):** Yangi tushgan taomlarni oshpazga ko'rsatish (narxlarsiz!).
* **Asosiy talab (Offline-First):** Kafe ichki tarmog'ida internet uzilsa ham tizim to'xtamasligi, internet paydo bo'lganda ma'lumotlar to'qnashuvsiz sinxronlanishi kerak.

---

## 2. Backenddan Kutilayotgan Asosiy Modullar

```
┌────────────────────────────────────────────────────────────────────────┐
│                        BACKEND ASOSIY MODULLARI                        │
├───────────────────┬───────────────────┬────────────────────────────────┤
│ 1. Autentifikatsiya│ 2. Stollar        │ 3. Menyu & Soliq MXIK          │
│ (PIN-kod, Smena)  │ (12+ ta stol)     │ (Taomlar, QQS 12%, Qadoq)      │
├───────────────────┼───────────────────┼────────────────────────────────┤
│ 4. Buyurtmalar    │ 5. Oshxona (KDS)  │ 6. To'lov & Fiskalizatsiya     │
│ (Order Items,Izoh)│ (Begunok cheki)   │ (Naqd, Karta, Soliq QR)        │
├───────────────────┴───────────────────┴────────────────────────────────┤
│ 7. Real-Time WebSockets (Stollar va buyurtmalar holati jonli o'zgarishi)│
│ 8. Oflayn Sinxronizatsiya (Offline Sync Queue & Conflict Resolution)   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Har bir Modul bo'yicha Batafsil Talablar

### 3.1. Autentifikatsiya va Xodimlar Moduli
* Xodimlar rollari: `cashier` (Kassir), `waiter` (Ofitsiant), `admin` (Administrator).
* **Tezkor PIN-kod:** Touch-ekran va mobil telefonda tez ishlash uchun xodimlar 4 xonali shaxsiy PIN-kod orqali tizimga kiradi (masalan: `1234`, `1111`).
* **Smena ochish/yopish:** Kassir va ofitsiant tizimga kirganda ularning ish smenasi ochilishi va vaqti qayd etilishi kerak.

### 3.2. Stollar Boshqaruvi Moduli (Tables)
* Kafedagi barcha stollar ro'yxati, sig'imi (necha kishilik) va **3 xil holat (status)**:
  * 🟢 **`free` (Bo'sh)** — Stol qabulga tayyor.
  * 🔴 **`busy` (Band)** — Mijoz o'tiribdi, buyurtma berilgan. Biriktirilgan faol buyurtma ID-si, ofitsiant ismi va jami hisob ko'rinadi.
  * 🟡 **`bill_requested` (Hisob so'ralgan)** — Mijoz hisob so'ragan, ofitsiant tugmani bosgan. Kassa ekranida diqqatni jalb qiluvchi sariq rangda yonadi.

### 3.3. Menyu va Soliq.uz Talablari Moduli (Products & MXIK)
* **Toifalar (Categories):** Birinchi taomlar, Quyuq taomlar, Ichimliklar, Salatlar va h.k.
* **Taomlar (Products):** Nomi, narxi, toifasi, rasmi/emodzisi, mavjudligi (`is_available` - stop-list).
* **Davlat Soliq Qo'mitasi (DSQ) majburiy maydonlari:**
  * `mxik_code` — 17 xonali MXIK (IKPU) klassifikator kodi (masalan: `10701002001000000`);
  * `package_code` — Qadoq/o'lchov kodi (masalan: `796` — dona/porsiya, `166` — kg, `112` — litr);
  * `vat_percent` — QQS stavkasi (`12%` yoki `0%`).

### 3.4. Buyurtmalar Moduli (Orders & Order Items)
* Stol tanlanganda yangi buyurtma ochish yoki mavjud ochiq stolga qo'shimcha taom qo'shish.
* **Oshpazga izoh (Item Comment):** Har bir taomga mijoz talabiga ko'ra maxsus izoh yozish imkoniyati (*"Piyozsiz"*, *"Issiqroq"*, *"Muzsiz"*, *"Achchiq emas"*).
* Buyurtma holatlari: `open` (ochiq), `bill_requested` (hisob so'ralgan), `paid` (to'langan), `cancelled` (bekor qilingan).
* Jami summani avtomatik hisoblash.

### 3.5. Oshxona Moduli (KDS & Begunok Printer)
* Ofitsiant "Yuborish" tugmasini bosishi bilan oshxona ekrani va LAN printeriga ma'lumot uzatilishi kerak.
* **Qat'iy talab:** Oshxona "Begunok" chekida faqat: **Stol raqami, Taom nomi, Soni, Ofitsiant ismi, Vaqt va Izoh** chiqadi. **Narxlar mutlaqo ko'rsatilmaydi!**

### 3.6. To'lovlar va Fiskalizatsiya Moduli (Payments & Soliq.uz)
* To'lov turlari:
  * **Naqd pul (`cash`)**;
  * **Plastik karta (`card`)** — Uzcard / Humo terminal;
  * **Aralash to'lov (`split`)** — Masalan, bir qismi naqd (40 000 UZS), qolgani karta (50 000 UZS).
* **Fiskallashtirish:**
  * To'lov bo'lishi bilan Soliq API ga so'rov ketadi (yoki virtual kassa orqali);
  * Backenddan **12 xonali Fiskal belgi (ФП)** va rasmiy **Soliq QR-kod URL** (`https://ofd.soliq.uz/...`) qaytadi;
  * 12% QQS avtomatik ajratib hisoblanadi (`narx * 12 / 112`).
* To'lov muvaffaqiyatli bo'lgach, stol avtomatik ravishda **`free` (bo'sh)** holatiga o'tadi.

### 3.7. Real-Time Aloqa (WebSockets)
Stollar va buyurtmalar o'zgarganda barcha qurilmalarga 0.1 soniyada xabar tarqatilishi kerak:
* `TABLE_UPDATED` — Stol ochildi, buyurtma qo'shildi yoki holati o'zgardi;
* `KITCHEN_NEW_TICKET` — Oshxonaga yangi buyurtma tushdi (audio signal bilan);
* `BILL_REQUESTED` — Mijoz hisob so'radi (kassada stol sariq bo'ladi);
* `PAYMENT_COMPLETED` — Stol to'landi va bo'shadi.

### 3.8. Oflayn Rejim va Sinxronizatsiya (Offline Sync)
* Agar kafeda internet uzilsa, kassa va ofitsiantlar lokal bazada ishlashda davom etadi.
* Internet tiklanganda kassa backendga to'plangan oflayn cheklar paketini yuboradi.
* Backend ularni qabul qilib, Soliqqa jo'natishi va bazadagi qoldiqlarni yangilashi kerak.

---

## 4. Backenddan Kutilayotgan REST API Endpointlari

| Metod | Endpoint | Vazifasi |
| :--- | :--- | :--- |
| **POST** | `/api/auth/login` | Xodim PIN-kodi orqali kirish va smena ochish |
| **GET** | `/api/tables` | Barcha stollar ro'yxati va holati |
| **GET** | `/api/menu` | Toifalar va taomlar ro'yxati (MXIK kodlari bilan) |
| **PUT** | `/api/products/:id/mxik` | Taomning MXIK kodi va QQS foizini tahrirlash |
| **POST** | `/api/orders` | Yangi buyurtma yuborish yoki ochiq stolga qo'shish |
| **GET** | `/api/orders/table/:tableId` | Tanlangan stoldagi faol buyurtma va taomlar |
| **POST** | `/api/orders/:id/bill-request` | Ofitsiant tomonidan "Hisob so'raldi" amali |
| **POST** | `/api/payments` | Kassa to'lovini qabul qilish va fiskal chek yaratish |
| **GET** | `/api/kitchen/tickets` | Oshxona chiptalari tarixi (Begunoklar) |
| **POST** | `/api/sync/offline-orders` | Oflayn paytda yig'ilgan cheklarni backendga sinxronlash |
| **WS** | `/ws` | Real-time WebSocket ulanishi |

---

## 5. Dasturchi bilan Bog'lanish Formatlari (Request & Response namunasi)

### Buyurtma yuborish: `POST /api/orders`
```json
{
  "tableId": 5,
  "waiterId": 2,
  "waiterName": "Ofitsiant Sardor",
  "items": [
    {
      "product_id": 6,
      "product_name": "Qo'y go'shti shashlik",
      "quantity": 2,
      "price": 25000,
      "comment": "piyozsiz"
    },
    {
      "product_id": 11,
      "product_name": "Ko'k choy (Limon bilan)",
      "quantity": 1,
      "price": 8000,
      "comment": "issiqroq"
    }
  ]
}
```

### To'lovni qabul qilish: `POST /api/payments`
```json
{
  "orderId": "ord_a1b2c3d4",
  "tableId": 5,
  "paymentMethod": "split", // "cash", "card", "split"
  "cashAmount": 30000,
  "cardAmount": 28000
}
```
**Qaytishi kerak bo'lgan javob (Soliq rekvizitlari bilan):**
```json
{
  "success": true,
  "receipt": {
    "receiptSeq": 1004,
    "totalAmount": 58000,
    "vatAmount": 6214,
    "fiscalSign": "849201849201",
    "fiscalQrUrl": "https://ofd.soliq.uz/check?t=EP108492&r=1004&s=58000&f=849201849201"
  }
}
```

---

## 6. Xulosa va Backend Dasturchidan Nima Kerak?

Backend dasturchi yuqoridagi talablarga asosan o'z serverini tayyorlagach, bizga quyidagilarni taqdim etishi kerak:
1. **API Base URL** (masalan: `http://localhost:8000/api` yoki test server havolasi);
2. **Swagger / OpenAPI / Postman Collection** hujjati;
3. **Autentifikatsiya usuli** (Bearer token yoki API key).

GetPOS Kafe kassa dasturi va mobil ilova ushbu API orqali to'liq bog'lanib ishlaydi!
