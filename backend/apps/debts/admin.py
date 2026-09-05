from django.contrib import admin
from .models import Debt, DebtHistory

class DebtHistoryInline(admin.TabularInline):
    model = DebtHistory
    extra = 0
    readonly_fields = ('created_at',)


@admin.register(Debt)
class DebtAdmin(admin.ModelAdmin):
    list_display = ('client_name', 'client_phone', 'tenant', 'remaining_debt_display', 'total_debt_display', 'due_date', 'is_overdue_display')
    list_filter = ('tenant', 'due_date')
    search_fields = ('client_name', 'client_phone')
    readonly_fields = ('id', 'created_at', 'updated_at', 'last_sms_sent_at')
    inlines = [DebtHistoryInline]

    def remaining_debt_display(self, obj):
        return f"{obj.remaining_debt:,.0f} so'm"
    remaining_debt_display.short_description = "Qolgan qarz"

    def total_debt_display(self, obj):
        return f"{obj.total_debt:,.0f} so'm"
    total_debt_display.short_description = "Jami olingan qarz"

    def is_overdue_display(self, obj):
        return "Muddati o'tgan" if obj.is_overdue else "Muddati bor"
    is_overdue_display.short_description = "Holati"


@admin.register(DebtHistory)
class DebtHistoryAdmin(admin.ModelAdmin):
    list_display = ('created_at', 'debt', 'type', 'amount_display', 'payment_method', 'performed_by')
    list_filter = ('type', 'payment_method', 'created_at', 'debt__tenant')
    search_fields = ('debt__client_name', 'debt__client_phone', 'notes')
    readonly_fields = ('id', 'created_at')

    def amount_display(self, obj):
        return f"{obj.amount:,.0f} so'm"
    amount_display.short_description = "Summa"
