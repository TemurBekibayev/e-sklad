import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../storage/app_preferences.dart';

class KitchenSignalEvent {
  final String type; // 'READY', 'OUT_OF_STOCK', 'UPDATED'
  final String title;
  final String message;
  final String? tableNumber;
  final String? orderId;
  final DateTime timestamp;

  KitchenSignalEvent({
    required this.type,
    required this.title,
    required this.message,
    this.tableNumber,
    this.orderId,
    DateTime? timestamp,
  }) : timestamp = timestamp ?? DateTime.now();
}

class KitchenSignalService extends ChangeNotifier {
  static final KitchenSignalService _instance = KitchenSignalService._internal();
  factory KitchenSignalService() => _instance;
  KitchenSignalService._internal();

  WebSocket? _socket;
  Timer? _pingTimer;
  Timer? _reconnectTimer;
  bool _isConnected = false;
  bool _isConnecting = false;
  VoidCallback? onTableUpdated;

  final GlobalKey<ScaffoldMessengerState> messengerKey = GlobalKey<ScaffoldMessengerState>();

  bool get isConnected => _isConnected;

  Future<void> connect() async {
    if (_isConnecting || _isConnected) return;
    _isConnecting = true;

    try {
      final token = await AppPreferences.getAuthToken();
      if (token == null || token.isEmpty || token.startsWith('offline_') || token.startsWith('mock_')) {
        _isConnecting = false;
        return;
      }

      final wsUri = Uri.parse('wss://getpos.uz/ws/cafe/?token=$token');
      debugPrint('[KitchenSignalService] Connecting to $wsUri...');

      _socket = await WebSocket.connect(wsUri.toString()).timeout(const Duration(seconds: 8));
      _isConnected = true;
      _isConnecting = false;
      notifyListeners();
      debugPrint('[KitchenSignalService] WebSocket Connected!');

      _startPing();

      _socket!.listen(
        (data) {
          _handleMessage(data);
        },
        onError: (err) {
          debugPrint('[KitchenSignalService] WebSocket Error: $err');
          _reconnect();
        },
        onDone: () {
          debugPrint('[KitchenSignalService] WebSocket Closed');
          _reconnect();
        },
        cancelOnError: true,
      );
    } catch (e) {
      debugPrint('[KitchenSignalService] Connect exception: $e');
      _isConnecting = false;
      _isConnected = false;
      _reconnect();
    }
  }

  void _startPing() {
    _pingTimer?.cancel();
    _pingTimer = Timer.periodic(const Duration(seconds: 15), (_) {
      if (_isConnected && _socket != null && _socket!.readyState == WebSocket.open) {
        try {
          _socket!.add(jsonEncode({'type': 'ping'}));
        } catch (_) {}
      }
    });
  }

  void _reconnect() {
    _isConnected = false;
    _isConnecting = false;
    _pingTimer?.cancel();
    try {
      _socket?.close();
    } catch (_) {}
    _socket = null;
    notifyListeners();

    _reconnectTimer?.cancel();
    _reconnectTimer = Timer(const Duration(seconds: 4), () {
      connect();
    });
  }

  void _handleMessage(dynamic raw) {
    try {
      final data = jsonDecode(raw.toString());
      final event = data['event'] ?? data['type'];
      final payload = data['data'] ?? {};

      debugPrint('[KitchenSignalService] Received event: $event, payload: $payload');

      if (event == 'KITCHEN_TICKET_READY') {
        final tableNum = payload['tableNumber'] ?? payload['table_number'] ?? '';
        _triggerSignal(
          type: 'READY',
          title: '🔔 Oshxona: Taomlar tayyor!',
          message: '$tableNum-STOL buyurtmasi tayyor bo\'ldi. Oshxonadan olib mijozga bering.',
          tableNumber: '$tableNum',
          orderId: payload['orderId']?.toString(),
        );
        onTableUpdated?.call();
      } else if (event == 'DISH_OUT_OF_STOCK') {
        final tableNum = payload['tableNumber'] ?? payload['table_number'] ?? '';
        final prodName = payload['productName'] ?? payload['product_name'] ?? 'Taom';
        final customMsg = payload['message'] ?? '$tableNum-STOL uchun "$prodName" oshxonada yo\'q deb belgilandi.';
        _triggerSignal(
          type: 'OUT_OF_STOCK',
          title: '⚠️ Oshxonada Taom Yo\'q!',
          message: customMsg,
          tableNumber: '$tableNum',
          orderId: payload['orderId']?.toString(),
        );
        onTableUpdated?.call();
      } else if (event == 'TABLE_UPDATED' || event == 'TABLES_UPDATED' || event == 'ORDER_UPDATED' || event == 'KITCHEN_TICKETS_UPDATED') {
        onTableUpdated?.call();
      }
    } catch (e) {
      debugPrint('[KitchenSignalService] Error parsing message: $e');
    }
  }

  void _triggerSignal({
    required String type,
    required String title,
    required String message,
    String? tableNumber,
    String? orderId,
  }) {
    // 1. Play alert sound & haptic vibration
    try {
      HapticFeedback.heavyImpact();
      Future.delayed(const Duration(milliseconds: 150), () => HapticFeedback.heavyImpact());
      Future.delayed(const Duration(milliseconds: 300), () => HapticFeedback.vibrate());
      SystemSound.play(SystemSoundType.alert);
    } catch (e) {
      debugPrint('[KitchenSignalService] Sound/Haptic error: $e');
    }

    // 2. Show in-app banner / snackbar
    final messenger = messengerKey.currentState;
    if (messenger != null) {
      final isReady = type == 'READY';
      messenger.clearSnackBars();
      messenger.showSnackBar(
        SnackBar(
          duration: const Duration(seconds: 7),
          behavior: SnackBarBehavior.floating,
          margin: const EdgeInsets.only(top: 10, left: 16, right: 16, bottom: 20),
          backgroundColor: isReady ? const Color(0xFF10B981) : const Color(0xFFEF4444),
          elevation: 10,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          content: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.25),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  isReady ? Icons.restaurant_menu : Icons.warning_amber_rounded,
                  color: Colors.white,
                  size: 26,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 15,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      message,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          action: SnackBarAction(
            label: 'OK',
            textColor: Colors.white,
            onPressed: () {
              messenger.hideCurrentSnackBar();
            },
          ),
        ),
      );
    }
  }

  void disconnect() {
    _pingTimer?.cancel();
    _reconnectTimer?.cancel();
    try {
      _socket?.close();
    } catch (_) {}
    _socket = null;
    _isConnected = false;
    _isConnecting = false;
    notifyListeners();
  }
}
