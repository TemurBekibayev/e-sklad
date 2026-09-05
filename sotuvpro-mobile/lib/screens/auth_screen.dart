import 'dart:async';
import 'package:flutter/material.dart';
import '../models/user.dart';
import '../services/api_service.dart';
import '../services/security_service.dart';
import '../theme/app_theme.dart';
import 'main_screen.dart';
import 'pin_setup_screen.dart';

class AuthScreen extends StatefulWidget {
  const AuthScreen({Key? key}) : super(key: key);

  @override
  _AuthScreenState createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final _formKey = GlobalKey<FormState>();
  final _loginController = TextEditingController(text: 'rustam@gmail.com');
  final _passwordController = TextEditingController();

  bool _isPasswordVisible = false;
  bool _isLoading = false;
  String? _errorMessage;
  Timer? _lockoutTimer;
  int _lockoutSeconds = 0;

  @override
  void dispose() {
    _loginController.dispose();
    _passwordController.dispose();
    _lockoutTimer?.cancel();
    super.dispose();
  }

  void _checkLockoutStatus() {
    final lockKey = SecurityService.instance.sanitizeInput(_loginController.text.toLowerCase());
    if (lockKey.isEmpty) return;

    if (SecurityService.instance.isUserLockedOut(lockKey)) {
      final remaining = SecurityService.instance.getRemainingLockoutSeconds(lockKey);
      setState(() {
        _lockoutSeconds = remaining;
        _errorMessage = '5 marta noto\'g\'ri kiritildi! Hisob vaqtincha bloklandi ($remaining soniya).';
      });
      _startLockoutCountdown();
    } else {
      _lockoutTimer?.cancel();
      setState(() {
        _lockoutSeconds = 0;
      });
    }
  }

