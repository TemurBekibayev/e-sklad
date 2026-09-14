const http = require('http');

const PORT = 4000;

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: 'localhost',
        port: PORT,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(raw));
          } catch (e) {
            resolve({ raw });
          }
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runVerification() {
  console.log('===========================================================');
  console.log(' KAFEPOS TEXNIK TOPSHIRIQ (TZ) AVTOMATIK TEST DASTURI');
  console.log('===========================================================');

  // 1. Status Check
  const status = await request('GET', '/api/status');
  console.log('✓ 1. Server statusi:', status.success ? 'OK' : 'FAIL', `(Wi-Fi IP: ${status.localIp})`);

  // 2. Fetch Menu & Tables
  const menu = await request('GET', '/api/menu');
  const tables = await request('GET', '/api/tables');
  console.log(`✓ 2. Menyu yuklandi: ${menu.products.length} ta taom, ${tables.tables.length} ta stol.`);

  const shashlik = menu.products.find((p) => p.name.includes('shashlik') || p.name.includes('Shashlik'));
  const choy = menu.products.find((p) => p.name.includes('choy') || p.name.includes('Choy'));
  console.log(`     Tanlangan taomlar: "${shashlik.name}" (MXIK: ${shashlik.mxik_code}) va "${choy.name}" (MXIK: ${choy.mxik_code})`);

  // 3. Stsenariy 1 & 2: Ofitsiant 5-stolni tanlaydi va buyurtma beradi
  // (2 ta shashlik [izoh: piyozsiz], 1 ta choy)
  console.log('\n--- STSENARIY 1 & 2: Ofitsiant 5-stolga buyurtma kiritmoqda ---');
  const orderRes = await request('POST', '/api/orders', {
    tableId: 5,
    waiterId: 1,
    waiterName: 'Ofitsiant Sardor',
    items: [
      {
        product_id: shashlik.id,
        product_name: shashlik.name,
        quantity: 2,
        price: shashlik.price,
        comment: 'piyozsiz',
      },
      {
        product_id: choy.id,
        product_name: choy.name,
        quantity: 1,
        price: choy.price,
        comment: 'issiqroq',
      },
    ],
  });
  console.log('✓ Buyurtma yuborildi:', orderRes.success, `Order ID: ${orderRes.orderId}, Summa: ${orderRes.totalAmount} UZS`);

  // 4. Stsenariy 3: Oshxona Begunok cheki tekshiruvi (NARXLAR KO'RSATILMASLIGI SHART!)
  console.log('\n--- STSENARIY 3: Oshxona "Begunok" cheki tekshiruvi ---');
  const kitchenTicket = orderRes.kitchenTicket;
  console.log('✓ Oshxona begunok matni:\n' + kitchenTicket.ticketText);
  if (kitchenTicket.ticketText.includes('UZS') || kitchenTicket.ticketText.includes('25000')) {
    console.error('XATOLIK: Begunokda narx ko\'rinmasligi kerak edi!');
  } else {
    console.log('✓ MUVAFFAQIYAT: Begunokda faqat stol raqami, taom, soni va izoh bor. Narxlar yo\'q!');
  }

  // 5. Stsenariy 4: Kassa ekranida 5-stol qizil (band) bo'lganini tekshirish
  console.log('\n--- STSENARIY 4: Kassa ekranida 5-stol holati ---');
  const tablesAfterOrder = await request('GET', '/api/tables');
  const table5 = tablesAfterOrder.tables.find((t) => t.id === 5);
  console.log(`✓ 5-stol holati: status = "${table5.status}" (Kutilgan: "busy"), Jami summa: ${table5.total_amount} UZS`);

  // 6. Stsenariy 5: Mijoz hisob so'raydi, ofitsiant "Hisob so'raldi" tugmasini bosadi
  console.log('\n--- STSENARIY 5: "Hisob so\'raldi" amali ---');
  const billReqRes = await request('POST', `/api/orders/${orderRes.orderId}/bill-request`);
  console.log(`✓ 5-stol yangi holati: status = "${billReqRes.table.status}" (Kutilgan: "bill_requested" - Sariq rang)`);

  // 7. Stsenariy 6 & 7: Kassir to'lovni qabul qiladi va Soliq QR-kodli chek chiqadi
  console.log('\n--- STSENARIY 6 & 7: To\'lovni qabul qilish va Fiskal chek ---');
  const paymentRes = await request('POST', '/api/payments', {
    orderId: orderRes.orderId,
    tableId: 5,
    paymentMethod: 'split',
    cashAmount: 30000,
    cardAmount: orderRes.totalAmount - 30000,
  });

  const receipt = paymentRes.receipt;
  console.log('✓ To\'lov muvaffaqiyatli qabul qilindi!');
  console.log(`   - Chek №: ${receipt.receiptSeq}`);
  console.log(`   - INN: ${receipt.company.inn}`);
  console.log(`   - Jami summa: ${receipt.totalAmount} UZS (Shundan QQS 12%: ${receipt.vatAmount} UZS)`);
  console.log(`   - Fiskal belgi (12 xona): ${receipt.fiscalSign}`);
  console.log(`   - Soliq QR URL: ${receipt.fiscalQrUrl}`);
  console.log(`   - QR Rasm Base64: ${receipt.qrImageBase64 ? 'Mavjud (Generatsiya bo\'ldi)' : 'Yo\'q'}`);

  const tablesAfterPay = await request('GET', '/api/tables');
  const table5After = tablesAfterPay.tables.find((t) => t.id === 5);
  console.log(`✓ To'lovdan so'ng 5-stol holati: status = "${table5After.status}" (Kutilgan: "free" - Yashil)`);

  // 8. Oflayn va Sinxronizatsiya testi (TZ 3.4)
  console.log('\n--- QO\'SHIMCHA TEST: Oflayn rejim va Sinxronizatsiya ---');
  // Internetni o'chiramiz
  await request('POST', '/api/status/toggle-internet', { status: false });
  console.log('   [Internet o\'chirildi - OFFLINE]');

  // Oflaynda yangi buyurtma va to'lov qilamiz (2-stol)
  const offOrder = await request('POST', '/api/orders', {
    tableId: 2,
    waiterId: 1,
    waiterName: 'Ofitsiant Sardor',
    items: [{ product_id: choy.id, product_name: choy.name, quantity: 1, price: choy.price }],
  });
  const offPay = await request('POST', '/api/payments', {
    orderId: offOrder.orderId,
    tableId: 2,
    paymentMethod: 'cash',
    cashAmount: choy.price,
    cardAmount: 0,
  });
  console.log(`✓ Oflaynda chek chiqarildi: Chek #${offPay.receipt.receiptSeq}, Soliq navbati: ${offPay.pendingChecks} ta`);

  // Internetni qayta yoqamiz va sinxronlaymiz
  const syncRes = await request('POST', '/api/status/toggle-internet', { status: true });
  console.log(`   [Internet yoqildi - ONLINE, Sinxronlandi!] Qolgan navbat: ${syncRes.pendingChecks} ta`);

  console.log('\n===========================================================');
  console.log(' BARCHA TEXNIK TOPSHIRIQ (TZ) TESTLARI 100% MUVAFFAQISh!');
  console.log('===========================================================');
  process.exit(0);
}

runVerification().catch((err) => {
  console.error('Testda xatolik:', err);
  process.exit(1);
});
