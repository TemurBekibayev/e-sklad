import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/cached_product_image.dart';
import '../../../models/product.dart';
import 'product_detail_dialog.dart';

class ProductGrid extends StatelessWidget {
  final List<Product> products;
  final Function(Product product, {List<ProductModifier> selectedMods, String? comment, int course}) onAddProduct;

  const ProductGrid({
    super.key,
    required this.products,
    required this.onAddProduct,
  });

  void _openDetail(BuildContext context, Product product) {
    if (product.isStopList) return;
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

  @override
  Widget build(BuildContext context) {
    if (products.isEmpty) {
      return const Center(
        child: Text(
          'Taomlar topilmadi',
          style: TextStyle(color: AppColors.textSecondary),
        ),
      );
    }

    return GridView.builder(
      padding: const EdgeInsets.all(12),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 10,
        mainAxisSpacing: 10,
        childAspectRatio: 0.78,
      ),
      itemCount: products.length,
      itemBuilder: (context, index) {
        final product = products[index];

        return Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: () {
              if (product.isStopList) return;
              if (product.modifiers.isNotEmpty) {
                _openDetail(context, product);
              } else {
                onAddProduct(product);
              }
            },
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
                  // Image Area with Disk Caching
                  Stack(
                    children: [
                      CachedProductImage(
                        imageUrl: product.fullImageUrl,
                        productName: product.name,
                        width: double.infinity,
                        height: 95,
                        borderRadius: 13,
                        fit: BoxFit.cover,
                      ),
                      if (product.modifiers.isNotEmpty)
                        Positioned(
                          top: 6,
                          right: 6,
                          child: Container(
                            padding: const EdgeInsets.all(4),
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.9),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(
                              Icons.tune,
                              size: 14,
                              color: AppColors.primary,
                            ),
                          ),
                        ),
                      if (product.isStopList)
                        Positioned(
                          top: 6,
                          left: 6,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppColors.error,
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: const Text(
                              'Tugagan',
                              style: TextStyle(
                                fontSize: 9,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),

                  // Title & Details
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.all(10),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            product.name,
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.bold,
                              color: product.isStopList
                                  ? AppColors.textMuted
                                  : AppColors.textPrimary,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),

                          // Bottom: Price & Add Button
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Flexible(
                                child: Text(
                                  Formatters.formatCurrency(product.price),
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                    color: product.isStopList
                                        ? AppColors.textMuted
                                        : AppColors.primary,
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              if (!product.isStopList)
                                Container(
                                  width: 28,
                                  height: 28,
                                  decoration: BoxDecoration(
                                    color: AppColors.primaryLight,
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: const Icon(
                                    Icons.add,
                                    size: 16,
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
      },
    );
  }
}
