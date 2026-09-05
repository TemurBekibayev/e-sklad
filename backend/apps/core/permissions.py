from rest_framework import permissions
from .models import UserRole, TenantStatus

class IsPlatformAdmin(permissions.BasePermission):
    """Faqat Platforma Super Adminiga ruxsat"""
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            (request.user.role == UserRole.ADMIN or request.user.is_superuser)
        )


class IsManager(permissions.BasePermission):
    """Do'kon menejeri yoki Platforma adminiga ruxsat"""
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.role in [UserRole.MANAGER, UserRole.ADMIN]
        )


class IsWorker(permissions.BasePermission):
    """Savdo xodimiga ruxsat"""
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.role in [UserRole.WORKER, UserRole.MANAGER, UserRole.ADMIN]
        )


class IsTenantActive(permissions.BasePermission):
    """
    Do'kon muzlatilgan (frozen) bo'lsa, faqat ma'lumotlarni o'qish (GET, HEAD, OPTIONS)
    mumkin, yangi yozish/tahrirlash (POST, PUT, PATCH, DELETE) taqiqlanadi.
    """
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        # Platforma adminiga cheklov yo'q
        if user.role == UserRole.ADMIN or user.is_superuser:
            return True

        if not user.tenant:
            return False

        if user.tenant.status == TenantStatus.FROZEN:
            if request.method in permissions.SAFE_METHODS:
                return True
            return False

        return True
