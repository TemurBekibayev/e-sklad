import 'package:flutter/material.dart';
import '../models/user.dart';
import '../services/security_service.dart';
import '../theme/app_theme.dart';
import 'auth_screen.dart';
import 'main_screen.dart';

class PinLockScreen extends StatefulWidget {
  final User currentUser;

  const PinLockScreen({
    Key? key,
    required this.currentUser,
  }) : super(key: key);

  @override
  _PinLockScreenState createState() => _PinLockScreenState();
}

class _PinLockScreenState extends State<PinLockScreen> {
  String _enteredPin = '';
  String? _errorMessage;
  int _failedCount = 0;

  void _onKeyPress(String key) {
    if (_enteredPin.length < 4) {
      setState(() {
        _enteredPin += key;
        _errorMessage = null;
      });

      if (_enteredPin.length == 4) {
        _verifyPin();
      }
    }
  }

  void _onBackspace() {
    if (_enteredPin.isNotEmpty) {
      setState(() {
        _enteredPin = _enteredPin.substring(0, _enteredPin.length - 1);
        _errorMessage = null;
      });
    }
  }

  Future<void> _verifyPin() async {
    final isValid = await SecurityService.instance.verifyUserPin(widget.currentUser.id, _enteredPin);

    if (isValid) {
      if (mounted) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (context) => MainScreen(currentUser: widget.currentUser),
          ),
        );
      }
    } else {
      setState(() {
        _failedCount++;
        _errorMessage = 'PIN-kod noto\'g\'ri! (${5 - _failedCount} ta imkoniyat qoldi)';
        _enteredPin = '';
      });
    }
  }

  Future<void> _handleLogout() async {
    await SecurityService.instance.clearSession();
    if (mounted) {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (context) => const AuthScreen(),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.darkBackground,
      body: SafeArea(
        child: Column(
          children: [
            const SizedBox(height: 24),

            // Top Header: User Profile Avatar & Name
            Center(
              child: Column(
                children: [
                  CircleAvatar(
                    radius: 36,
                    backgroundColor: AppTheme.primaryEmerald.withOpacity(0.2),
                    child: Text(
                      widget.currentUser.name.isNotEmpty
                          ? widget.currentUser.name.substring(0, 1).toUpperCase()
                          : 'U',
                      style: const TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.primaryEmerald,
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    widget.currentUser.name,
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    widget.currentUser.role == 'manager' ? 'Menejer' : 'Savdo xodimi',
                    style: const TextStyle(
                      fontSize: 13,
                      color: AppTheme.textSecondary,
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),
            const Text(
              'Tezkor Kirish',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: AppTheme.textPrimary,
              ),
            ),
            const SizedBox(height: 6),
            const Text(
              'Shaxsiy 4 xonali PIN-kodingizni kiriting',
              style: TextStyle(
                fontSize: 13,
                color: AppTheme.textMuted,
              ),
            ),

            const Spacer(),

            // 4-digit Indicator Dots
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(4, (index) {
                final isFilled = index < _enteredPin.length;
                return AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  margin: const EdgeInsets.symmetric(horizontal: 10),
                  width: 20,
                  height: 20,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: isFilled ? AppTheme.primaryEmerald : Colors.transparent,
                    border: Border.all(
                      color: isFilled ? AppTheme.primaryEmerald : AppTheme.textSecondary,
                      width: 2,
                    ),
                  ),
                );
              }),
            ),

            if (_errorMessage != null) ...[
              const SizedBox(height: 16),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24.0),
                child: Text(
                  _errorMessage!,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: AppTheme.dangerRed,
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],

            const Spacer(),

            // Numeric Pinpad Keyboard
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 10),
              child: Column(
                children: [
                  _buildKeyboardRow(['1', '2', '3']),
                  const SizedBox(height: 14),
                  _buildKeyboardRow(['4', '5', '6']),
                  const SizedBox(height: 14),
                  _buildKeyboardRow(['7', '8', '9']),
                  const SizedBox(height: 14),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      const SizedBox(width: 70),
                      _buildKeyButton('0'),
                      IconButton(
                        onPressed: _onBackspace,
                        icon: const Icon(Icons.backspace_outlined, color: AppTheme.textPrimary, size: 28),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 12),
            TextButton.icon(
              onPressed: _handleLogout,
              icon: const Icon(Icons.logout_rounded, color: AppTheme.textSecondary, size: 18),
              label: const Text(
                'Boshqa hisobga o\'tish (Chiqish)',
                style: TextStyle(color: AppTheme.textSecondary, fontSize: 13),
              ),
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  Widget _buildKeyboardRow(List<String> keys) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: keys.map((key) => _buildKeyButton(key)).toList(),
    );
  }

  Widget _buildKeyButton(String label) {
    return InkWell(
      onTap: () => _onKeyPress(label),
      borderRadius: BorderRadius.circular(35),
      child: Container(
        width: 70,
        height: 70,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: AppTheme.cardSurface,
          shape: BoxShape.circle,
          border: Border.all(color: const Color(0xFF334155)),
        ),
        child: Text(
          label,
          style: const TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: AppTheme.textPrimary,
          ),
        ),
      ),
    );
  }
}
