from django.contrib import admin
from .models import Basket, BasketItem

class BasketItemInline(admin.TabularInline):
    model = BasketItem
    extra = 0
    readonly_fields = ('subtotal',)

    def subtotal(self, obj):
        return f"{obj.subtotal:,.0f} so'm"
    subtotal.short_description = "Summa"


@admin.register(Basket)
class BasketAdmin(admin.ModelAdmin):
    list_display = ('id_short', 'tenant', 'worker', 'client_name', 'status', 'total_amount_display', 'items_count', 'updated_at')
    list_filter = ('status', 'tenant', 'updated_at')
    search_fields = ('client_name', 'client_phone', 'worker__name')
    readonly_fields = ('id', 'created_at', 'updated_at')
    inlines = [BasketItemInline]

    def id_short(self, obj):
        return str(obj.id)[:8]
    id_short.short_description = "Savat ID"

    def total_amount_display(self, obj):
        return f"{obj.total_amount:,.0f} so'm"
    total_amount_display.short_description = "Umumiy summa"


@admin.register(BasketItem)
class BasketItemAdmin(admin.ModelAdmin):
    list_display = ('basket', 'product', 'quantity', 'scanned_by', 'added_at')
    list_filter = ('added_at', 'basket__tenant')
    search_fields = ('product__name', 'basket__client_name')
