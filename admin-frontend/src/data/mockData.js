export const initialDashboardData = {
  stats: {
    activeTenants: 128,
    totalUsers: '1,847',
    todaySales: '24,500,000 so\'m',
    overdueDebts: '3,200,000 so\'m',
  },
  attentionRequired: [
    { id: 1, name: 'Toshkent Elektron', days: '7 kundan beri faol emas' },
    { id: 2, name: 'Samarqand Savdo', days: '5 kundan beri faol emas' },
    { id: 3, name: 'Farg\'ona Bozor', days: '6 kundan beri faol emas' },
    { id: 4, name: 'Namangan Market', days: '9 kundan beri faol emas' },
  ],
  recentActivity: [
    { id: 1, tenant: 'Toshkent Elektron', user: 'Sardor A.', userInitial: 'S', action: 'Sotuv yakunlandi', actionType: 'success', time: '14:32' },
    { id: 2, tenant: 'Buxoro Trade', user: 'Nilufar K.', userInitial: 'N', action: 'Yangi mahsulot qo\'shildi', actionType: 'primary', time: '13:15' },
    { id: 3, tenant: 'Andijon Plus', user: 'Bekzod R.', userInitial: 'B', action: 'Chegirma belgilandi', actionType: 'warning', time: '12:48' },
    { id: 4, tenant: 'Xorazm Store', user: 'Dilshod M.', userInitial: 'D', action: 'Sotuv yakunlandi', actionType: 'success', time: '11:30' },
  ],
};

export const initialTenants = [
  { id: '1', name: 'Toshkent Elektron', address: 'Chilonzor, Toshkent', created_at: '12.01.2024', users_count: 8, status: 'active', last_active: 'Bugun', is_inactive_warning: false },
  { id: '2', name: 'Samarqand Savdo', address: 'Registon, Samarqand', created_at: '03.03.2024', users_count: 5, status: 'active', last_active: '2 kun oldin', is_inactive_warning: false },
  { id: '3', name: 'Farg\'ona Bozor', address: 'Markaziy, Farg\'ona', created_at: '15.05.2024', users_count: 3, status: 'inactive', last_active: '6 kun oldin', is_inactive_warning: true },
  { id: '4', name: 'Buxoro Trade', address: 'Ark ko\'chasi, Buxoro', created_at: '22.07.2024', users_count: 6, status: 'active', last_active: 'Kecha', is_inactive_warning: false },
  { id: '5', name: 'Namangan Market', address: 'Navro\'z, Namangan', created_at: '01.09.2024', users_count: 4, status: 'inactive', last_active: '9 kun oldin', is_inactive_warning: true },
  { id: '6', name: 'Andijon Plus', address: 'Bobur, Andijon', created_at: '10.11.2024', users_count: 7, status: 'active', last_active: 'Bugun', is_inactive_warning: false },
  { id: '7', name: 'Xorazm Store', address: 'Al-Xorazmiy, Urganch', created_at: '28.12.2024', users_count: 2, status: 'inactive', last_active: '12 kun oldin', is_inactive_warning: true },
  { id: '8', name: 'Nukus Digital', address: 'Do\'stlik, Nukus', created_at: '05.02.2025', users_count: 3, status: 'active', last_active: '3 kun oldin', is_inactive_warning: false },
];

export const tenantDetailData = {
  id: '1',
  name: 'Toshkent Elektron',
  status: 'active',
  stats: {
    totalProducts: '342 ta',
    todaySales: '4,850,000 so\'m',
    activeWorkers: '8 nafar',
    totalDebts: '1,200,000 so\'m',
  },
  salesChartData: [
    { day: 'Dush', amount: 4100000 },
    { day: 'Sesh', amount: 4800000 },
    { day: 'Chor', amount: 5100000 },
    { day: 'Pay', amount: 4500000 },
    { day: 'Jum', amount: 6200000 },
    { day: 'Shan', amount: 6800000 },
    { day: 'Yak', amount: 7100000 },
  ],
  activityHistory: [
    { id: 1, time: '14:32', user: 'Sardor A.', userInitial: 'S', action: 'Sotuv yakunlandi', actionType: 'success', details: '3 ta mahsulot — 450,000 so\'m' },
    { id: 2, time: '13:15', user: 'Nilufar K.', userInitial: 'N', action: 'Yangi mahsulot qo\'shildi', actionType: 'primary', details: 'Samsung Galaxy A54' },
    { id: 3, time: '12:48', user: 'Sardor A.', userInitial: 'S', action: 'Chegirma belgilandi', actionType: 'warning', details: 'iPhone 15 — 10% chegirma' },
    { id: 4, time: '11:30', user: 'Bekzod R.', userInitial: 'B', action: 'Sotuv yakunlandi', actionType: 'success', details: '1 ta mahsulot — 2,100,000 so\'m' },
    { id: 5, time: '10:15', user: 'Nilufar K.', userInitial: 'N', action: 'Qarz yozildi', actionType: 'debt', details: 'Alisher T. — 800,000 so\'m' },
    { id: 6, time: '09:00', user: 'Sardor A.', userInitial: 'S', action: 'Smena boshlandi', actionType: 'neutral', details: 'Kunlik smena' },
  ],
  workers: [
    { id: 1, name: 'Sardor Aliyev', role: 'Menejer', phone: '+998901112233', status: 'Faol', last_active: 'Bugun, 14:32' },
    { id: 2, name: 'Bekzod Rahimov', role: 'Savdo xodimi', phone: '+998902223344', status: 'Faol', last_active: 'Bugun, 11:30' },
    { id: 3, name: 'Nilufar Karimova', role: 'Savdo xodimi', phone: '+998903334455', status: 'Faol', last_active: 'Bugun, 13:15' },
    { id: 4, name: 'Dilshod Mamadaliyev', role: 'Savdo xodimi', phone: '+998904445566', status: 'Faol', last_active: 'Kecha, 18:00' },
  ],
  debts: [
    { id: 1, client: 'Alisher Turg\'unov', phone: '+998901239988', total: '800,000 so\'m', remaining: '800,000 so\'m', dueDate: '30.08.2025', status: 'Muddati bor' },
    { id: 2, client: 'Bobur Yoqubov', phone: '+998935554433', total: '1,500,000 so\'m', remaining: '400,000 so\'m', dueDate: '15.08.2025', status: 'Muddati o\'tgan' },
  ]
};

