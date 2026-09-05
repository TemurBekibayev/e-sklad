# TEXNIK TOPSHIRIQ — 1/3: MOBILE APP
## "SotuvPro" tizimi — Savdo xodimi ilovasi

**Hujjat versiyasi:** 2.0 (to'liq, ishlab chiqarish darajasi)
**Ushbu hujjat:** Mobile App dasturchisi uchun. Tizimning boshqa ikki qismi (Manager Web App, Admin Panel) alohida hujjatlarda — barchasi bitta umumiy backend va ma'lumotlar bazasiga ulanadi.

---

## 1. TIZIM HAQIDA UMUMIY MA'LUMOT (barcha 3 hujjatda bir xil)

SotuvPro — qurilish va chakana savdo do'konlari uchun sklad, savdo va qarz nazorati tizimi. Uch qismdan iborat:

1. **Mobile App** (ushbu hujjat) — savdo xodimlari uchun, Android/iOS
2. **Manager Web App** — do'kon menejerlari uchun, brauzer (planshet/noutbuk)
3. **Admin Panel** — platforma egasi uchun

Barcha uchtasi **bitta umumiy backend va PostgreSQL ma'lumotlar bazasiga** ulanadi. Backend alohida jamoa a'zosi tomonidan quriladi va barcha uchta frontend uchun bir xil API kontraktini taqdim etadi.

**Asosiy tamoyil:** Tizim mavjud bozordagi yechimlardan (ePos va h.k.) **tezkorlik va soddalik** bilan ustunlik qilishi kerak. Har bir kundalik amal 3-5 soniya ichida bajarilishi kerak. MVP tushunchasi yo'q — to'liq, ishlab chiqarish darajasidagi dastur talab qilinadi.

## 2. ATAMALAR (barcha hujjatlarda bir xil)

| Atama | Ma'nosi |
|---|---|
| Tenant | Alohida do'kon |
| Worker (Xodim) | Savdo xodimi, mobil ilova foydalanuvchisi |
| Manager | Do'kon menejeri, veb-ilova foydalanuvchisi |
| Kelish birligi | Mahsulot omborga qanday birlikda kelishi (qop, tonna, rulon) |
| Sotish birligi | Mahsulot mijozga qanday birlikda sotilishi (dona, metr, kg) |
| Savat | Bitta mijoz uchun vaqtinchalik yig'ilgan mahsulotlar ro'yxati |

## 3. UMUMIY MA'LUMOTLAR MODELI (barcha hujjatlarda bir xil — to'liq ma'lumot uchun)

Backend quyidagi asosiy obyektlarni taqdim etadi (Mobile App ular bilan API orqali ishlaydi):

- `tenants` — do'konlar
- `users` — foydalanuvchilar (role: worker/manager), PIN-kod bilan
- `products` — mahsulotlar: nomi, kelish/sotish birligi, konversiya koeffitsienti, narx, qoldiq (sotish birligida), barcode, qr_code, kam qoldiq chegarasi
- `stock_movements` — kirim/chiqim/tuzatish tarixi
- `baskets` / `basket_items` — faol savatlar (Mobile App bevosita shu bilan ishlaydi)
- `transactions` — yakunlangan savdolar
- `debts` / `debt_history` — qarzlar
- `audit_logs` — barcha muhim amallar logi

**Mobile App uchun eng muhim obyektlar:** `products`, `baskets`, `basket_items`, `transactions` (oddiy sotuvlarni xodim o'zi yakunlaganda).

---

## 4. MOBILE APP — FUNKSIONAL TALABLAR

### 4.1 Autentifikatsiya
- 4.1.1 4 xonali PIN-kod orqali kirish
- 4.1.2 Bitta qurilmada bir nechta xodim ishlashi mumkin — kirishda foydalanuvchi tanlash ekrani (ism, avatar, rol belgisi)
- 4.1.3 PIN unutilganda — ilovada "PIN kodni unutdingizmi?" tugmasi, bu manager'ga bildirishnoma yuboradi (yoki manager kodi orqali tiklash oynasi ochiladi)
- 4.1.4 Xodim manager tomonidan faolsizlantirilsa, uning PIN kodi darhol ishlamay qoladi (keyingi API so'rovida serverdan tekshiriladi)

### 4.2 Bosh ekran — faol savatlar
- 4.2.1 Xodimning barcha faol mijoz savatlari kartochka ko'rinishida ko'rsatiladi: mijoz nomi, mahsulotlar soni, umumiy summa, holat (faol/kutishda)
- 4.2.2 "Yangi savat" tugmasi doim ko'rinib turadi
- 4.2.3 Savat 2-3 soatdan beri faol bo'lmasa, "eskirgan" deb vizual belgilanadi, lekin avtomatik o'chirilmaydi

### 4.3 Savat ichi — mahsulot qo'shish
- 4.3.1 Mijoz nomi/raqami tahrirlanishi mumkin
- 4.3.2 "Skanerlash" tugmasi — to'liq ekran kamera oynasini ochadi
- 4.3.3 Eng ko'p sotiladigan mahsulotlar uchun tezkor tugmalar (grid ko'rinishida), skanerlashsiz tanlash imkoniyati
- 4.3.4 Qo'shilgan mahsulotlar ro'yxati, har birida miqdorni tez o'zgartirish (+/- tugmalari)
- 4.3.5 Umumiy summa doim pastda katta va aniq ko'rinadi

### 4.4 Skanerlash mantig'i (to'liq)
- 4.4.1 Kamera barcode (EAN-13, EAN-8, UPC, Code128) va QR kodni bir oynada aniqlaydi
- 4.4.2 Kod bazada mavjud bo'lsa → mahsulot avtomatik aniqlanadi, faqat **sotish birligida** miqdor so'raladi
- 4.4.3 Kod bazada topilmasa → yangi mahsulot ro'yxatga olish formasi ochiladi, kod avtomatik bog'langan holda (foydalanuvchi kodni qo'lda kiritmaydi)
- 4.4.4 Kod aniqlanmasa (mahsulotda yo'q yoki o'qib bo'lmasa) → "Barcode topilmadimi?" tugmasi orqali ikki variant: "QR kod yaratish" (tizim avtomatik generatsiya qiladi) yoki "Qo'lda kiritish"
- 4.4.5 Yangi mahsulot bazaga qo'shilgan zahoti, backend orqali chop etishga tayyor yorliq (barcode/QR + nomi + narxi) generatsiya qilinadi — bosib chiqarish uchun PDF yoki to'g'ridan-to'g'ri ulangan etiketka/chek printerga yuborish imkoniyati (printer integratsiyasi — pastda 4.9 bandida)

### 4.5 O'lchov birligi bilan sotish (bulk-to-unit)
- 4.5.1 Xodim har doim **sotish birligida** kiritadi (masalan "12 metr"), kelish birligi haqida umuman bilishi shart emas
- 4.5.2 Narx avtomatik hisoblanadi: miqdor × sotish birligi narxi
- 4.5.3 Sklad qoldig'idan ko'proq miqdor kiritilsa — ogohlantirish chiqadi; agar do'kon sozlamasida "minusga sotish" yoqilgan bo'lsa, davom ettirish imkoniyati beriladi

### 4.6 Savdoni yakunlash (xodim tomonidan)
- 4.6.1 Oddiy, kichik summadagi va naqd to'lovli savdolarni xodim o'zi yakunlay oladi (manager kutish shart emas)
- 4.6.2 Qarzga sotish yoki do'kon sozlamasida belgilangan chegaradan yuqori summadagi savdolar — manager tasdig'i talab qilinadi (bunday holatda savdo "kutilmoqda" holatida manager ekraniga yuboriladi)
- 4.6.3 To'lov turi: Naqd / Karta / Qarz / Aralash (qisman naqd + qisman qarz)

### 4.7 Offline ishlash
- 4.7.1 Barcha amallar mahalliy (SQLite) bazada saqlanadi, internet yo'qligida ilova to'liq ishlaydi
- 4.7.2 Internet qaytganda fon rejimida avtomatik sinxronizatsiya
- 4.7.3 Sinxronizatsiya nizolarida: miqdorlar uchun jamlanuvchi hisob (increment/decrement), boshqa maydonlar uchun oxirgi yozilgan qiymat ustun turadi
- 4.7.4 Xodim offline holatda eski narxni ko'rgan bo'lsa, sinxronizatsiyadan keyin savdo yangi (serverdagi joriy) narxda qayta hisoblanadi, xodimga bildirishnoma ko'rsatiladi

### 4.8 Savdo tarixi
- 4.8.1 Xodim o'zining bugungi/o'tgan savdolari tarixini ko'ra oladi (faqat o'ziniki, boshqa xodimlarniki emas)

### 4.9 Yorliq/chek chop etish integratsiyasi
- 4.9.1 Tizim Bluetooth orqali ulanadigan etiketka/chek printerlarni qo'llab-quvvatlashi kerak (standart ESC/POS protokoli asosidagi arzon termoprinterlar bilan mos ishlash)
- 4.9.2 Agar printer ulanmagan bo'lsa, yorliq PDF/rasm sifatida saqlanadi yoki ulashiladi (masalan boshqa qurilmaga yuborish uchun)
- 4.9.3 Narx o'zgartirilganda (bu amal Manager Web App orqali bajariladi), mobil ilovada ham yangi yorliqni qayta chop etish imkoniyati bo'lishi kerak

---

## 5. NOFUNKSIONAL TALABLAR (Mobile App uchun)

- 5.1 Har bir amal (skanerlash, savatga qo'shish, savdoni yakunlash) 3-5 soniya ichida bajarilishi kerak
- 5.2 Ilova ishga tushishi 3 soniyadan oshmasligi kerak
- 5.3 Barcha interfeys matnlari o'zbek tilida (lotin alifbosida), sodda va tanish so'zlar bilan — texnik/xorijiy atamalar (SKU va h.k.) ishlatilmaydi
- 5.4 Har bir asosiy amal 2-3 bosishdan oshmasligi kerak
- 5.5 Katta tugmalar, minimal matn — past texnik savodli foydalanuvchi uchun mo'ljallangan dizayn

---

## 6. TAVSIYA ETILGAN TEXNOLOGIYALAR

- React Native (Expo)
- Expo SQLite (offline saqlash)
- Kamera/skaner: `expo-barcode-scanner` yoki `vision-camera-code-scanner`
- Real-vaqt aloqa: Socket.io client (backend bilan)
- Bluetooth printer: ESC/POS mos kutubxona (masalan `react-native-thermal-receipt-printer` yoki shunga o'xshash)

---

## 7. QABUL QILISH MEZONLARI

1. Xodim 5 soniya ichida mahsulot skanerlab, savatga qo'sha oladi
2. Bir xodim kamida 3 ta mijozga parallel xizmat ko'rsata oladi, savatlar bir-biriga aralashmaydi
3. Kelish birligida kiritilgan mahsulot to'g'ri konvertatsiya qilinib, sotish birligida saqlanadi va shu birlikda sotiladi
4. Internet o'chirilganda ilova to'liq ishlaydi, internet qaytganda barcha amallar to'g'ri sinxronlanadi
5. Yangi mahsulot skanerlanganda, tizim avtomatik yorliq generatsiya qiladi va uni chop etish/ulashish mumkin
6. Tizimning hech bir ekranida texnik/xorijiy atama ishlatilmagan

---

## 8. BOG'LIQ HUJJATLAR

- **TZ 2/3 — Manager Web App**: `baskets`, `transactions`, `debts` obyektlarini real-vaqtda kuzatadi va boshqaradi. Mobile App yaratgan savatlar shu hujjatdagi tizimda ko'rinadi.
- **TZ 3/3 — Admin Panel**: `tenants`, faollik monitoring. Mobile App orqali qilingan har bir amal admin panelning faollik statistikasiga ta'sir qiladi.

Ushbu uchta hujjat bitta umumiy backend va ma'lumotlar bazasi atrofida quriladi — API kontrakti (endpoint nomlari, so'rov/javob formatlari) backend jamoasi tomonidan barcha uchta frontend jamoasiga hujjatlashtirib beriladi.
