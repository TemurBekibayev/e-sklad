import 'package:flutter/material.dart';
import '../services/security_service.dart';
import '../theme/app_theme.dart';

class PinSetupScreen extends StatefulWidget {
  final String userId;
  final VoidCallback onPinSet;

  const PinSetupScreen({
    Key? key,
    required this.userId,
    required this.onPinSet,
  }) : super(key: key);

  @override
  _PinSetupScreenState createState() => _PinSetupScreenState();
}

class _PinSetupScreenState extends State<PinSetupScreen> {
  String _pin = '';
  String _confirmPin = '';
  bool _isConfirming = false;
  String? _errorMessage;

  void _onKeyPress(String key) {
    if (_isConfirming) {
      if (_confirmPin.length < 4) {
        setState(() {
          _confirmPin += key;
          _errorMessage = null;
        });

        if (_confirmPin.length == 4) {
          _savePin();
        }
      }
    } else {
      if (_pin.length < 4) {
        setState(() {
          _pin += key;
          _errorMessage = null;
        });

        if (_pin.length == 4) {
          setState(() {
            _isConfirming = true;
          });
        }
      }
    }
  }

  void _onBackspace() {
    if (_isConfirming) {
      if (_confirmPin.isNotEmpty) {
        setState(() {
          _confirmPin = _confirmPin.substring(0, _confirmPin.length - 1);
          _errorMessage = null;
        });
      } else {
        setState(() {
          _isConfirming = false;
          _pin = '';
        });
      }
    } else {
      if (_pin.isNotEmpty) {
        setState(() {
          _pin = _pin.substring(0, _pin.length - 1);
          _errorMessage = null;
        });
      }
    }
  }

  Future<void> _savePin() async {
    if (_pin != _confirmPin) {
      setState(() {
        _errorMessage = 'PIN-kodlar bir-biriga mos kelmadi! Qaytadan kiriting.';
        _confirmPin = '';
        _pin = '';
        _isConfirming = false;
      });
      return;
    }

    await SecurityService.instance.setUserPin(widget.userId, _pin);
    widget.onPinSet();
  }

  @override
  Widget build(BuildContext context) {
    final currentInput = _isConfirming ? _confirmPin : _pin;
    final titleText = _isConfirming ? 'PIN-kodni qayta kiriting' : 'Shaxsiy 4 xonali PIN-kod yarating';
    final subtitleText = _isConfirming
        ? 'Tasdiqlash uchun PIN-kodni bir xil shaklda kiriting.'
        : 'Ilovaga tezkor kirish uchun shaxsiy PIN-kod o\'rnating.';

    return Scaffold(
      backgroundColor: AppTheme.darkBackground,
      body: SafeArea(
        child: Column(
          children: [
            const SizedBox(height: 30),

            // Top Icon Header
            Center(
              child: Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: AppTheme.primaryEmerald.withOpacity(0.15),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.shield_outlined,
                  color: AppTheme.primaryEmerald,
                  size: 52,
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Title & Subtitle
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24.0),
              child: Text(
                titleText,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.textPrimary,
                  letterSpacing: 0.3,
                ),
              ),
            ),
            const SizedBox(height: 10),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 36.0),
              child: Text(
                subtitleText,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 14,
                  color: AppTheme.textSecondary,
                  height: 1.4,
                ),
              ),
            ),

            const Spacer(),

            // PIN Dots Indicator
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(4, (index) {
                final isFilled = index < currentInput.length;
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

            // Full-screen Numeric Keypad
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 20),
              child: Column(
                children: [
                  _buildKeyboardRow(['1', '2', '3']),
                  const SizedBox(height: 16),
                  _buildKeyboardRow(['4', '5', '6']),
                  const SizedBox(height: 16),
                  _buildKeyboardRow(['7', '8', '9']),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      const SizedBox(width: 72),
                      _buildKeyButton('0'),
                      IconButton(
                        onPressed: _onBackspace,
                        icon: const Icon(Icons.backspace_outlined, color: AppTheme.textPrimary, size: 30),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
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
      borderRadius: BorderRadius.circular(36),
      child: Container(
        width: 72,
        height: 72,
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
