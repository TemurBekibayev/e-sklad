const { exec } = require('child_process');
const http = require('http');

function checkServer(callback) {
  http
    .get('http://localhost:4000/api/status', (res) => {
      if (res.statusCode === 200) callback(true);
      else callback(false);
    })
    .on('error', () => callback(false));
}

checkServer((isRunning) => {
  if (!isRunning) {
    console.log('[KafePOS] Server ishga tushirilmoqda...');
    require('../server/index.js');
  } else {
    console.log('[KafePOS] Server allaqachon port 4000 da ishlab turibdi.');
  }

  // Desktop App Kiosk rejimida oynani ochish
  setTimeout(() => {
    console.log('======================================================');
    console.log('  KafePOS Desktop App oynasi ochilmoqda...            ');
    console.log('  Manzil: http://localhost:4000                      ');
    console.log('======================================================');

    const cmd =
      process.platform === 'win32'
        ? 'start msedge --app=http://localhost:4000 --window-size=1280,850'
        : 'open -a "Google Chrome" --args --app=http://localhost:4000';

    exec(cmd, (err) => {
      if (err) {
        // Zaxira usul: oddiy brauzerda ochish
        exec('start http://localhost:4000');
      }
    });
  }, 1000);
});
