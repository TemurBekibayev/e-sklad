# KafePOS — Avtomatlashtirish Tizimi (Offline-First POS & Soliq.uz)

[![Node.js](https://img.shields.io/badge/Node.js-v20%2B-green.svg)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8.svg)](https://tailwindcss.com)
[![SQLite](https://img.shields.io/badge/SQLite-Offline--First-003B57.svg)](https://sqlite.org)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](https://docker.com)
[![Soliq.uz](https://img.shields.io/badge/Soliq.uz-Virtual%20Kassa%20Integratsiya-emerald.svg)](https://soliq.uz)

Kafe va restoranlar uchun maxsus ishlab chiqilgan professional avtomatlashtirish tizimi.
Tizimning asosiy afzalligi — **internet uzilgan taqdirda ham kafening ichki Wi-Fi tarmog'ida to'liq oflayn ishlaydi** va **Soliq.uz (Virtual Kassa / MXIK kodlar / QR-kodli fiskal kvitansiya)** talablariga to'liq javob beradi.

---

## Asosiy Imkoniyatlar

### 1. Kassa Dasturi (Desktop / .exe)
- **PIN-kodli xavfsiz kirish:** Kassir va Administrator uchun alohida ruxsatlar.
- **Stollar Xaritasi (12 ta stol):**
  - 🟢 **Yashil** — Bo'sh stol
  - 🔴 **Qizil** — Band stol (ofitsiant ismi va jami summa real-vaqtda yangilanadi)
  - 🟡 **Sariq** — Hisob so'ralgan (pulsatsiyalanuvchi diqqat jalb qiluvchi holat)
- **To'lovni qabul qilish:**
  - Naqd pul
  - Plastik karta (Terminal)
  - Aralash to'lov (naqd + karta bo'yicha kalkulyator)
- **Sinxronizatsiya paneli:** Ekranning yuqori burchagida `ONLINE` / `OFLAYN` holati va Soliqqa jo'natilmagan cheklar soni ko'rinib turadi.

### 2. Ofitsiant Ilovasi (Planshet / Smartfon)
- Istalgan smartfon yoki planshetdan lokal Wi-Fi orqali ochiladi (`http://<Kassa-IP>:4000/waiter`).
- Taomlar toifalarga bo'lingan: *Birinchi taomlar, Quyuq taomlar, Ichimliklar, Salatlar*.
- Katta fotosuratlar, narxlar va savatga porsiya sonini kiritish (`+` / `-`).
- **Taomga izoh yozish:** Tezkor teglardan tanlash (*"Piyozsiz"*, *"Issiqroq"*, *"Muzsiz"*, *"Achchiq emas"*) yoki qo'lda kiritish.
- **"Yuborish" tugmasi:** Bir zumda kassa va oshxonaga uzatiladi (WebSockets orqali 0.1 soniyada).
- **"Hisob so'raldi" tugmasi:** Kassa ekranidagi stolni sariq rangga o'tkazadi.

### 3. Oshxona Ekrani va Begunok Printeri (KDS)
- Buyurtma yuborilishi bilan oshxona ekraniga tushadi va audio qo'ng'iroq chalinadi.
- **"Begunok" cheki:** Unda FAQAT: Stol raqami, Taom nomi, Soni, Ofitsiant ismi, Vaqt va Izoh chiqadi. **Narxlar mutlaqo ko'rsatilmaydi**.

### 4. Soliq.uz / Virtual Kassa Integratsiyasi
- Har bir taomga **17 xonali MXIK (IKPU) kodi**, o'lchov birligi (**796 - dona**) va **12% QQS** hisob-kitobi biriktirilgan.
- To'lov amalga oshirilganda 80mm formatdagi **Fiskal Kvitansiya** generatsiya bo'ladi:
  - Korxona rekvizitlari, INN, Terminal ID, Fiskal Modul ID.
  - 12 xonali unikal **Fiskal belgi (ФП)**.
  - Skaner qilinadigan rasmiy **Soliq QR-kodi**.
- **Oflayn rejim:** Internet uzilganda cheklar to'xtamaydi, `fiscal_queue` buferiga saqlanadi. Internet yoqilishi bilan avtomatik tarzda Soliq.uz bazasiga jo'natiladi.

---

## O'rnatish va Ishga Tushirish

### 1-usul: Mahalliy (Windows / macOS / Linux)

```bash
# Repozitoriyani klonlash
git clone https://github.com/username/kafepos.git
cd kafepos

# Bog'liqliklarni o'rnatish
npm install
cd client && npm install && npm run build && cd ..

# Serverni ishga tushirish
npm start
```
Windows foydalanuvchilari uchun papkadagi `start_kafepos.bat` faylini ikki marta bosish kifoya!

Desktop `.exe` ko'rinishida ochish uchun:
```bash
npm run desktop
```

Brauzer orqali: **[http://localhost:4000](http://localhost:4000)**

---

### 2-usul: Docker orqali ishga tushirish 🐳

Loyihada Docker va Docker Compose to'liq sozlangan:

```bash
# Konteynerni yig'ish va fonda ishga tushirish
docker compose up --build -d

# Loglarni ko'rish
docker compose logs -f
```

Tizim `http://localhost:4000` portida ishga tushadi. SQLite ma'lumotlar bazasi `kafepos_data` volume'ida xavfsiz saqlanadi.

---

## Tizim PIN-kodlari

| Rol | Ism | PIN-kod |
| :--- | :--- | :--- |
| **Kassir** | Kassir Aziz | `1234` |
| **Ofitsiant 1** | Sardor | `1111` |
| **Ofitsiant 2** | Malika | `2222` |
| **Administrator** | Bosh Admin | `0000` |

---

## Avtomatik Testlarni Ishga Tushirish

Barcha funksiyalar va TZ stsenariysini tekshirish uchun:
```bash
node test_scenario.js
```

---

## Loyiha Strukturasi

```
kafepos/
├── client/                 # React + Tailwind v4 + Lucide frontend
│   ├── src/
│   │   ├── components/     # Header, PinModal, ReceiptModal
│   │   ├── pages/          # CashierView, WaiterView, KitchenView, MxikSettings
│   │   └── App.jsx
│   └── vite.config.js
├── server/                 # Node.js backend
│   ├── db.js               # SQLite baza sxemasi va seed
│   ├── printer.js          # Begunok va kassa printer moduli
│   ├── soliq.js            # Soliq.uz fiskallashtirish va oflayn navbat
│   └── index.js            # Express API va WebSockets server
├── electron/               # Desktop (.exe) o'rami
│   └── main.js
├── Dockerfile              # Multi-stage Docker build
├── docker-compose.yml      # Docker Compose konfiguratsiyasi
├── test_scenario.js        # TZ bo'yicha to'liq avtomatik test
└── start_kafepos.bat       # Windows bir marta bosish orqali start
```

---

## Litsenziya
Ushbu loyiha ochiq kodli bo'lib, erkin foydalanish uchun taqdim etiladi.
