import 'package:intl/intl.dart';

class Formatters {
  static final NumberFormat _currencyFormat = NumberFormat('#,###', 'ru_RU');

  static String formatCurrency(double amount) {
    final formatted = _currencyFormat.format(amount.round()).replaceAll(',', ' ');
    return '$formatted so\'m';
  }

  static String currency(double amount) => formatCurrency(amount);

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
