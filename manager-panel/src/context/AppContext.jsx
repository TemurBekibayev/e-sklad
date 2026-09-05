import React, { createContext, useState, useEffect } from 'react';
import { translations } from './translations';
import { api } from '../services/api';

export const AppContext = createContext();

// XSS Sanitization Helper (escaping inputs)
export const escapeHtml = (str) => {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// Initial Seed Products
const initialProducts = [];

// Initial Seed Debtors
const initialDebts = [];

// Initial Seed Employees
const initialEmployees = [];

// Initial Active Baskets
const initialBaskets = [];

export const AppProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => localStorage.getItem('sotuvpro_lang') || 'uz');
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('sotuvpro_access_token');
    const saved = localStorage.getItem('sotuvpro_user');
    return (token && saved) ? JSON.parse(saved) : null;
  });

  const [products, setProducts] = useState(() => {
    const token = localStorage.getItem('sotuvpro_access_token');
    const saved = localStorage.getItem('sotuvpro_products');
    return (token && saved) ? JSON.parse(saved) : [];
  });

  const [debts, setDebts] = useState(() => {
    const token = localStorage.getItem('sotuvpro_access_token');
    const saved = localStorage.getItem('sotuvpro_debts');
    return (token && saved) ? JSON.parse(saved) : [];
  });

  const [employees, setEmployees] = useState(() => {
    const token = localStorage.getItem('sotuvpro_access_token');
    const saved = localStorage.getItem('sotuvpro_employees');
    return (token && saved) ? JSON.parse(saved) : [];
  });

  const [baskets, setBaskets] = useState(() => {
    const token = localStorage.getItem('sotuvpro_access_token');
    const saved = localStorage.getItem('sotuvpro_baskets');
    return (token && saved) ? JSON.parse(saved) : [];
  });

  const [transactions, setTransactions] = useState(() => {
    const token = localStorage.getItem('sotuvpro_access_token');
    const saved = localStorage.getItem('sotuvpro_transactions');
    return (token && saved) ? JSON.parse(saved) : [];
  });

  const [auditLogs, setAuditLogs] = useState(() => {
    const saved = localStorage.getItem('sotuvpro_audit_logs');
    return saved ? JSON.parse(saved) : [
      { id: '1', time: '17:00:00 24.08.2026', action: 'Tizim ishga tushdi', details: 'Do\'kon boshqaruv paneli yuklandi' }
    ];
  });

  const [notifications, setNotifications] = useState([
    { id: '1', title: 'Sement M-500', body: 'Qoldiq 8 qop qoldi. Tezda to\'ldiring!' }
  ]);

  const [tenantDetails, setTenantDetails] = useState(() => {
    const saved = localStorage.getItem('sotuvpro_tenant_details');
    return saved ? JSON.parse(saved) : null;
  });

  const [billingSummary, setBillingSummary] = useState(() => {
    const saved = localStorage.getItem('sotuvpro_billing_summary');
    return saved ? JSON.parse(saved) : {
      billing_period: 'Joriy oy',
      sms_used_count: 0,
      sms_unit_price: 100,
      sms_total_cost: 0,
      subscription_monthly_fee: 250000,
      total_due_amount: 250000,
      currency: 'UZS'
    };
  });

  const t = (key) => {
    return translations[language][key] || key;
  };

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('sotuvpro_lang', language);
  }, [language]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('sotuvpro_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('sotuvpro_user');
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem('sotuvpro_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('sotuvpro_debts', JSON.stringify(debts));
  }, [debts]);

  useEffect(() => {
    localStorage.setItem('sotuvpro_employees', JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    localStorage.setItem('sotuvpro_baskets', JSON.stringify(baskets));
  }, [baskets]);

  useEffect(() => {
    localStorage.setItem('sotuvpro_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('sotuvpro_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    if (tenantDetails) {
      localStorage.setItem('sotuvpro_tenant_details', JSON.stringify(tenantDetails));
    } else {
      localStorage.removeItem('sotuvpro_tenant_details');
    }
  }, [tenantDetails]);

  // Auth Unauthorized redirect listener
  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
    };
    window.addEventListener('sotuvpro_unauthorized', handleUnauthorized);
    return () => window.removeEventListener('sotuvpro_unauthorized', handleUnauthorized);
  }, []);

  // API Data Sync on Login & Auto-Sync
  useEffect(() => {
    if (user) {
      // 1. Initial load
      loadDataFromServer();

      // 2. Periodic background auto-sync (every 15 seconds)
      const syncInterval = setInterval(() => {
        loadDataFromServer();
      }, 15000);

      // 3. Auto-sync when window gains focus (switching back to tab)
      const handleWindowFocus = () => {
        loadDataFromServer();
      };
      window.addEventListener('focus', handleWindowFocus);

      // 4. Establish live WebSocket connection
      const socket = api.createBasketWebSocket((message) => {
        if (message.event === 'basket:update') {
          const updated = message.data;
          setBaskets(prev => {
            const index = prev.findIndex(b => b.id === updated.basket_id);
            const mapped = {
              id: updated.basket_id,
              employeeId: updated.worker_id,
              employeeName: updated.worker_name,
              clientName: updated.client_name,
              itemsCount: updated.items_count,
              items: updated.items || [],
              total: Number(updated.total_amount)
            };
            if (index !== -1) {
              return prev.map((b, i) => i === index ? { ...b, ...mapped } : b);
            } else {
              return [...prev, mapped];
            }
          });
        }
      });

      return () => {
        clearInterval(syncInterval);
        window.removeEventListener('focus', handleWindowFocus);
        if (socket) socket.close();
      };
    }
  }, [user]);

  // Load datasets from backend
  const loadDataFromServer = async () => {
    try {
      const serverProducts = await api.getProducts();
      const productsList = Array.isArray(serverProducts) ? serverProducts : (serverProducts?.results || []);
      setProducts(productsList.map(p => ({
        id: p.id,
        name: p.name,
        kUnit: p.purchase_unit,
        sUnit: p.sale_unit,
        coeff: p.conversion_factor,
        price: p.price_per_sale_unit,
        stock: p.current_stock,
        minStock: p.low_stock_threshold,
        barcode: p.barcode,
        archived: p.archived
      })));
    } catch (e) {
      console.warn("Could not load products from API, offline fallback mode active", e);
    }
    
    try {
      const serverDebts = await api.getDebtors();
      const debtsList = Array.isArray(serverDebts) ? serverDebts : (serverDebts?.results || []);
      setDebts(debtsList.map(d => ({
        id: d.id,
        name: d.client_name,
        phone: d.client_phone,
        amount: Number(d.remaining_debt),
        lastPaymentDate: d.due_date,
        status: d.is_overdue ? 'overdue' : 'on_time',
        isPhoneVerified: Boolean(d.is_phone_verified),
        verifiedAt: d.verified_at,
        lastSmsSentAt: d.last_sms_sent_at
      })));
    } catch (e) {
      console.warn("Could not load debts from API, offline fallback mode active", e);
    }

    try {
      const serverEmployees = await api.getEmployees();
      const employeesList = Array.isArray(serverEmployees) ? serverEmployees : (serverEmployees?.results || []);
      setEmployees(employeesList.map(e => ({
        id: e.id,
        name: e.name,
        pin: e.pin,
        phone: e.phone_number,
        role: e.role === 'worker' ? 'Sotuvchi-kassir' : 'Menejer',
        active: e.is_active,
        canSellOnDebt: Boolean(e.can_sell_on_debt),
        maxDebtLimit: Number(e.max_debt_limit || 1500000),
        salesCount: e.sales_count || 0,
        salesAmount: e.sales_amount || 0,
        online: e.online || false,
        lastSeen: e.last_seen || null
      })));
    } catch (e) {
      console.warn("Could not load employees from API, offline fallback mode active", e);
    }

    try {
      const serverTransactions = await api.getTransactions();
      const txList = Array.isArray(serverTransactions) ? serverTransactions : (serverTransactions?.results || []);
      setTransactions(txList.map(t => ({
        id: t.id,
        employeeName: t.finalized_by_name || t.worker_name || 'Kassir',
        date: t.created_at ? new Date(t.created_at).toLocaleString('uz-UZ') : '',
        amount: Number(t.total_amount || 0),
        total: Number(t.total_amount || 0),
        totalAmount: Number(t.total_amount || 0),
        type: t.payment_method || 'cash',
        clientName: t.client_name || '',
        debtorName: t.client_name || '',
        clientPhone: t.client_phone || '',
        status: t.status || 'completed'
      })));
    } catch (e) {
      console.warn("Could not load transactions from API", e);
    }

    try {
      const billing = await api.getBillingSummary();
      if (billing) {
        setBillingSummary(billing);
        localStorage.setItem('sotuvpro_billing_summary', JSON.stringify(billing));
      }
    } catch (e) {
      console.warn("Could not load billing summary from API", e);
    }

    const token = localStorage.getItem('sotuvpro_access_token');
    const savedUser = localStorage.getItem('sotuvpro_user');
    const currentUser = (token && savedUser) ? JSON.parse(savedUser) : user;
    if (currentUser && currentUser.tenantId) {
      try {
        const details = await api.getTenantDetails(currentUser.tenantId);
        setTenantDetails(details);
      } catch (e) {
        console.warn("Could not load tenant details from API", e);
      }
    }
  };

  // Login handler with API support and simulated fallback
  const login = async (email, password, isPin = false) => {
    const trimmedEmail = email.trim();

    try {
      const res = await api.login(isPin ? { email: trimmedEmail, pin: password } : { email: trimmedEmail, password });
      if (res && res.access) {
        localStorage.setItem('sotuvpro_access_token', res.access);
        if (res.refresh) {
          localStorage.setItem('sotuvpro_refresh_token', res.refresh);
        }
        setUser({
          name: res.user.name,
          email: res.user.email,
          role: res.user.role,
          tenantId: res.user.tenant_id
        });
        addAuditLog('Tizimga kirildi', `Foydalanuvchi: ${res.user.name}`);
        return true;
      }
    } catch (err) {
      console.warn('API login failed, attempting local fallback...', err);
      // Fallback local auth
      if (isPin) {
        const emp = employees.find(e => e.pin === password && e.active);
        if (emp) {
          setUser({ name: emp.name, email: `${emp.id}@sotuvpro.uz`, role: 'manager' });
          addAuditLog('Tizimga kirildi (Offline)', `PIN orqali: ${emp.name}`);
          return true;
        }
      } else {
        if (email === 'manager@sotuvpro.uz' && password === '12345678') {
          setUser({ name: 'Akmal Shodiyev', email, role: 'manager' });
          addAuditLog('Tizimga kirildi (Offline)', `Email orqali: Akmal Shodiyev`);
          return true;
        }
      }
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem('sotuvpro_access_token');
    localStorage.removeItem('sotuvpro_refresh_token');
    localStorage.removeItem('sotuvpro_tenant_details');
    setTenantDetails(null);
    setUser(null);
  };

  // Sklad Boshqaruvi
  const addProduct = async (product) => {
    const data = {
      name: escapeHtml(product.name),
      purchase_unit: escapeHtml(product.kUnit),
      sale_unit: escapeHtml(product.sUnit),
      conversion_factor: Number(product.coeff),
      price_per_sale_unit: Number(product.price),
      current_stock: 0.0,
      low_stock_threshold: Number(product.minStock),
      barcode: Math.floor(10000000 + Math.random() * 90000000).toString()
    };

    try {
      await api.createProduct(data);
      loadDataFromServer();
    } catch (e) {
      console.warn("Product could not be saved to API, saving offline", e);
      const newProduct = {
        id: Date.now().toString(),
        stock: 0,
        archived: false,
        barcode: data.barcode,
        ...product,
        name: data.name,
        kUnit: data.purchase_unit,
        sUnit: data.sale_unit
      };
      setProducts(prev => [...prev, newProduct]);
      addAuditLog('Yangi mahsulot (Offline)', `Nomi: ${newProduct.name}`);
    }
  };

  const updateProductPrice = async (productId, newPrice) => {
    try {
      await api.updateProductPrice(productId, newPrice);
      loadDataFromServer();
    } catch (e) {
      console.warn("Price could not be updated on API, updating offline", e);
      setProducts(prev => prev.map(p => {
        if (p.id === productId) {
          addAuditLog('Narx o\'zgartirildi (Offline)', `${p.name}: ${p.price} -> ${newPrice}`);
          return { ...p, price: Number(newPrice) };
        }
        return p;
      }));
    }
  };

  const addStockMovement = async (productId, qtyKelish, comment = '') => {
    try {
      await api.addStock(productId, qtyKelish, comment);
      loadDataFromServer();
    } catch (e) {
      console.warn("Stock movement could not be saved to API, saving offline", e);
      const product = products.find(p => p.id === productId);
      if (!product) return;
      const addedDona = Number(qtyKelish) * product.coeff;
      const sanitizedComment = escapeHtml(comment);
      setProducts(prev => prev.map(p => {
        if (p.id === productId) {
          return { ...p, stock: p.stock + addedDona };
        }
        return p;
      }));
      addAuditLog('Sklad kirimi (Offline)', `${product.name}: +${qtyKelish} ${product.kUnit} (+${addedDona} ${product.sUnit})${sanitizedComment ? ' - ' + sanitizedComment : ''}`);
    }
  };

  const correctStock = async (productId, newQty, reason) => {
    try {
      await api.correctStock(productId, newQty, reason);
      loadDataFromServer();
    } catch (e) {
      console.warn("Stock correction could not be saved to API, saving offline", e);
      const product = products.find(p => p.id === productId);
      if (!product) return;
      const sanitizedReason = escapeHtml(reason);
      setProducts(prev => prev.map(p => {
        if (p.id === productId) {
          return { ...p, stock: Number(newQty) };
        }
        return p;
      }));
      addAuditLog('Qoldiqni to\'g\'rilash (Offline)', `${product.name} qoldig'i: ${product.stock} -> ${newQty}. Sabab: ${sanitizedReason}`);
    }
  };

  const archiveProduct = async (productId) => {
    try {
      await api.archiveProduct(productId);
      loadDataFromServer();
    } catch (e) {
      console.warn("Product could not be archived on API, archiving offline", e);
      setProducts(prev => prev.map(p => {
        if (p.id === productId) {
          return { ...p, archived: true };
        }
        return p;
      }));
      addAuditLog('Mahsulot arxivlandi (Offline)', `ID: ${productId}`);
    }
  };

  const deleteProduct = async (productId) => {
    try {
      await api.deleteProduct(productId);
      loadDataFromServer();
      addAuditLog('Mahsulot o\'chirildi', `ID: ${productId}`);
    } catch (e) {
      console.warn("Product could not be deleted on API, deleting offline", e);
      setProducts(prev => prev.filter(p => p.id !== productId));
      addAuditLog('Mahsulot o\'chirildi (Offline)', `ID: ${productId}`);
    }
  };

  const getStockMovements = async (productId) => {
    try {
      const res = await api.getStockMovements(productId);
      return Array.isArray(res) ? res : (res?.results || []);
    } catch (e) {
      console.warn("Could not load stock movements from API", e);
      return [];
    }
  };

  // Savatni yakunlash
  const completeSale = async (basketId, paymentType, details = {}) => {
    const apiData = {
      payment_method: paymentType,
      cash_amount: paymentType === 'cash' || paymentType === 'mixed' ? Number(details.cashAmount || 0) : 0,
      card_amount: paymentType === 'card' ? Number(details.cashAmount || 0) : 0,
      debt_amount: paymentType === 'debt' ? Number(details.debtAmount || 0) : (details.debtAmount || 0),
      discount_amount: details.discountAmount || 0,
      client_name: details.debtorName || '',
      client_phone: details.phone || '',
      due_date: '2026-09-15'
    };

    try {
      await api.completeSale(basketId, apiData);
      loadDataFromServer();
    } catch (e) {
      console.warn("Sale could not be finalized on API, finalizing offline", e);
      const basket = baskets.find(b => b.id === basketId);
      if (!basket) return;

      const oraliq = basket.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const chegirma = basket.discountPercent ? Math.round(oraliq * (basket.discountPercent / 100)) : 0;
      const yakuniy = oraliq - chegirma;

      setProducts(prev => prev.map(p => {
        const item = basket.items.find(i => i.productId === p.id);
        if (item) {
          return { ...p, stock: Math.max(0, p.stock - item.quantity) };
        }
        return p;
      }));

      const escapedDebtorName = details.debtorName ? escapeHtml(details.debtorName) : '';
      const escapedPhone = details.phone ? escapeHtml(details.phone) : '';

      if (paymentType === 'debt') {
        addDebt(escapedDebtorName, escapedPhone, yakuniy);
      } else if (paymentType === 'mixed') {
        const { debtAmount } = details;
        if (debtAmount > 0) {
          addDebt(escapedDebtorName, escapedPhone, debtAmount);
        }
      }

      const newTx = {
        id: `tx_${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        total: yakuniy,
        type: paymentType,
        discount: chegirma,
        items: basket.items,
        debtorName: escapedDebtorName || null,
        debtAmount: details.debtAmount || 0,
        cashAmount: details.cashAmount || 0,
        employeeName: basket.employeeName
      };

      setTransactions(prev => [newTx, ...prev]);

      setEmployees(prev => prev.map(emp => {
        if (emp.id === basket.employeeId) {
          return { ...emp, salesCount: emp.salesCount + 1, salesAmount: emp.salesAmount + yakuniy };
        }
        return emp;
      }));

      setBaskets(prev => prev.filter(b => b.id !== basketId));
      addAuditLog('Savdo yakunlandi (Offline)', `Savat: ${basketId}, Summa: ${yakuniy.toLocaleString()} UZS, To'lov: ${paymentType}`);
    }
  };

  const refundTransaction = async (txId) => {
    try {
      await api.refundTransaction(txId, "Voz kechilgan savdo");
      loadDataFromServer();
    } catch (e) {
      console.warn("Transaction could not be refunded on API, refunding offline", e);
      const tx = transactions.find(t => t.id === txId);
      if (!tx) return;

      setProducts(prev => prev.map(p => {
        const item = tx.items.find(i => i.productId === p.id);
        if (item) {
          return { ...p, stock: p.stock + item.quantity };
        }
        return p;
      }));

      if (tx.type === 'debt' && tx.debtorName) {
        reduceDebtByName(tx.debtorName, tx.total);
      } else if (tx.type === 'mixed' && tx.debtorName && tx.debtAmount > 0) {
        reduceDebtByName(tx.debtorName, tx.debtAmount);
      }

      setTransactions(prev => prev.filter(t => t.id !== txId));
      addAuditLog('Savdo qaytarildi (Offline)', `Tranzaksiya: ${txId}, Summa: ${tx.total.toLocaleString()} UZS`);
    }
  };

  const addDebt = (name, phone, amount) => {
    setDebts(prev => {
      const existing = prev.find(d => d.name.toLowerCase() === name.toLowerCase());
      if (existing) {
        return prev.map(d => {
          if (d.id === existing.id) {
            return { ...d, amount: d.amount + amount, status: 'overdue', lastPaymentDate: new Date().toISOString().split('T')[0] };
          }
          return d;
        });
      } else {
        return [
          ...prev,
          {
            id: Date.now().toString(),
            name,
            phone,
            amount,
            lastPaymentDate: new Date().toISOString().split('T')[0],
            status: 'overdue'
          }
        ];
      }
    });
  };

  const reduceDebtByName = (name, amount) => {
    setDebts(prev => prev.map(d => {
      if (d.name.toLowerCase() === name.toLowerCase()) {
        const newAmount = Math.max(0, d.amount - amount);
        return { ...d, amount: newAmount, status: newAmount === 0 ? 'on_time' : d.status };
      }
      return d;
    }).filter(d => d.amount > 0));
  };

  const payDebt = async (debtId, payAmount) => {
    try {
      await api.payDebt(debtId, payAmount, 'Debt paid');
      loadDataFromServer();
    } catch (e) {
      console.warn("Debt payment could not be saved to API, saving offline", e);
      setDebts(prev => {
        return prev.map(d => {
          if (d.id === debtId) {
            const newAmount = Math.max(0, d.amount - Number(payAmount));
            addAuditLog('Qarz to\'landi (Offline)', `${d.name}: -${payAmount} UZS (Qoldiq qarz: ${newAmount})`);
            return {
              ...d,
              amount: newAmount,
              status: newAmount === 0 ? 'on_time' : d.status,
              lastPaymentDate: new Date().toISOString().split('T')[0]
            };
          }
          return d;
        }).filter(d => d.amount > 0);
      });
    }
  };

  const sendSMS = async (debtId) => {
    try {
      await api.sendSMSReminder(debtId);
      addAuditLog('SMS yuborildi', `Qarzdor ID: ${debtId}`);
      alert("SMS eslatma server orqali muvaffaqiyatli jo'natildi!");
      loadDataFromServer();
    } catch (e) {
      console.warn("SMS could not be sent via API, sending offline", e);
      const debt = debts.find(d => d.id === debtId);
      if (!debt) return;
      alert(`[SMS-Shlyuz] SMS yuborildi: \nKimga: ${debt.name} (${debt.phone})\nMatn: "Hurmatli ${debt.name}, 'SotuvPro' do'konidan ${debt.amount.toLocaleString()} UZS miqdoridagi qarzingizni yopishingizni so'raymiz."`);
      addAuditLog('SMS yuborildi (Offline)', `Qarzdor: ${debt.name}, Telefon: ${debt.phone}`);
    }
  };

  const sendPhoneVerification = async (phone, clientName = '') => {
    try {
      const res = await api.sendPhoneVerificationCode(phone, clientName);
      addAuditLog('SMS Tasdiqlash kodi yuborildi', `Raqam: ${phone}, Mijoz: ${clientName || 'Noma\'lum'}`);
      loadDataFromServer();
      return res;
    } catch (e) {
      console.warn("SMS verification failed", e);
      throw e;
    }
  };

  const checkPhoneVerification = async (phone, code) => {
    try {
      const res = await api.checkPhoneVerificationCode(phone, code);
      addAuditLog('Telefon raqam tasdiqlandi', `Raqam: ${phone}`);
      return res;
    } catch (e) {
      console.warn("Phone verification check failed", e);
      throw e;
    }
  };

  // Xodimlarni boshqarish
  const addEmployee = async (name, phone, pin, role, canSellOnDebt = false, maxDebtLimit = 1500000) => {
    const data = {
      name: escapeHtml(name),
      phone_number: phone,
      pin,
      role: role === 'Sotuvchi-kassir' ? 'worker' : 'manager',
      can_sell_on_debt: canSellOnDebt,
      max_debt_limit: Number(maxDebtLimit)
    };

    try {
      await api.createEmployee(data);
      loadDataFromServer();
    } catch (e) {
      console.warn("Employee could not be saved to API, saving offline", e);
      const newEmp = {
        id: Date.now().toString(),
        name: data.name,
        phone: phone,
        pin,
        role: role,
        active: true,
        canSellOnDebt: canSellOnDebt,
        maxDebtLimit: Number(maxDebtLimit),
        salesCount: 0,
        salesAmount: 0,
        online: false,
        lastSeen: 'hech qachon'
      };
      setEmployees(prev => [...prev, newEmp]);
      addAuditLog('Yangi xodim (Offline)', `Ismi: ${data.name}, Telefon: ${phone}`);
    }
  };

  const updateEmployeeDebtPermission = async (empId, canSellOnDebt, maxDebtLimit) => {
    try {
      await api.setEmployeeDebtPermission(empId, canSellOnDebt, maxDebtLimit);
      loadDataFromServer();
      addAuditLog('Qarz ruxsati yangilandi', `Xodim ID: ${empId}, Ruxsat: ${canSellOnDebt ? 'Ha' : 'Yo\'q'}, Limit: ${Number(maxDebtLimit).toLocaleString()} UZS`);
    } catch (e) {
      console.warn("Could not update debt permission on API, updating offline", e);
      setEmployees(prev => prev.map(emp => {
        if (emp.id === empId) {
          return {
            ...emp,
            canSellOnDebt: Boolean(canSellOnDebt),
            maxDebtLimit: Number(maxDebtLimit)
          };
        }
        return emp;
      }));
    }
  };

  const toggleEmployeeActive = async (empId) => {
    const emp = employees.find(e => e.id === empId);
    if (!emp) return;

    try {
      await api.updateEmployee(empId, { is_active: !emp.active });
      loadDataFromServer();
    } catch (e) {
      console.warn("Employee state could not be updated on API, updating offline", e);
      setEmployees(prev => prev.map(e => {
        if (e.id === empId) {
          const newActive = !e.active;
          addAuditLog(newActive ? 'Xodim faollashtirildi (Offline)' : 'Xodim faolsizlantirildi (Offline)', `Ismi: ${e.name}`);
          return { ...e, active: newActive };
        }
        return e;
      }));
    }
  };

  const resetEmployeePIN = async (empId, newPin) => {
    try {
      await api.updateEmployee(empId, { pin: newPin });
      loadDataFromServer();
    } catch (e) {
      console.warn("Employee PIN could not be reset on API, resetting offline", e);
      setEmployees(prev => prev.map(e => {
        if (e.id === empId) {
          addAuditLog('PIN-kod o\'zgartirildi (Offline)', `Xodim: ${e.name}`);
          return { ...e, pin: newPin };
        }
        return e;
      }));
    }
  };

  // Audit log yozish
  const addAuditLog = (action, details) => {
    const newLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      time: new Date().toLocaleTimeString() + ' ' + new Date().toLocaleDateString(),
      action,
      details
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  // WebSocket Live simulation fallback (active only when offline)
  useEffect(() => {
    const interval = setInterval(() => {
      // Trigger local updates only if token doesn't exist (means we are offline testing)
      const token = localStorage.getItem('sotuvpro_access_token');
      if (!token) {
        setEmployees(prev => {
          return prev.map(emp => {
            if (emp.id === '1') return emp;
            if (Math.random() > 0.8) {
              const online = !emp.online;
              return {
                ...emp,
                online,
                lastSeen: online ? null : `${Math.floor(Math.random() * 15) + 1} daqiqa oldin`
              };
            }
            return emp;
          });
        });

        setBaskets(prev => {
          return prev.map(basket => {
            if (basket.id === '042') return basket;
            if (Math.random() > 0.85 && basket.items.length > 0) {
              const updatedItems = basket.items.map((item, idx) => {
                if (idx === 0) {
                  return { ...item, quantity: item.quantity + 1 };
                }
                return item;
              });
              return { ...basket, items: updatedItems };
            }
            return basket;
          });
        });
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <AppContext.Provider value={{
      language,
      setLanguage,
      t,
      user,
      products,
      debts,
      employees,
      baskets,
      transactions,
      auditLogs,
      notifications,
      tenantDetails,
      billingSummary,
      login,
      logout,
      addProduct,
      updateProductPrice,
      addStockMovement,
      correctStock,
      archiveProduct,
      deleteProduct,
      getStockMovements,
      completeSale,
      refundTransaction,
      payDebt,
      sendSMS,
      sendPhoneVerification,
      checkPhoneVerification,
      addEmployee,
      updateEmployeeDebtPermission,
      toggleEmployeeActive,
      resetEmployeePIN,
      addAuditLog
    }}>
      {children}
    </AppContext.Provider>
  );
};
