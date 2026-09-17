from django.contrib import admin
from apps.cafe.models import Hall, Table, Order, OrderItem, Shift

@admin.register(Hall)
class HallAdmin(admin.ModelAdmin):
    list_display = ['name', 'tenant', 'service_percent', 'is_active', 'sort_order']
    list_filter = ['tenant', 'is_active']
    search_fields = ['name']

@admin.register(Table)
class TableAdmin(admin.ModelAdmin):
    list_display = ['name', 'number', 'hall', 'tenant', 'capacity', 'status', 'current_waiter']
    list_filter = ['tenant', 'status', 'hall']
    search_fields = ['name']

class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['order_number', 'table', 'waiter_name', 'tenant', 'status', 'total_amount', 'created_at']
    list_filter = ['tenant', 'status', 'payment_method']
    search_fields = ['order_number', 'table__name']
    inlines = [OrderItemInline]

@admin.register(Shift)
class ShiftAdmin(admin.ModelAdmin):
    list_display = ['user', 'tenant', 'opened_at', 'closed_at', 'total_sales', 'status']
    list_filter = ['tenant', 'status']
