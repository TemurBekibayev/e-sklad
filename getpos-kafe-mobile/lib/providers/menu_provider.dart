import 'package:flutter/material.dart';
import '../models/category.dart';
import '../models/product.dart';
import '../core/network/api_service.dart';
import '../core/services/image_cache_service.dart';

class MenuProvider extends ChangeNotifier {
  final ApiService _apiService = ApiService();

  List<Category> _categories = [];
  List<Product> _allProducts = [];
  String _selectedCategoryId = 'c1'; // 'c1' = Barchasi
  String _searchQuery = '';
  bool _isLoading = false;

  List<Category> get categories => _categories;
  List<Product> get allProducts => _allProducts;
  String get selectedCategoryId => _selectedCategoryId;
  String get searchQuery => _searchQuery;
  bool get isLoading => _isLoading;

  List<Product> get filteredProducts {
    var list = _allProducts;

    // Filter by Category
    if (_selectedCategoryId != 'c1') {
      list = list.where((p) => p.categoryId == _selectedCategoryId).toList();
    }

    // Filter by Search Query
    if (_searchQuery.trim().isNotEmpty) {
      final q = _searchQuery.trim().toLowerCase();
      list = list.where((p) => p.name.toLowerCase().contains(q)).toList();
    }

    return list;
  }

  Future<void> init() async {
    _isLoading = true;
    notifyListeners();

    try {
      final menuData = await _apiService.getMenu();
      _categories = menuData['categories'] as List<Category>;
      _allProducts = menuData['products'] as List<Product>;
      // Background Wi-Fi Image Preload into phone flash storage
      ImageCacheService().preloadProductImages(_allProducts).catchError((_) => <String, int>{});
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void selectCategory(String categoryId) {
    _selectedCategoryId = categoryId;
    notifyListeners();
  }

  void setSearchQuery(String query) {
    _searchQuery = query;
    notifyListeners();
  }

  void clearSearch() {
    _searchQuery = '';
    notifyListeners();
  }

  Future<void> refresh() async {
    final menuData = await _apiService.getMenu();
    _categories = menuData['categories'] as List<Category>;
    _allProducts = menuData['products'] as List<Product>;
    ImageCacheService().preloadProductImages(_allProducts).catchError((_) => <String, int>{});
    notifyListeners();
  }
}

