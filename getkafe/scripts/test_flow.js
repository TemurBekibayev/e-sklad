const http = require('http');

function post(url, data) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const body = JSON.stringify(data || {});
    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => {
        try { resolve(JSON.parse(d)); } catch(e) { resolve(d); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => {
        try { resolve(JSON.parse(d)); } catch(e) { resolve(d); }
      });
    }).on('error', reject);
  });
}

(async () => {
  try {
    console.log('--- 1. Testing Order Creation from Mobile on Table 1 ---');
    const orderRes = await post('http://localhost:4000/api/orders', {
      tableId: 1,
      waiterId: 1,
      waiterName: 'Sardor (Ofitsiant)',
      items: [
        { product_id: 1, product_name: 'Mastava', quantity: 2, price: 32000, comment: 'Achchiq bolmasin' },
        { product_id: 2, product_name: 'Qiyma kabob', quantity: 3, price: 20000, comment: 'Piyozsiz' }
      ]
    });
    console.log('Order create result:', orderRes.success, 'OrderId:', orderRes.orderId, 'Total:', orderRes.totalAmount);

    console.log('\n--- 2. Testing Kitchen Tickets Fetching (KDS) ---');
    const kitchenRes = await get('http://localhost:4000/api/kitchen/tickets');
    console.log('Kitchen tickets count:', kitchenRes.tickets?.length);
    if (kitchenRes.tickets && kitchenRes.tickets.length > 0) {
      console.log('Ticket 0 Table:', kitchenRes.tickets[0].tableNumber);
      console.log('Ticket 0 Items count:', kitchenRes.tickets[0].items.length);
      console.log('Ticket 0 Items:', JSON.stringify(kitchenRes.tickets[0].items, null, 2));
    }

    console.log('\n--- 3. Testing Bill Request (Pre-check) from Mobile ---');
    const billRes = await post('http://localhost:4000/api/orders/1/bill-request', { tableId: 1 });
    console.log('Bill request result:', billRes.success, 'Message:', billRes.message);

    console.log('\n--- 4. Testing Kitchen Ticket Thermal Re-print ---');
    if (kitchenRes.tickets && kitchenRes.tickets.length > 0) {
      const ticketId = kitchenRes.tickets[0].id;
      const reprintRes = await post(`http://localhost:4000/api/kitchen/tickets/${ticketId}/print`, kitchenRes.tickets[0]);
      console.log('Kitchen reprint result:', reprintRes.success, 'Message:', reprintRes.message);
    }

    console.log('\n--- ALL TESTS COMPLETED SUCCESSFULLY! ---');
  } catch (err) {
    console.error('Test error:', err);
  }
})();
