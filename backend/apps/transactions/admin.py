from django.contrib import admin
from .models import Transaction

@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ('id_short', 'tenant', 'total_amount_display', 'payment_method', 'status', 'finalized_by', 'client_name', 'created_at')
    list_filter = ('payment_method', 'status', 'tenant', 'created_at')
    search_fields = ('client_name', 'client_phone', 'finalized_by__name')
    readonly_fields = ('id', 'created_at', 'updated_at', 'items_snapshot')

    def id_short(self, obj):
        return str(obj.id)[:8]
    id_short.short_description = "Savdo ID"

    def total_amount_display(self, obj):
        return f"{obj.total_amount:,.0f} so'm"
    total_amount_display.short_description = "Jami summa"