  void _startLockoutCountdown() {
    _lockoutTimer?.cancel();
    _lockoutTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      final lockKey = SecurityService.instance.sanitizeInput(_loginController.text.toLowerCase());
      final remaining = SecurityService.instance.getRemainingLockoutSeconds(lockKey);

      if (remaining <= 0) {
        timer.cancel();
        setState(() {
          _lockoutSeconds = 0;
          _errorMessage = null;
        });
      } else {
        setState(() {
          _lockoutSeconds = remaining;
          _errorMessage = '5 marta noto\'g\'ri kiritildi! Hisob vaqtincha bloklandi ($remaining soniya).';
        });
      }
    });
  }

  Future<void> _handleLogin() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final loginInput = _loginController.text.trim();
    final password = _passwordController.text.trim();

    final response = await ApiService.instance.login(
      loginInput: loginInput,
      password: password,
    );

    setState(() {
      _isLoading = false;
    });

    if (response.isSuccess) {
      final userData = response.data?['user'] as Map<String, dynamic>?;
      final user = User.fromMap({
        ...?userData,
        'id': userData?['id'] ?? 'u_${loginInput.hashCode}',
        'name': userData?['name'] ?? loginInput.split('@').first,
        'pinHash': SecurityService.instance.hashPin(password),
        'avatarUrl': 'https://i.pravatar.cc/150?img=11',
      });

      await SecurityService.instance.saveSession(user.toMap());

      if (!mounted) return;

      // Kirgandan so'ng foydalanuvchi shaxsiy PIN-kodini tekshirish va o'rnatish
      final hasPin = await SecurityService.instance.hasUserPin(user.id);
      if (!hasPin) {
        await Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => PinSetupScreen(
              userId: user.id,
              onPinSet: () => Navigator.pop(context),
            ),
          ),
        );
      }

      if (mounted) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (context) => MainScreen(currentUser: user),
          ),
        );
      }
    } else {
      setState(() {
        _errorMessage = response.errorDetail ?? 'Login yoki parol noto\'g\'ri!';
      });
      _checkLockoutStatus();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.darkBackground,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
            child: Form(
              key: _formKey,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // App Logo & Header
                  Center(
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppTheme.primaryEmerald.withOpacity(0.15),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.storefront_rounded,
                        color: AppTheme.primaryEmerald,
                        size: 48,
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'SotuvPro',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.textPrimary,
                      letterSpacing: 0.5,
                    ),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'Savdo xodimi tizimiga kirish',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 14,
                      color: AppTheme.textSecondary,
                    ),
                  ),
                  const SizedBox(height: 36),

                  // Login Field (Gmail / Phone)
                  const Text(
                    'Login (Gmail yoki Telefon raqam)',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextFormField(
                    controller: _loginController,
                    keyboardType: TextInputType.emailAddress,
                    style: const TextStyle(color: AppTheme.textPrimary),
                    decoration: InputDecoration(
                      hintText: 'masalan: rustam@gmail.com yoki +998901234567',
                      hintStyle: const TextStyle(color: AppTheme.textMuted, fontSize: 13),
                      prefixIcon: const Icon(Icons.person_outline_rounded, color: AppTheme.primaryEmerald),
                      filled: true,
                      fillColor: AppTheme.cardSurface,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: const BorderSide(color: Color(0xFF334155)),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: const BorderSide(color: Color(0xFF334155)),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: const BorderSide(color: AppTheme.primaryEmerald, width: 2),
                      ),
                    ),
                    validator: (value) {
                      if (value == null || value.trim().isEmpty) {
                        return 'Iltimos, login (email yoki telefon) kiriting!';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 20),

                  // Password Field
                  const Text(
                    'Parol',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextFormField(
                    controller: _passwordController,
                    obscureText: !_isPasswordVisible,
                    style: const TextStyle(color: AppTheme.textPrimary),
                    decoration: InputDecoration(
                      hintText: 'Parolingizni kiriting',
                      hintStyle: const TextStyle(color: AppTheme.textMuted, fontSize: 13),
                      prefixIcon: const Icon(Icons.lock_outline_rounded, color: AppTheme.primaryEmerald),
                      suffixIcon: IconButton(
                        icon: Icon(
                          _isPasswordVisible ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                          color: AppTheme.textSecondary,
                        ),
                        onPressed: () {
                          setState(() {
                            _isPasswordVisible = !_isPasswordVisible;
                          });
                        },
                      ),
                      filled: true,
                      fillColor: AppTheme.cardSurface,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: const BorderSide(color: Color(0xFF334155)),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: const BorderSide(color: Color(0xFF334155)),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: const BorderSide(color: AppTheme.primaryEmerald, width: 2),
                      ),
                    ),
                    validator: (value) {
                      if (value == null || value.trim().isEmpty) {
                        return 'Iltimos, parolingizni kiriting!';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 14),

                  // Error message display
                  if (_errorMessage != null) ...[
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      decoration: BoxDecoration(
                        color: AppTheme.dangerRed.withOpacity(0.12),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: AppTheme.dangerRed.withOpacity(0.4)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.error_outline_rounded, color: AppTheme.dangerRed, size: 20),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              _errorMessage!,
                              style: const TextStyle(color: AppTheme.dangerRed, fontSize: 13, fontWeight: FontWeight.w500),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],

                  const SizedBox(height: 12),

                  // Submit Button
                  SizedBox(
                    height: 52,
                    child: ElevatedButton(
                      onPressed: (_isLoading || _lockoutSeconds > 0) ? null : _handleLogin,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.primaryEmerald,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                        elevation: 0,
                      ),
                      child: _isLoading
                          ? const SizedBox(
                              width: 24,
                              height: 24,
                              child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                            )
                          : const Text(
                              'Kirish',
                              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                            ),
                    ),
                  ),

                  const SizedBox(height: 20),
                  TextButton(
                    onPressed: () {
                      showDialog(
                        context: context,
                        builder: (context) => AlertDialog(
                          backgroundColor: AppTheme.cardSurface,
                          title: const Row(
                            children: [
                              Icon(Icons.help_outline, color: AppTheme.warningOrange),
                              SizedBox(width: 8),
                              Text('Parolni unutdingizmi?', style: TextStyle(fontSize: 16)),
                            ],
                          ),
                          content: const Text(
                            'Parolni tiklash uchun admin yoki menejeringizga murojaat qiling.',
                            style: TextStyle(color: AppTheme.textSecondary),
                          ),
                          actions: [
                            TextButton(
                              onPressed: () => Navigator.pop(context),
                              child: const Text('Tushunarli', style: TextStyle(color: AppTheme.primaryEmerald)),
                            ),
                          ],
                        ),
                      );
                    },
                    child: const Text(
                      'Parolni unutdingizmi?',
                      style: TextStyle(color: AppTheme.textSecondary, fontSize: 13),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
