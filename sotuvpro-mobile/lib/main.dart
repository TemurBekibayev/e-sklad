import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'data/database_helper.dart';
import 'models/user.dart';
import 'screens/auth_screen.dart';
import 'screens/pin_lock_screen.dart';
import 'services/security_service.dart';
import 'services/api_service.dart';
import 'theme/app_theme.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Android tizim paneli ranglarini qorong'u rejimga moslash
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
      systemNavigationBarColor: AppTheme.darkBackground,
      systemNavigationBarIconBrightness: Brightness.light,
    ),
  );

  // Bazani ishga tushirish
  await DatabaseHelper.instance.database;

  // Saqlangan JWT tokenlarni yuklash
  await ApiService.instance.initTokens();

  // Saqlangan sessiyani tekshirish
  final userJson = await SecurityService.instance.getLoggedInUserJson();
  User? loggedInUser;
  bool hasPin = false;

  if (userJson != null) {
    loggedInUser = User.fromMap(userJson);
    hasPin = await SecurityService.instance.hasUserPin(loggedInUser.id);
  }

  runApp(SotuvProApp(
    initialUser: loggedInUser,
    hasPinSet: hasPin,
  ));
}

class SotuvProApp extends StatelessWidget {
  final User? initialUser;
  final bool hasPinSet;

  const SotuvProApp({
    Key? key,
    this.initialUser,
    this.hasPinSet = false,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    Widget initialHome = const AuthScreen();

    if (initialUser != null && hasPinSet) {
      initialHome = PinLockScreen(currentUser: initialUser!);
    }

    return MaterialApp(
      title: 'SotuvPro Mobile',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.darkTheme,
      home: initialHome,
    );
  }
}
