import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'core/constants/app_theme.dart';
import 'core/services/kitchen_signal_service.dart';
import 'providers/auth_provider.dart';
import 'providers/tables_provider.dart';
import 'providers/menu_provider.dart';
import 'providers/order_provider.dart';
import 'providers/settings_provider.dart';
import 'screens/auth/login_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final settingsProvider = SettingsProvider();
  await settingsProvider.init();

  final authProvider = AuthProvider();
  await authProvider.checkAuthStatus();

  final kitchenSignalService = KitchenSignalService();
  if (authProvider.isAuthenticated) {
    kitchenSignalService.connect();
  }

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider.value(value: settingsProvider),
        ChangeNotifierProvider.value(value: authProvider),
        ChangeNotifierProvider.value(value: kitchenSignalService),
        ChangeNotifierProvider(create: (_) => TablesProvider()),
        ChangeNotifierProvider(create: (_) => MenuProvider()),
        ChangeNotifierProvider(create: (_) => OrderProvider()),
      ],
      child: const WaiterPosApp(),
    ),
  );
}

class WaiterPosApp extends StatelessWidget {
  const WaiterPosApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Ofitsiyant POS',
      debugShowCheckedModeBanner: false,
      scaffoldMessengerKey: KitchenSignalService().messengerKey,
      theme: AppTheme.lightTheme,
      home: const LoginScreen(),
    );
  }
}
