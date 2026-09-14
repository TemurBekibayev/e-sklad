# GetPOS Kafe — Mobile Ofitsiant Ilovasi (Flutter / React Native) uchun To'liq API Qo'llanmasi

Ushbu hujjat **GetPOS Kafe** ofitsiant mobil ilovasini ishlab chiqayotgan dasturchi uchun to'liq va yangilangan API qo'llanmasidir.

---

## 📌 1. Umumiy Arxitektura (Lokal Wi-Fi & Offline-First)

1. **Restoran/Kafe tarmog'i:**
   - Har bir kafeda asosiy Kassa kompyuteri (Desktop POS) **Lokal Wi-Fi Server** vazifasini bajaradi.
   - Ofitsiantlar telefoni kafe ichidagi **Wi-Fi** orqali to'g'ridan-to'g'ri Kassa kompyuteriga ulanadi.
   - Bu internet tezligi sekinlashganda yoki butunlay uzilib qolganda ham ofitsiantlar va oshxona o'rtasidagi aloqani 100% to'xtovsiz ishlashini ta'minlaydi.

2. **Server manzillari (Dinamik sozlanuvchi):**
   - Mobil ilovaning "Sozlamalar" (Settings) ekranida **Kassa IP manzili**ni kiritish imkoniyati bo'lishi kerak.
   - **Standart Base URL:** `http://<KASSA_IP>:4000/api` (Masalan: `http://192.168.1.5:4000/api`)
   - **Standart WebSocket URL:** `ws://<KASSA_IP>:4000/ws` (Masalan: `ws://192.168.1.5:4000/ws`)

---

## 🔐 2. Autentifikatsiya (Login va Parol bilan kirish)

Ofitsiant ilovaga kirganda barcha xodimlar ro'yxati ko'rinmaydi. Xodim faqat kassa tomonidan berilgan shaxsiy **Login** va **Parol**ini terib kiradi.

### 2.1. Login va Parol orqali kirish
* **Metod:** `POST`
* **URL:** `/api/auth/login` (yoki `/auth/login`)
* **Headers:** `Content-Type: application/json`
* **Request Body:**
```json
{
  "login": "akbar",
  "password": "3333"
}
```
*(Izoh: `login` o'rniga xodim logini, email, telefon yoki ismi `akbar` / `Akbar`, `password` o'rniga esa uning paroli yoki 4 xonali PIN `3333` yuboriladi).*

* **Muvaffaqiyatli Javob (200 OK):**
```json
{
  "success": true,
  "id": "0ea11162-a4d9-4f94-a38e-192fdf88d89b",
  "name": "Akbar",
  "role": "waiter",
  "tenantId": "90e04abf-246d-4683-91eb-1ac34d7b2ee7",
  "tenantName": "Test Kafe",
  "token": "token_1789390247",
  "user": {
    "id": "0ea11162-a4d9-4f94-a38e-192fdf88d89b",
    "rawId": 10,
    "name": "Akbar",
    "role": "waiter",
    "tenantId": "90e04abf-246d-4683-91eb-1ac34d7b2ee7",
    "tenantName": "Test Kafe",
    "is_shift_open": 1
  }
}
```

---

## 🏢 3. Zallar / Xonalar Ro'yxati (Halls / Rooms)

### 3.1. Zallar ro'yxatini olish
* **Metod:** `GET`
* **URL:** `/api/halls` (yoki `/api/rooms`)
* **Response (200 OK):**
```json
{
  "success": true,
  "halls": [
    { "id": 1, "name": "Asosiy Zal", "order_index": 1, "table_count": 5 },
    { "id": 2, "name": "Zal 1", "order_index": 2, "table_count": 5 },
    { "id": 3, "name": "Zal 2", "order_index": 3, "table_count": 5 },
    { "id": 4, "name": "2-Qavat Zal", "order_index": 4, "table_count": 5 },
    { "id": 5, "name": "VIP Xona", "order_index": 5, "table_count": 0 }
  ]
}
```

---

## 🍽️ 4. Stollar Boshqaruvi (Tables)

