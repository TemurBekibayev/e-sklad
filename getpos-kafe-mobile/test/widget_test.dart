import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:ofitsiyant/main.dart';
import 'package:ofitsiyant/providers/auth_provider.dart';
import 'package:ofitsiyant/providers/settings_provider.dart';
import 'package:ofitsiyant/providers/tables_provider.dart';
import 'package:ofitsiyant/providers/menu_provider.dart';
import 'package:ofitsiyant/providers/order_provider.dart';

void main() {
  testWidgets('App starts at Login & Password screen', (WidgetTester tester) async {
    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider(create: (_) => SettingsProvider()),
          ChangeNotifierProvider(create: (_) => AuthProvider()),
          ChangeNotifierProvider(create: (_) => TablesProvider()),
          ChangeNotifierProvider(create: (_) => MenuProvider()),
          ChangeNotifierProvider(create: (_) => OrderProvider()),
        ],
        child: const WaiterPosApp(),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('GetPOS Kafe'), findsOneWidget);
    expect(find.text('Login / Telefon'), findsOneWidget);
    expect(find.text('Parol'), findsOneWidget);
    expect(find.text('Tizimga kirish'), findsOneWidget);
  });
}
