from django.utils.deprecation import MiddlewareMixin
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.contrib.auth.models import AnonymousUser

class TenantContextMiddleware(MiddlewareMixin):
    """
    Har bir kelgan so'rovdan JWT token orqali tenant_id ni olib,
    request.tenant ga biriktiradi.
    Foydalanuvchi yuborgan parametrga emas, faqat tasdiqlangan tokenga tayanadi.
    """
    def process_request(self, request):
        request.tenant = None
        user = getattr(request, 'user', None)

        if not user or not user.is_authenticated:
            # Agar session auth bo'lmasa, JWT orqali autentifikatsiya qilishga urinish
            try:
                jwt_auth = JWTAuthentication()
                auth_result = jwt_auth.authenticate(request)
                if auth_result is not None:
                    user, _ = auth_result
                    request.user = user
            except Exception:
                pass

        if request.user and request.user.is_authenticated:
            request.tenant = getattr(request.user, 'tenant', None)