### 4.1. Barcha stollar va ularning holati
Har bir stol obyektida agar stol band bo'lsa, uning ichidagi taomlar (`items` va `order_items`) avtomatik biriktirib qaytariladi!
* **Metod:** `GET`
* **URL:** `/api/tables`
* **Response (200 OK):**
```json
{
  "success": true,
  "tables": [
    {
      "id": 3,
      "number": 3,
      "name": "STOL - 3",
      "hall": "Asosiy Zal",
      "capacity": 4,
      "status": "busy",
      "order_id": "ord_92db73a5",
      "waiter_name": "Akbar",
      "total_amount": 208000,
      "order_created_at": "2026-09-14 17:50:47",
      "items_count": 2,
      "items": [
        {
          "id": 1,
          "order_id": "ord_92db73a5",
          "product_id": 1,
          "product_name": "Mastava",
          "quantity": 2,
          "price": 32000,
          "comment": "Issiq",
          "status": "sent"
        },
        {
          "id": 2,
          "order_id": "ord_92db73a5",
          "product_id": 3,
          "product_name": "Chuchvara",
          "quantity": 1,
          "price": 38000,
          "comment": "Qatiq bilan",
          "status": "sent"
        }
      ]
    },
    {
      "id": 4,
      "number": 4,
      "name": "STOL - 4",
      "hall": "Asosiy Zal",
      "capacity": 4,
      "status": "free",
      "order_id": null,
      "waiter_name": null,
      "total_amount": 0,
      "items": []
    }
  ]
}
```

---

## 📋 5. Menyu va Taomlar Katalogi

### 5.1. Kategoriya va Taomlar ro'yxati
* **Metod:** `GET`
* **URL:** `/api/menu`
* **Response:**
```json
{
  "success": true,
  "categories": [
    { "id": 1, "name": "БИР ЗУМДА", "slug": "fastfood_1", "icon": "🍔", "image": "..." }
  ],
  "products": [
    {
      "id": 1,
      "name": "CHEESEBURGER",
      "price": 28000,
      "category_id": 1,
      "stock_quantity": 100,
      "unit": "dona",
      "image": "https://..."
    }
  ]
}
```

---

## 🛒 6. Buyurtmalar (Orders)

### 6.1. Stolga buyurtma kiritish yoki taom qo'shish
* **Metod:** `POST`
* **URL:** `/api/orders` (yoki `/api/orders/items` yoki `/api/tables/:tableId/orders`)
* **Request Body (camelCase yoki snake_case qabul qilinadi):**
```json
{
  "tableId": 3,
  "waiterName": "Akbar",
  "items": [
    {
      "product_id": 1,
      "product_name": "Mastava",
      "quantity": 2,
      "price": 32000,
      "comment": "Issiq"
    }
  ]
}
```

### 6.2. Stol bo'yicha faol buyurtma va taomlarni ko'rish
* **Metod:** `GET`
* **URL:** `/api/orders/table/:tableId` (yoki `/api/tables/:tableId/order` yoki `/api/orders?tableId=3`)
* **Response (200 OK):**
```json
{
  "success": true,
  "order": {
    "id": "ord_92db73a5",
    "table_id": 3,
    "table_number": 3,
    "table_name": "STOL - 3",
    "waiter_name": "Akbar",
    "status": "open",
    "total_amount": 208000,
    "items": [
      {
        "id": 1,
        "product_id": 1,
        "product_name": "Mastava",
        "quantity": 2,
        "price": 32000,
        "comment": "Issiq"
      }
    ]
  },
  "items": [
    {
      "id": 1,
      "product_id": 1,
      "product_name": "Mastava",
      "quantity": 2,
      "price": 32000,
      "comment": "Issiq"
    }
  ],
  "table": {
    "id": 3,
    "number": 3,
    "name": "STOL - 3",
    "status": "busy",
    "total_amount": 208000
  }
}
```

### 6.3. "Hisob so'raldi" (Bill Request / Pre-chek) yuborish
* **Metod:** `POST`
* **URL:** `/api/orders/:orderId/bill-request`

---

## ⚡ 7. Real-Time WebSockets (`ws://<KASSA_IP>:4000/ws`)

* **Ulanish:** `ws://192.168.1.5:4000/ws`
* **Hodisalar:**
  - `TABLE_UPDATED`: Stol holati o'zgarganda (ochilganda, to'langanda, buyurtma qo'shilganda)
  - `KITCHEN_NEW_TICKET`: Yangi buyurtma oshxonaga yuborilganda
  - `BILL_REQUESTED`: Mijoz hisob so'raganda
