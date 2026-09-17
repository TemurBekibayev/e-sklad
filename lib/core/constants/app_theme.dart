import 'package:flutter/material.dart';
import 'app_colors.dart';

class ThemePalette {
  final String id;
  final String nameUz;
  final String nameOz;
  final String nameRu;
  final Color primary;
  final Color primaryDark;
  final Color primaryLight;

  const ThemePalette({
    required this.id,
    required this.nameUz,
    required this.nameOz,
    required this.nameRu,
    required this.primary,
    required this.primaryDark,
    required this.primaryLight,
  });

  String getName(String lang) {
    if (lang == 'oz') return nameOz;
    if (lang == 'ru') return nameRu;
    return nameUz;
  }
}

class AppTheme {
  static const List<ThemePalette> availablePalettes = [
    ThemePalette(
      id: 'blue',
      nameUz: 'Klassik Moviy',
      nameOz: 'Классик Мовий',
      nameRu: 'Классический синий',
      primary: Color(0xFF2563EB),
      primaryDark: Color(0xFF1D4ED8),
      primaryLight: Color(0xFFDBEAFE),
    ),
    ThemePalette(
      id: 'emerald',
      nameUz: 'Zumrad Yashil',
      nameOz: 'Зумрад Яшил',
      nameRu: 'Изумрудный зелёный',
      primary: Color(0xFF059669),
      primaryDark: Color(0xFF047857),
      primaryLight: Color(0xFFD1FAE5),
    ),
    ThemePalette(
      id: 'amber',
      nameUz: 'Qahva & Oltin',
      nameOz: 'Қаҳва & Олтин',
      nameRu: 'Кофе и золото',
      primary: Color(0xFFD97706),
      primaryDark: Color(0xFFB45309),
      primaryLight: Color(0xFFFEF3C7),
    ),
    ThemePalette(
      id: 'purple',
      nameUz: 'Zamonaviy Binafsha',
      nameOz: 'Замонавий Бинафша',
      nameRu: 'Модный фиолетовый',
      primary: Color(0xFF7C3AED),
      primaryDark: Color(0xFF6D28D9),
      primaryLight: Color(0xFFEDE9FE),
    ),
    ThemePalette(
      id: 'crimson',
      nameUz: 'Karamel & Yoqut',
      nameOz: 'Карамель & Ёқут',
      nameRu: 'Рубиновый красный',
      primary: Color(0xFFE11D48),
      primaryDark: Color(0xFFBE123C),
      primaryLight: Color(0xFFFFE4E6),
    ),
  ];

  static ThemePalette getPalette(String id) {
    return availablePalettes.firstWhere(
      (p) => p.id == id,
      orElse: () => availablePalettes.first,
    );
  }

  static ThemeData buildTheme({required bool isDark, required String colorTheme}) {
    final palette = getPalette(colorTheme);

    if (isDark) {
      const darkBg = Color(0xFF0F172A);
      const darkSurface = Color(0xFF1E293B);
      const darkBorder = Color(0xFF334155);

      return ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        scaffoldBackgroundColor: darkBg,
        colorScheme: ColorScheme.dark(
          primary: palette.primary,
          secondary: palette.primaryLight,
          surface: darkSurface,
          error: AppColors.error,
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: darkSurface,
          foregroundColor: Colors.white,
          elevation: 0,
          centerTitle: false,
          iconTheme: IconThemeData(color: Colors.white),
        ),
        cardTheme: CardTheme(
          color: darkSurface,
          elevation: 1,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: const BorderSide(color: darkBorder, width: 1),
          ),
        ),
        bottomSheetTheme: const BottomSheetThemeData(
          backgroundColor: darkSurface,
        ),
        dialogTheme: const DialogTheme(
          backgroundColor: darkSurface,
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: palette.primary,
            foregroundColor: Colors.white,
            elevation: 0,
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            textStyle: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: darkSurface,
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: darkBorder),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: darkBorder),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: palette.primary, width: 2),
          ),
        ),
      );
    }

    // Light theme
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      scaffoldBackgroundColor: AppColors.background,
      colorScheme: ColorScheme.light(
        primary: palette.primary,
        secondary: palette.primaryDark,
        surface: AppColors.surface,
        error: AppColors.error,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.white,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
        centerTitle: false,
        iconTheme: IconThemeData(color: AppColors.textPrimary),
      ),
      cardTheme: CardTheme(
        color: AppColors.cardBg,
        elevation: 1,
        shadowColor: Colors.black.withOpacity(0.04),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: AppColors.border, width: 1),
        ),
      ),
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: Colors.white,
      ),
      dialogTheme: const DialogTheme(
        backgroundColor: Colors.white,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: palette.primary,
          foregroundColor: Colors.white,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: palette.primary, width: 2),
        ),
      ),
    );
  }

  static ThemeData get lightTheme => buildTheme(isDark: false, colorTheme: 'blue');
  static ThemeData get darkTheme => buildTheme(isDark: true, colorTheme: 'blue');
}
