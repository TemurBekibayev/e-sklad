from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import Tenant, User, AuditLog

@admin.register(Tenant)
class TenantAdmin(admin.ModelAdmin):
    list_display = ('name', 'status', 'address', 'created_at', 'users_count')
    list_filter = ('status', 'created_at')
    search_fields = ('name', 'address')
    readonly_fields = ('id', 'created_at', 'updated_at')

    def users_count(self, obj):
        return obj.users.count()
    users_count.short_description = "Xodimlar soni"


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('name', 'email', 'tenant', 'role', 'is_active', 'failed_pin_attempts', 'locked_until')
    list_filter = ('role', 'is_active', 'tenant')
    search_fields = ('name', 'email', 'phone_number')
    ordering = ('-created_at',)
    readonly_fields = ('id', 'created_at', 'updated_at', 'failed_pin_attempts', 'locked_until')
    
    fieldsets = (
        ('Shaxsiy ma\'lumotlar', {'fields': ('id', 'name', 'email', 'phone_number', 'password', 'pin_hash')}),
        ('Roli va Do\'koni', {'fields': ('tenant', 'role', 'is_active', 'is_staff', 'is_superuser')}),
        ('Xavfsizlik & Bloklash', {'fields': ('failed_pin_attempts', 'locked_until')}),
        ('Tizim vaqtlari', {'fields': ('created_at', 'updated_at')}),
    )


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('created_at', 'tenant', 'user', 'action', 'ip_address')
    list_filter = ('action', 'tenant', 'created_at')
    search_fields = ('action', 'user__name', 'details')
    readonly_fields = ('id', 'tenant', 'user', 'action', 'details', 'ip_address', 'created_at')

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
