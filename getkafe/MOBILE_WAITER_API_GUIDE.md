# GetPOS Kafe — Mobile Ofitsiant Ilovasi (Flutter / React Native) uchun To'liq API Qo'llanmasi

Ushbu hujjat **GetPOS Kafe** ofitsiant mobil ilovasini ishlab chiqayotgan dasturchi uchun mo'ljallangan.

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

## 🔐 2. Autentifikatsiya (Xodim PIN-kodi)

### 2.1. Xodimlar ro'yxatini olish
* **Metod:** `GET`
* **URL:** `/api/auth/users`

### 2.2. PIN-kod orqali kirish (Login)
* **Metod:** `POST`
* **URL:** `/api/auth/login`
* **Request Body:**
``json
{
  "userId": "usr_1",
  "pin": "1111"
}
``

---

## 🍽️ 3. Stollar Boshqaruvi (Tables)

### 3.1. Barcha stollar va ularning holati
* **Metod:** `GET`
* **URL:** `/api/tables`
* **Response:**
``json
{
  "success": true,
  "tables": [
    {
      "id": 1,
      "number": 1,
      "status": "busy",
      "order_id": "ord_7944a017",
      "waiter_name": "Sardor",
      "total_amount": 40000,
      "order_created_at": "2026-09-14 15:58:21"
    },
    {
      "id": 2,
      "number": 2,
      "status": "free",
      "order_id": null,
      "waiter_name": null,
      "total_amount": 0,
      "order_created_at": null
    }
  ]
}
``

---

## 📋 4. Menyu va Taomlar Katalogi

### 4.1. Kategoriya va Taomlar ro'yxati
* **Metod:** `GET`
* **URL:** `/api/menu`

---

## 🛒 5. Buyurtmalar (Orders)

### 5.1. Yangi stolga buyurtma kiritish (Stolni band qilish va oshxonaga jo'natish)
* **Metod:** `POST`
* **URL:** `/api/orders`
* **Request Body:**
``json
{
  "tableId": 1,
  "waiterId": "usr_1",
  "waiterName": "Sardor",
  "items": [
    {
      "product_id": 1,
      "product_name": "Qiyma shashlik",
      "quantity": 2,
      "price": 20000,
      "comment": "Piyozsiz"
    },
    {
      "product_id": 2,
      "product_name": "Choyxona Oshi (Palov)",
      "quantity": 1,
      "price": 45000,
      "comment": "Issiqroq"
    }
  ]
}
``

### 5.2. Ochiq stoldagi faol buyurtmani ko'rish
* **Metod:** `GET`
* **URL:** `/api/orders/table/:tableId`

### 5.3. Ochiq stolga qo'shimcha taom qo'shish
* **Metod:** `POST`
* **URL:** `/api/orders/items`

### 5.4. "Hisob so'raldi" (Bill Request) yuborish
* **Metod:** `POST`
* **URL:** `/api/orders/:orderId/bill-request`

---

## ⚡ 6. Real-Time WebSockets (ws://<KASSA_IP>:4000/ws)

* **Ulanish:** `ws://192.168.1.5:4000/ws`
* **TABLE_UPDATED:** Boshqa ofitsiant yoki kassa tomonidan stol o'zgarganda keladi:
``json
{
  "event": "TABLE_UPDATED",
  "data": {
    "id": 1,
    "number": 1,
    "status": "busy",
    "order_id": "ord_7944a017",
    "waiter_name": "Sardor",
    "total_amount": 85000
  }
}
``
