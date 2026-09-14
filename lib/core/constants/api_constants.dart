class ApiConstants {
  // Standart Kassa Server Manzili (Lokal Wi-Fi yoki Cloud)
  static const String defaultBaseUrl = 'http://192.168.1.5:4000/api';
  static const String fallbackBaseUrl = 'https://getpos.uz/api';

  // Auth: POST /api/auth/login { "login": "...", "password": "..." }
  static const String login = '/auth/login';

  // Tables: GET /api/tables
  static const String tables = '/tables';

  // Menu: GET /api/menu (Kategoriyalar va Mahsulotlar)
  static const String menu = '/menu';

  // Orders: POST /api/orders
  static const String orders = '/orders';
  static String orderBillRequest(String orderId) => '/orders/$orderId/bill-request';

  // WebSocket
  static String wsUrl(String baseUrl) {
    if (baseUrl.startsWith('https://')) {
      return baseUrl.replaceFirst('https://', 'wss://').replaceAll('/api', '/ws');
    } else if (baseUrl.startsWith('http://')) {
      return baseUrl.replaceFirst('http://', 'ws://').replaceAll('/api', '/ws');
    }
    return 'ws://192.168.1.5:4000/ws';
  }
}
