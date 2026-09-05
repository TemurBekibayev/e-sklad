# SotuvPro — Xavfsizlik Talablari (barcha 3 qismga tegishli)

Ushbu hujjat — Mobile App, Manager Web App va Admin Panel uchun umumiy xavfsizlik standarti. Har uch dasturchi (yoki AI agent) shu talablarga rioya qilishi shart, chunki zaif nuqta istalgan bitta qismda bo'lsa, butun tizim xavf ostida qoladi.

## 1. Autentifikatsiya va sessiya boshqaruvi

- **1.1** PIN-kodlar hech qachon ochiq matnda (plain text) saqlanmaydi — bazada faqat **bcrypt/argon2 orqali xeshlangan** holatda saqlanadi
- **1.2** Har bir muvaffaqiyatli kirishdan so'ng qisqa muddatli **JWT token** (yoki shunga teng) beriladi, u har so'rovda tekshiriladi
- **1.3** Token muddati tugashi: mobil ilovada uzoqroq (masalan 30 kun, "refresh token" bilan), veb-ilovalarda qisqaroq (masalan 8-12 soat)
- **1.4** Ketma-ket 5 marta noto'g'ri PIN kiritilsa, hisob **vaqtincha bloklanadi** (masalan 5 daqiqaga) — bu PIN'ni "qo'pol kuch" (brute-force) bilan topishga urinishning oldini oladi
- **1.5** Admin Panel uchun email+parol — parol kamida 8 belgi, ixtiyoriy ravishda ikki bosqichli tasdiqlash (2FA) qo'shilishi tavsiya etiladi

## 2. Ma'lumotlar izolyatsiyasi (Multi-tenant xavfsizlik)

- **2.1** Har bir so'rovda `tenant_id` serverda **token ichidan** olinadi, hech qachon foydalanuvchi tomonidan yuboriladigan parametrdan emas — aks holda bir do'kon boshqa do'kon ma'lumotlarini so'rashi mumkin bo'lib qoladi
- **2.2** Har bir ma'lumotlar bazasi so'rovida `WHERE tenant_id = ?` majburiy qo'llanilishi kerak — buni backend darajasida (masalan middleware yoki ORM darajasida) avtomatlashtirish tavsiya etiladi, har bir endpoint'da qo'lda yozish xato qilish xavfini oshiradi
- **2.3** Worker faqat o'z tenant'i va o'z ma'lumotlariga, Manager esa faqat o'z tenant'ining barcha ma'lumotlariga kirishi mumkin — boshqa do'konni umuman "ko'ra olmasligi" kerak

## 3. API xavfsizligi

- **3.1** Barcha aloqa **faqat HTTPS** orqali (TLS shifrlash), hech qanday ochiq HTTP endpoint bo'lmasligi kerak
- **3.2** Har bir kiruvchi ma'lumot (input) serverda **validatsiya qilinishi** kerak — turi, uzunligi, formati tekshiriladi (masalan narx manfiy bo'lmasligi, miqdor son bo'lishi)
- **3.3** SQL so'rovlarida faqat **parametrlangan so'rovlar (prepared statements)** ishlatiladi — hech qachon foydalanuvchi kiritgan matn to'g'ridan-to'g'ri SQL satriga qo'shilmaydi (SQL Injection oldini olish)
- **3.4** API'da **rate limiting** (bir IP/foydalanuvchidan daqiqada nechta so'rov) o'rnatiladi — bu qo'pol kuch hujumlari va server ortiqcha yuklanishining oldini oladi
- **3.5** Manager Web App va Admin Panel'da barcha foydalanuvchi kiritgan matn (masalan mijoz izohi) chiqarishdan oldin **ekranlanadi (escaped)** — XSS (Cross-Site Scripting) hujumlarining oldini olish uchun

## 4. Maxfiy ma'lumotlarni saqlash

- **4.1** Backend konfiguratsiyasi (ma'lumotlar bazasi parollari, API kalitlari — SMS-shlyuz, va h.k.) **kodga yozilmaydi**, faqat muhit o'zgaruvchilari (environment variables) yoki maxfiy menejer (secrets manager) orqali saqlanadi
- **4.2** `.env` fayllari va shunga o'xshash maxfiy fayllar **hech qachon** Git repozitoriyga qo'shilmaydi (`.gitignore`da bo'lishi shart)
- **4.3** Mijozlarning shaxsiy ma'lumotlari (ism, telefon raqami) — faqat zarur bo'lgan minimal miqdorda saqlanadi, qo'shimcha ma'lumot yig'ilmaydi

## 5. Audit va monitoring

- **5.1** Har bir muhim amal (kirish, savdo, narx o'zgarishi, sklad tuzatishi, do'kon qo'shish/o'chirish) `audit_logs`ga yoziladi — kim, qachon, qaysi IP/qurilmadan
- **5.2** Shubhali faoliyat (masalan bitta hisobdan g'ayrioddiy ko'p so'rov) uchun ogohlantirish mexanizmi bo'lishi tavsiya etiladi (keyingi bosqichda)

## 6. Zaxira nusxalash (Backup) va tiklash

- **6.1** Ma'lumotlar bazasining **kunlik avtomatik zaxira nusxasi** olinishi shart (masalan PostgreSQL uchun `pg_dump` orqali, alohida xavfsiz joyga saqlanadi)
- **6.2** Zaxiradan tiklash jarayoni kamida bir marta sinovdan o'tkazilishi kerak — "zaxira bor, lekin tiklab bo'lmaydi" holatining oldini olish uchun

## 7. Qurilma va tarmoq xavfsizligi

- **7.1** Mobil ilovada offline saqlanadigan ma'lumotlar (SQLite) qurilma yo'qolsa/o'g'irlansa ham himoyalangan bo'lishi uchun, imkon qadar shifrlangan saqlash (masalan SQLCipher) ko'rib chiqilishi tavsiya etiladi — ayniqsa qarz/mijoz ma'lumotlari uchun
- **7.2** Bluetooth printer bilan ulanish faqat juftlashtirilgan (paired), ishonchli qurilmalar bilan cheklanadi

## 8. Kutubxonalar va bog'liqliklar

- **8.1** Barcha ishlatilayotgan kutubxonalar (npm paketlar) muntazam yangilanib turilishi kerak, ma'lum zaifliklari (CVE) bo'lgan versiyalardan foydalanilmaydi
- **8.2** `npm audit` yoki shunga o'xshash vosita loyihaning CI/CD jarayoniga qo'shilishi tavsiya etiladi

---

## Qabul qilish mezonlari (xavfsizlik bo'yicha)

1. PIN kodlar bazada xeshlangan holatda, hech qachon ochiq matnda ko'rinmaydi
2. Bir do'kon (tenant) API orqali boshqa do'konning ma'lumotlariga kira olmaydi (test: tenant A tokeni bilan tenant B ma'lumotlarini so'rab ko'rish — rad etilishi kerak)
3. Barcha aloqa HTTPS orqali, hech qanday ochiq HTTP yo'q
4. `.env`/maxfiy fayllar Git tarixida umuman uchramaydi
5. Ma'lumotlar bazasining kunlik zaxira nusxasi ishlaydi va tiklash sinovdan o'tgan