export const initialProducts = [
  { id: '1', name: 'iPhone 15 Pro Max', tenant: 'Toshkent Elektron', price: '16,500,000 so\'m', stock: 24, stock_display: '24 dona', unit: 'dona', updated_at: '24.08.2025', is_low: false },
  { id: '2', name: 'Samsung Galaxy A54', tenant: 'Toshkent Elektron', price: '4,200,000 so\'m', stock: 3, stock_display: '3 dona', unit: 'dona', updated_at: '23.08.2025', is_low: true },
  { id: '3', name: 'USB kabel (Type-C)', tenant: 'Samarqand Savdo', price: '35,000 so\'m', stock: 450, stock_display: '450 dona', unit: 'dona', updated_at: '22.08.2025', is_low: false },
  { id: '4', name: 'Atlas gilam 3×4', tenant: 'Farg\'ona Bozor', price: '2,800,000 so\'m', stock: 8, stock_display: '8 dona', unit: 'dona', updated_at: '24.08.2025', is_low: false },
  { id: '5', name: 'Paxtali mato', tenant: 'Buxoro Trade', price: '45,000 so\'m', stock: 2, stock_display: '2 metr', unit: 'metr', updated_at: '20.08.2025', is_low: true },
  { id: '6', name: 'Konditsioner 12BTU', tenant: 'Namangan Market', price: '5,400,000 so\'m', stock: 15, stock_display: '15 dona', unit: 'dona', updated_at: '24.08.2025', is_low: false },
  { id: '7', name: 'Kir yuvish mashinasi', tenant: 'Andijon Plus', price: '4,800,000 so\'m', stock: 1, stock_display: '1 dona', unit: 'dona', updated_at: '19.08.2025', is_low: true },
  { id: '8', name: 'Elektr choynak', tenant: 'Xorazm Store', price: '280,000 so\'m', stock: 67, stock_display: '67 dona', unit: 'dona', updated_at: '23.08.2025', is_low: false },
  { id: '9', name: 'Ipak mato', tenant: 'Buxoro Trade', price: '120,000 so\'m', stock: 180, stock_display: '180 metr', unit: 'metr', updated_at: '24.08.2025', is_low: false },
  { id: '10', name: 'Smartfon aksessuar to\'plami', tenant: 'Toshkent Elektron', price: '85,000 so\'m', stock: 4, stock_display: '4 dona', unit: 'dona', updated_at: '21.08.2025', is_low: true },
  { id: '11', name: 'LED televizor 55"', tenant: 'Nukus Digital', price: '7,200,000 so\'m', stock: 22, stock_display: '22 dona', unit: 'dona', updated_at: '24.08.2025', is_low: false },
  { id: '12', name: 'Muzlatgich Artel', tenant: 'Namangan Market', price: '6,100,000 so\'m', stock: 9, stock_display: '9 dona', unit: 'dona', updated_at: '22.08.2025', is_low: false },
];

export const reportsData = {
  dateRange: '01.08.2025 – 24.08.2025',
  storeRatings: [
    { name: 'Toshkent Elektron', sales: '450M', percent: 100 },
    { name: 'Samarqand Savdo', sales: '380M', percent: 84 },
    { name: 'Farg\'ona Bozor', sales: '310M', percent: 69 },
    { name: 'Buxoro Trade', sales: '280M', percent: 62 },
    { name: 'Namangan Market', sales: '240M', percent: 53 },
    { name: 'Andijon Plus', sales: '190M', percent: 42 },
    { name: 'Xorazm Store', sales: '150M', percent: 33 },
    { name: 'Nukus Digital', sales: '95M', percent: 21 },
  ],
  monthlyGrowth: [
    { month: 'Yan', stores: 15 },
    { month: 'Fev', stores: 28 },
    { month: 'Mar', stores: 42 },
    { month: 'Apr', stores: 58 },
    { month: 'May', stores: 75 },
    { month: 'Iyn', stores: 96 },
    { month: 'Iyl', stores: 112 },
    { month: 'Avg', stores: 128 },
  ],
  dau: { count: '847', growth: '+12%' },
  wau: { count: '3,214', growth: '+8%' }
};
