const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const http = require('http');

let mainWindow = null;
let serverStarted = false;

// Kassa lokal serverini yuklash
function startBackendServer() {
  if (!serverStarted) {
    serverStarted = true;
    try {
      require('../server/index.js');
      console.log('[KafePOS Desktop] Lokal server fon rejimida muvaffaqiyatli ishga tushirildi');
    } catch (e) {
      console.error('[KafePOS Desktop] Serverni ishga tushirishda xatolik:', e);
    }
  }
}

// Server porti tayyor bo'lishini kutish
function waitForServer(callback) {
  const check = () => {
    http
      .get('http://localhost:4000/api/status', (res) => {
        if (res.statusCode === 200) {
          callback();
        } else {
          setTimeout(check, 300);
        }
      })
      .on('error', () => {
        setTimeout(check, 300);
      });
  };
  check();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    title: 'KafePOS - Kassa va Avtomatlashtirish Tizimi',
    backgroundColor: '#020617',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Sensorli ekranlar uchun maksimal oyna
  mainWindow.maximize();

  // Menyu panelini olib tashlash (POS Kiosk ko'rinishi)
  Menu.setApplicationMenu(null);

  mainWindow.loadURL('http://localhost:4000');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  startBackendServer();
  waitForServer(() => {
    createWindow();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
