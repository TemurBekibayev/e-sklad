import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/cached_product_image.dart';
import '../../../models/product.dart';

class ProductDetailDialog extends StatefulWidget {
  final Product product;
  final Function(List<ProductModifier> selectedMods, String? comment, int course) onAdd;

  const ProductDetailDialog({
    super.key,
    required this.product,
    required this.onAdd,
  });

  @override
  State<ProductDetailDialog> createState() => _ProductDetailDialogState();
}

class _ProductDetailDialogState extends State<ProductDetailDialog> {
  final List<ProductModifier> _selectedModifiers = [];
  final TextEditingController _commentController = TextEditingController();
  int _course = 1;

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  double get totalPrice {
    final extra = _selectedModifiers.fold(0.0, (sum, m) => sum + m.extraPrice);
    return widget.product.price + extra;
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Handle bar
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.border,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Product Image Banner
            CachedProductImage(
              imageUrl: widget.product.fullImageUrl,
              productName: widget.product.name,
              width: double.infinity,
              height: 150,
              borderRadius: 16,
              fit: BoxFit.cover,
            ),
            const SizedBox(height: 14),

            // Product Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.product.name,
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      if (widget.product.description != null) ...[
                        const SizedBox(height: 4),
                        Text(
                          widget.product.description!,
                          style: const TextStyle(
                            fontSize: 13,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                Text(
                  Formatters.formatCurrency(widget.product.price),
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: AppColors.primary,
                  ),
                ),
              ],
            ),
            const Divider(height: 24),

            // Modifiers if available
            if (widget.product.modifiers.isNotEmpty) ...[
              const Text(
                'Qo\'shimchalar va modifikatorlar:',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: widget.product.modifiers.map((mod) {
                  final isSelected = _selectedModifiers.contains(mod);
                  final extraText = mod.extraPrice > 0
                      ? ' (+${Formatters.formatCurrency(mod.extraPrice)})'
                      : '';

                  return FilterChip(
                    label: Text('${mod.name}$extraText'),
                    selected: isSelected,
                    onSelected: (selected) {
                      setState(() {
                        if (selected) {
                          _selectedModifiers.add(mod);
                        } else {
                          _selectedModifiers.remove(mod);
                        }
                      });
                    },
                    selectedColor: AppColors.primaryLight,
                    checkmarkColor: AppColors.primary,
                    labelStyle: TextStyle(
                      fontSize: 12,
                      fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                      color: isSelected ? AppColors.primaryDark : AppColors.textPrimary,
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 16),
            ],

            // Course selection (1-kurs, 2-kurs)
            const Text(
              'Oshxona tartibi (kurs):',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                _buildCourseChip(1, '1-kurs (Darhol)'),
                const SizedBox(width: 8),
                _buildCourseChip(2, '2-kurs (Keyinroq)'),
              ],
            ),
            const SizedBox(height: 16),

            // Kitchen note
            const Text(
              'Oshxona uchun izoh:',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _commentController,
              decoration: InputDecoration(
                hintText: 'Masalan: piyozsiz, tuzi kam, muzsiz...',
                hintStyle: const TextStyle(fontSize: 13, color: AppColors.textMuted),
                prefixIcon: const Icon(Icons.edit_note, color: AppColors.textSecondary),
                filled: true,
                fillColor: AppColors.background,
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: const BorderSide(color: AppColors.border),
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Submit Button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () {
                  final comment = _commentController.text.trim();
                  widget.onAdd(
                    _selectedModifiers,
                    comment.isEmpty ? null : comment,
                    _course,
                  );
                  Navigator.pop(context);
                },
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.add_shopping_cart, size: 20),
                    const SizedBox(width: 8),
                    Text('Qo\'shish (${Formatters.formatCurrency(totalPrice)})'),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCourseChip(int courseNum, String label) {
    final isSelected = _course == courseNum;
    return ChoiceChip(
      label: Text(label),
      selected: isSelected,
      onSelected: (_) => setState(() => _course = courseNum),
      selectedColor: AppColors.primary,
      backgroundColor: AppColors.background,
      labelStyle: TextStyle(
        fontSize: 12,
        fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
        color: isSelected ? Colors.white : AppColors.textPrimary,
      ),
      showCheckmark: false,
    );
  }
}
