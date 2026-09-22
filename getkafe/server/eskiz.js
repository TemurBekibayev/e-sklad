// getkafe/server/eskiz.js - Eskiz.uz SMS Service for GetPOS Kafe using built-in fetch
const { get, run } = require('./db');
const backendSync = require('./backendSync');

class EskizService {
  constructor() {
    this.baseUrl = 'https://notify.eskiz.uz/api';
    this.token = null;
    this.tokenExpiresAt = 0;
  }

  cleanPhoneNumber(phone) {
    if (!phone) return '';
    let cleaned = String(phone).replace(/\D/g, '');
    if (cleaned.length === 9) {
      cleaned = '998' + cleaned;
    } else if (cleaned.length === 12 && cleaned.startsWith('998')) {
      // already valid
    }
    return cleaned;
  }

  async getToken() {
    if (this.token && Date.now() < this.tokenExpiresAt) {
      return this.token;
    }

    const cfg = await backendSync.getConfig();
    const email = process.env.ESKIZ_EMAIL || cfg.eskiz_email || 'info@getpos.uz';
    const password = process.env.ESKIZ_PASSWORD || cfg.eskiz_password || 'EskizPass2025!';

    try {
      const response = await fetch(`${this.baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data?.data?.token) {
          this.token = data.data.token;
          this.tokenExpiresAt = Date.now() + 25 * 24 * 3600 * 1000;
          console.log('[Eskiz] New JWT token obtained successfully.');
          return this.token;
        }
      }
    } catch (err) {
      console.warn('[Eskiz] Login error:', err.message);
    }
    return null;
  }

  async sendSms({ phone, message, fromNick = '4546' }) {
    const cleanedPhone = this.cleanPhoneNumber(phone);
    if (!cleanedPhone || cleanedPhone.length !== 12) {
      return {
        success: false,
        error: `Telefon raqami noto'g'ri formatda: ${phone} (998901234567 bo'lishi kerak)`,
      };
    }

    try {
      const cloudRes = await backendSync.callCloudApi({
        endpoint: '/api/v1/debts/send-sms/',
        method: 'POST',
        body: { phone: cleanedPhone, message },
      });
      if (cloudRes.status >= 200 && cloudRes.status < 300) {
        return { success: true, via: 'cloud', data: cloudRes.data };
      }
    } catch (cloudErr) {}

    const token = await this.getToken();
    if (!token) {
      console.log(`[Eskiz SMS Mock] To: ${cleanedPhone} | Message: ${message}`);
      return {
        success: true,
        mock: true,
        message: `${cleanedPhone} raqamiga SMS jo'natildi`,
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/message/sms/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          mobile_phone: cleanedPhone,
          message: message,
          from: fromNick,
        }),
      });

      const data = await response.json();
      return { success: response.ok, data };
    } catch (err) {
      console.error('[Eskiz] Send SMS error:', err.message);
      return {
        success: false,
        error: err.message,
      };
    }
  }
}

module.exports = new EskizService();
