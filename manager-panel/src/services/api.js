const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws/tenant/baskets';

const getHeaders = () => {
  const token = localStorage.getItem('sotuvpro_access_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

export const api = {
  // Base request handler
  async request(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const headers = { ...getHeaders(), ...options.headers };
    
    const response = await fetch(url, { ...options, headers });
    
    if (response.status === 401) {
      // Clear token and notify app to redirect to Login
      localStorage.removeItem('sotuvpro_access_token');
      window.dispatchEvent(new Event('sotuvpro_unauthorized'));
    }
    
    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw {
        status: response.status,
        message: errBody.message || (Object.keys(errBody).length ? JSON.stringify(errBody) : `API Error (${response.status})`)
      };
    }
    
    return response.json();
  },

  // 1. Auth API
  async login(payload) {
    // payload can be: { email, password } OR { pin }
    return this.request('/auth/login/', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async refreshToken(refresh) {
    return this.request('/auth/refresh/', {
      method: 'POST',
      body: JSON.stringify({ refresh })
    });
  },

  // 2. Sklad (Products) API
  async getProducts() {
    return this.request('/products/');
  },

  async getStockMovements(productId) {
    return this.request(`/products/${productId}/stock-movements/`);
  },

  async createProduct(data) {
    return this.request('/products/', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async addStock(productId, amount, reason) {
    return this.request(`/products/${productId}/stock-movements/`, {
      method: 'POST',
      body: JSON.stringify({
        type: 'kirim',
        purchase_unit_amount: Number(amount),
        reason
      })
    });
  },

  async correctStock(productId, amount, reason) {
    return this.request(`/products/${productId}/stock-movements/`, {
      method: 'POST',
      body: JSON.stringify({
        type: 'tuzatish',
        sale_unit_amount: Number(amount),
        reason
      })
    });
  },

  async updateProductPrice(productId, newPrice) {
    return this.request(`/products/${productId}/`, {
      method: 'PUT',
      body: JSON.stringify({
        price_per_sale_unit: Number(newPrice)
      })
    });
  },

  async archiveProduct(productId) {
    return this.request(`/products/${productId}/`, {
      method: 'PATCH',
      body: JSON.stringify({ archived: true })
    });
  },

  async deleteProduct(productId) {
    return this.request(`/products/${productId}/`, {
      method: 'DELETE'
    });
  },

  // 3. Sales & Baskets API
  async completeSale(basketId, data) {
    // data includes: payment_method, cash_amount, card_amount, debt_amount, client_name, client_phone, due_date
    return this.request(`/baskets/${basketId}/finalize/`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async approveTransaction(txId) {
    return this.request(`/transactions/${txId}/approve/`, {
      method: 'POST'
    });
  },

  async refundTransaction(txId, reason) {
    return this.request(`/transactions/${txId}/refund/`, {
      method: 'POST',
      body: JSON.stringify({ refund_reason: reason })
    });
  },

  async getTransactions() {
    return this.request('/transactions/');
  },

  async getTenantDetails(tenantId) {
    return this.request(`/tenants/${tenantId}/`);
  },

  async getBillingSummary() {
    return this.request('/tenants/billing-summary/');
  },

  // 4. Debts API
  async getDebtors(search = '', isOverdue = false) {
    let query = '';
    const params = [];
    if (search) params.push(`search=${encodeURIComponent(search)}`);
    if (isOverdue) params.push('is_overdue=true');
    if (params.length > 0) query = `?${params.join('&')}`;
    
    return this.request(`/debts/${query}`);
  },

  async payDebt(debtId, amount, notes = '') {
    return this.request(`/debts/${debtId}/payments/`, {
      method: 'POST',
      body: JSON.stringify({
        amount: Number(amount),
        payment_method: 'cash',
        notes
      })
    });
  },

  async sendSMSReminder(debtId) {
    return this.request(`/debts/${debtId}/send-sms/`, {
      method: 'POST'
    });
  },

  async sendPhoneVerificationCode(phone, clientName = '') {
    return this.request('/debts/verify-phone/send-code/', {
      method: 'POST',
      body: JSON.stringify({
        phone,
        client_name: clientName
      })
    });
  },

  async checkPhoneVerificationCode(phone, code) {
    return this.request('/debts/verify-phone/check-code/', {
      method: 'POST',
      body: JSON.stringify({
        phone,
        code
      })
    });
  },

  // 5. Employees API
  async getEmployees() {
    return this.request('/users/');
  },

  async createEmployee(data) {
    return this.request('/users/', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        role: 'worker'
      })
    });
  },

  async updateEmployee(employeeId, data) {
    return this.request(`/users/${employeeId}/`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  async setEmployeeDebtPermission(employeeId, canSellOnDebt, maxDebtLimit) {
    return this.request(`/users/${employeeId}/set-debt-permission/`, {
      method: 'POST',
      body: JSON.stringify({
        can_sell_on_debt: canSellOnDebt,
        max_debt_limit: maxDebtLimit
      })
    });
  },

  // 6. Reports API
  async getSalesReport(from, to) {
    return this.request(`/reports/sales/?from=${from}&to=${to}`);
  },

  async getEmployeesReport(from, to) {
    return this.request(`/reports/by-worker/?from=${from}&to=${to}`);
  },

  async getLowStockReport() {
    return this.request('/reports/low-stock/');
  },

  // 7. WebSocket connection helper
  createBasketWebSocket(onMessageCallback) {
    const token = localStorage.getItem('sotuvpro_access_token');
    if (!token) return null;
    
    const socket = new WebSocket(`${WS_BASE_URL}/?token=${token}`);
    
    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        onMessageCallback(payload);
      } catch (err) {
        console.error('WS parse error:', err);
      }
    };
    
    socket.onerror = (err) => {
      console.error('WS connection error:', err);
    };
    
    return socket;
  }
};
