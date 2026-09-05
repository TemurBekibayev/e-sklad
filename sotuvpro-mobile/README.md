# SotuvPro Mobile — Android Ilova Qo'llanmasi

Ushbu loyiha **"SotuvPro"** savdo xodimi ilovasi bo'lib, **Flutter (Dart)** texnologiyasida tayyorlangan va **Android Studio** orqali run qilish uchun to'liq moslashtirilgan.

---

## 🚀 Android Studio'da Ishga Tushirish Bosqichlari

1. **Android Studio** dasturini oching.
2. `Open` tugmasini bosing va ushbu papkani tanlang:
   `c:\Users\user\Desktop\E-sklad2\sotuvpro-mobile`
3. Android Studio loyihani va Flutter/Dart pluginlarini o'zi yuklaydi.
4. Emulyatorni (yoki ulangan Android telefonni) tanlang.
5. Yuqoridagi yashil **RUN** (`Play` ▶️) tugmasini bosing.

---

## 🔐 Sinov Uchun Xodimlar va PIN-kodlar

| Foydalanuvchi | Rol | PIN-kod |
|---|---|---|
| Alisher Oripov | Savdo xodimi | `1234` |
| Jasur Karimov | Savdo xodimi | `2222` |
| Sardor Rahimov | Do'kon menejeri | `9999` |

---

## ✨ Ilovaning Asosiy Imkoniyatlari

1. **4 xonali PIN-kod**: 
   - 4.1.1 — 4 xonali PIN orqali tezkor autentifikatsiya.
   - 4.1.2 — Bitta qurilmada bir nechta xodim ishlashi va almashtirish.
   - 4.1.3 — "PIN kodni unutdingizmi?" tugmasi va bildirishnoma.

2. **Bosh Ekran — Faol Savatlar**:
   - 4.2.1 — Savdo xodimining faol mijoz savatlari kartochka shaklida.
   - 4.2.2 — "YANGI SAVAT" tugmasi.
   - 4.2.3 — 2 soatdan oshgan savatlarga "Eskirgan (2 soat+)" vizual belgisi.

3. **Skanerlash va Yangi Mahsulotlar (Kamera / MobileScanner)**:
   - 4.4.1 — Barcode va QR-kodni kamera orqali soniyada aniqlash.
   - 4.4.2 — Mavjud mahsulot topilsa, sotish birligida miqdor kiritish dialogi.
   - 4.4.3 — Kod topilmasa, "Yangi mahsulot ro'yxatga olish" dialogi (kod avtomatik biriktiriladi).
   - 4.4.4 — "Barcode topilmadimi?" tugmasi (Avtomatik unikal QR kod generatsiyasi yoki qo'lda kiritish).
   - 4.4.5 & 4.9 — Yorliq (Barcode/QR + Narx) generatsiyasi va termoprinter/PDF shaklida chop etish/ulashish.

4. **Bulk-to-Unit (O'lchov Birligi Bilan Sotish)**:
   - 4.5.1 — Xodim har doim sotish birligida (metr, kg, dona) kiritadi.
   - 4.5.3 — Sklad qoldig'idan ko'proq miqdor kiritilsa "Minusga sotish" ogohlantirish oynasi.

5. **Savdoni Yakunlash va Menejer Tasdig'i**:
   - 4.6.1 — Oddiy naqd va karta savdolari xodim tomonidan yakunlanadi.
   - 4.6.2 — Qarzga sotish yoki katta summalarda MENEJER TASDIG'I talab qilinadi ("Kutilmoqda" holati).
   - 4.6.3 — To'lov turlari: Naqd / Karta / Qarz / Aralash.

6. **Offline Ishlash va Sinxronizatsiya**:
   - 4.7.1 — Barcha ma'lumotlar mahalliy SQLite (`sqflite`) ma'lumotlar bazasida saqlanadi.
   - 4.7.2 — Internet uzilganda ham ilova to'liq ishlaydi, ulanganda fonli avtomatik sinxronizatsiya.

7. **Savdo Tarixi**:
   - 4.8.1 — Xodimning shaxsiy savdolar tarixi va chekni qayta chop etish.
