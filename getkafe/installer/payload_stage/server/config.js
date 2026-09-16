const path = require('path');
const fs = require('fs');

// .env faylidan o'qish (agar mavjud bo'lsa)
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...rest] = trimmed.split('=');
      const val = rest.join('=').trim().replace(/^["']|["']$/g, '');
      if (key && val) {
        process.env[key.trim()] = val;
      }
    }
  });
}

const config = {
  port: process.env.PORT || 4000,

  // Tashqi Backend API sozlamalari (Foydalanuvchi taqdim etadigan API)
  externalBackend: {
    enabled: process.env.USE_EXTERNAL_API === 'true',
    baseUrl: process.env.EXTERNAL_API_BASE_URL || '',
    token: process.env.EXTERNAL_API_TOKEN || '',
    apiKey: process.env.EXTERNAL_API_KEY || '',
  },

  // Kompaniya rekvizitlari (Soliq.uz)
  company: {
    name: process.env.COMPANY_NAME || 'GETPOS KAFE MCHJ',
    inn: process.env.COMPANY_INN || '307849201',
    terminalId: process.env.TERMINAL_ID || 'EP108492',
    fiscalModuleId: process.env.FISCAL_MODULE_ID || 'FM99882211',
    address: process.env.COMPANY_ADDRESS || 'Toshkent sh., Chilonzor tumani, 9-mavze',
  },
};

module.exports = config;
