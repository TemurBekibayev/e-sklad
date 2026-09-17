import 'package:intl/intl.dart';
import '../storage/app_preferences.dart';

class Formatters {
  static final NumberFormat _currencyFormat = NumberFormat('#,###', 'ru_RU');

  static String formatCurrency(double amount, [String? currencySuffix]) {
    final formatted = _currencyFormat.format(amount.round()).replaceAll(',', ' ');
    final suffix = currencySuffix ?? _defaultSuffix();
    return '$formatted $suffix';
  }

  static String _defaultSuffix() {
    final lang = AppPreferences.cachedLanguage;
    if (lang == 'oz') return 'сўм';
    if (lang == 'ru') return 'сум';
    return 'so\'m';
  }

  static String currency(double amount, [String? currencySuffix]) => formatCurrency(amount, currencySuffix);

  static String formatTime(DateTime dateTime) {
    return DateFormat('HH:mm').format(dateTime);
  }

  static String formatDurationFrom(DateTime? startTime) {
    if (startTime == null) return '';
    final difference = DateTime.now().difference(startTime);
    final minutes = difference.inMinutes;
    if (minutes < 60) {
      return '$minutes daq';
    }
    final hours = difference.inHours;
    final remainingMinutes = minutes % 60;
    return '${hours}s ${remainingMinutes}d';
  }
}
