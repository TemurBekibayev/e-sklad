import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/app_colors.dart';
import '../../../models/hall_table.dart';
import '../../../providers/settings_provider.dart';
import '../../../core/localization/app_translations.dart';
import '../../../core/utils/transliteration_helper.dart';

class HallTabBar extends StatelessWidget {
  final List<Hall> halls;
  final String? selectedHallId;
  final ValueChanged<String?> onSelectHall;

  const HallTabBar({
    super.key,
    required this.halls,
    required this.selectedHallId,
    required this.onSelectHall,
  });

  @override
  Widget build(BuildContext context) {
    final lang = context.watch<SettingsProvider>().currentLanguage;

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: [
          ...halls.map((hall) {
            final isSelected = hall.id == selectedHallId;
            final displayName = (hall.name == 'Barchasi' || hall.id == 'Barchasi' || hall.id == 'all')
                ? AppTranslations.get('all', lang)
                : TransliterationHelper.adapt(hall.name, lang);

            return Padding(
              padding: const EdgeInsets.only(right: 8),
              child: ChoiceChip(
                label: Text(displayName),
                selected: isSelected,
                onSelected: (_) => onSelectHall(hall.id),
                selectedColor: AppColors.primary,
                backgroundColor: Colors.white,
                labelStyle: TextStyle(
                  color: isSelected ? Colors.white : AppColors.textPrimary,
                  fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                  fontSize: 13,
                ),
                side: BorderSide(
                  color: isSelected ? AppColors.primary : AppColors.border,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(20),
                ),
                showCheckmark: false,
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              ),
            );
          }),
        ],
      ),
    );
  }
}
