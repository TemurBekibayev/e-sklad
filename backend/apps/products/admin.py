from django.contrib import admin
from .models import Product, StockMovement, PriceHistory

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'tenant', 'price_per_sale_unit', 'current_stock', 'reserved_stock', 'available_stock_display', 'sale_unit', 'is_archived')
    list_filter = ('tenant', 'is_archived', 'sale_unit')
    search_fields = ('name', 'barcode', 'qr_code')
    readonly_fields = ('id', 'created_at', 'updated_at')

    def available_stock_display(self, obj):
        return f"{obj.available_stock} {obj.sale_unit}"
    available_stock_display.short_description = "Erkin qoldiq"


@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = ('created_at', 'product', 'type', 'purchase_unit_amount', 'sale_unit_amount', 'performed_by')
    list_filter = ('type', 'created_at', 'product__tenant')
    search_fields = ('product__name', 'reason')
    readonly_fields = ('id', 'created_at')


@admin.register(PriceHistory)
class PriceHistoryAdmin(admin.ModelAdmin):
    list_display = ('created_at', 'product', 'old_price', 'new_price', 'changed_by')
    list_filter = ('created_at', 'product__tenant')
    search_fields = ('product__name',)
    readonly_fields = ('id', 'created_at')
