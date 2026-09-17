import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/utils/transliteration_helper.dart';
import '../../../core/widgets/cached_product_image.dart';
import '../../../models/product.dart';
import '../../../providers/settings_provider.dart';
import 'product_detail_dialog.dart';

class ProductGrid extends StatelessWidget {
  final List<Product> products;
  final Function(Product product, {List<ProductModifier> selectedMods, String? comment, int course}) onAddProduct;

  const ProductGrid({
    super.key,
    required this.products,
    required this.onAddProduct,
  });

  void _triggerHaptic(BuildContext context) {
    final enabled = context.read<SettingsProvider>().isHapticEnabled;
    if (enabled) {
      HapticFeedback.lightImpact();
    }
  }

  void _openDetail(BuildContext context, Product product) {
    if (product.isStopList) return;
    _triggerHaptic(context);
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => ProductDetailDialog(
        product: product,
        onAdd: (mods, comment, course) {
          onAddProduct(
            product,
            selectedMods: mods,
            comment: comment,
            course: course,
          );
        },
      ),
    );
  }

  void _handleAdd(BuildContext context, Product product) {
    if (product.isStopList) return;
    _triggerHaptic(context);
    if (product.modifiers.isNotEmpty) {
      _openDetail(context, product);
    } else {
      onAddProduct(product);
    }
  }

  @override
  Widget build(BuildContext context) {
    final settingsProv = context.watch<SettingsProvider>();
    final layout = settingsProv.menuLayout;

    if (products.isEmpty) {
      return Center(
        child: Text(
          settingsProv.tr('no_products'),
          style: const TextStyle(color: AppColors.textSecondary),
        ),
      );
    }

    if (layout == 'list') {
      return ListView.separated(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        itemCount: products.length,
        separatorBuilder: (_, __) => const SizedBox(height: 8),
        itemBuilder: (context, index) {
          final product = products[index];
          return _buildListItem(context, product, settingsProv);
        },
      );
    }

    final is3Cols = layout == 'grid3';

    return GridView.builder(
      padding: const EdgeInsets.all(10),
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: is3Cols ? 3 : 2,
        crossAxisSpacing: 8,
        mainAxisSpacing: 8,
        childAspectRatio: is3Cols ? 0.64 : 0.78,
      ),
      itemCount: products.length,
      itemBuilder: (context, index) {
        final product = products[index];
        return _buildGridCard(context, product, is3Cols, settingsProv);
      },
    );
  }

  Widget _buildListItem(BuildContext context, Product product, SettingsProvider settingsProv) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () => _handleAdd(context, product),
        onLongPress: () => _openDetail(context, product),
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: product.isStopList ? Colors.grey.shade100 : Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: product.isStopList ? Colors.grey.shade300 : AppColors.border,
            ),
            boxShadow: product.isStopList
                ? null
                : [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.02),
                      blurRadius: 4,
                      offset: const Offset(0, 1),
                    ),
                  ],
          ),
          child: Row(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: SizedBox(
                  width: 60,
                  height: 60,
                  child: Stack(
                    children: [
                      CachedProductImage(
                        imageUrl: product.fullImageUrl,
                        productName: product.name,
                        width: 60,
                        height: 60,
                        borderRadius: 8,
                        fit: BoxFit.cover,
                      ),
                      if (product.isStopList)
                        Container(
                          color: Colors.black45,
                          alignment: Alignment.center,
                          child: Text(
                            settingsProv.tr('sold_out'),
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 9,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      TransliterationHelper.adapt(product.name, settingsProv.currentLanguage),
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: product.isStopList ? AppColors.textMuted : AppColors.textPrimary,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Text(
                          Formatters.formatCurrency(product.price, settingsProv.tr('currency')),
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            color: product.isStopList ? AppColors.textMuted : AppColors.primary,
                          ),
                        ),
                        if (product.modifiers.isNotEmpty) ...[
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                            decoration: BoxDecoration(
                              color: AppColors.primaryLight,
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: const Text(
                              '+Mod',
                              style: TextStyle(fontSize: 10, color: AppColors.primaryDark, fontWeight: FontWeight.bold),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
              if (!product.isStopList)
                Container(
                  width: 34,
                  height: 34,
                  decoration: BoxDecoration(
                    color: AppColors.primaryLight,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(
                    Icons.add,
                    size: 20,
                    color: AppColors.primaryDark,
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildGridCard(BuildContext context, Product product, bool is3Cols, SettingsProvider settingsProv) {
    final imageHeight = is3Cols ? 72.0 : 95.0;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () => _handleAdd(context, product),
        onLongPress: () => _openDetail(context, product),
        borderRadius: BorderRadius.circular(14),
        child: Container(
          decoration: BoxDecoration(
            color: product.isStopList ? Colors.grey.shade100 : Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: product.isStopList ? Colors.grey.shade300 : AppColors.border,
            ),
            boxShadow: product.isStopList
                ? null
                : [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.03),
                      blurRadius: 6,
                      offset: const Offset(0, 2),
                    ),
                  ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Stack(
                children: [
                  CachedProductImage(
                    imageUrl: product.fullImageUrl,
                    productName: product.name,
                    width: double.infinity,
                    height: imageHeight,
                    borderRadius: 13,
                    fit: BoxFit.cover,
                  ),
                  if (product.modifiers.isNotEmpty)
                    Positioned(
                      top: 4,
                      right: 4,
                      child: Container(
                        padding: const EdgeInsets.all(3),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.9),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.tune,
                          size: 12,
                          color: AppColors.primary,
                        ),
                      ),
                    ),
                  if (product.isStopList)
                    Positioned(
                      top: 4,
                      left: 4,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppColors.error,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          settingsProv.tr('sold_out'),
                          style: const TextStyle(
                            fontSize: 8,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
              Expanded(
                child: Padding(
                  padding: EdgeInsets.all(is3Cols ? 6 : 10),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        TransliterationHelper.adapt(product.name, settingsProv.currentLanguage),
                        style: TextStyle(
                          fontSize: is3Cols ? 11 : 13,
                          fontWeight: FontWeight.bold,
                          color: product.isStopList ? AppColors.textMuted : AppColors.textPrimary,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Flexible(
                            child: Text(
                              Formatters.formatCurrency(product.price, settingsProv.tr('currency')),
                              style: TextStyle(
                                fontSize: is3Cols ? 10 : 12,
                                fontWeight: FontWeight.bold,
                                color: product.isStopList ? AppColors.textMuted : AppColors.primary,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          if (!product.isStopList && !is3Cols)
                            Container(
                              width: 26,
                              height: 26,
                              decoration: BoxDecoration(
                                color: AppColors.primaryLight,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: const Icon(
                                Icons.add,
                                size: 15,
                                color: AppColors.primaryDark,
                              ),
                            ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
