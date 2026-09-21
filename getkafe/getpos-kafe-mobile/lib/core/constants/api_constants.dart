class ApiConstants {
  // Standart Cloud Backend URL (https://getpos.uz)
  static const String defaultBaseUrl = 'https://getpos.uz/api/v1/cafe';
  static const String fallbackBaseUrl = 'https://getpos.uz/api/v1/cafe';

  // Auth: POST https://getpos.uz/api/v1/auth/login/
  static const String login = 'https://getpos.uz/api/v1/auth/login/';

  // Halls / Rooms: GET halls/
  static const String halls = 'halls/';

  // Tables: GET tables/
  static const String tables = 'tables/';

  // Menu: GET https://getpos.uz/api/v1/products/
  static const String menu = 'https://getpos.uz/api/v1/products/';

  // Orders: POST orders/
  static const String orders = 'orders/';
  static String tableDetail(String tableId) => 'tables/$tableId/';
  static String orderBillRequest(String orderId) => 'orders/$orderId/bill-request/';
  static String orderAddItems(String orderId) => 'orders/$orderId/add-items/';
  static String orderPay(String orderId) => 'orders/$orderId/pay/';
  static String cancelOrderItem(String orderId) => 'orders/$orderId/cancel-item/';
  static String updateOrderItem(String orderId, String itemId) => 'orders/$orderId/items/$itemId/';

  // WebSocket: wss://getpos.uz/ws/cafe/
  static String wsUrl(String baseUrl) {
    if (baseUrl.contains('getpos.uz')) {
      return 'wss://getpos.uz/ws/cafe/';
    }
    if (baseUrl.startsWith('https://')) {
      return baseUrl.replaceFirst('https://', 'wss://').replaceAll('/api/v1/cafe', '/ws/cafe');
    } else if (baseUrl.startsWith('http://')) {
      return baseUrl.replaceFirst('http://', 'ws://').replaceAll('/api/v1/cafe', '/ws/cafe');
    }
    return 'wss://getpos.uz/ws/cafe/';
  }
}
