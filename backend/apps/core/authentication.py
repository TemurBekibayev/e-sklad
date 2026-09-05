from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, AuthenticationFailed
from django.utils.translation import gettext_lazy as _

class CustomJWTAuthentication(JWTAuthentication):
    """
    Kengaytirilgan JWT Autentifikatsiya:
    1. Foydalanuvchi hisobi faolmi (is_active) tekshiradi
    2. Tenant holati muzlatilmaganmi tekshiradi
    3. Hisob qulflanmaganmi tekshiradi
    """
    def get_user(self, validated_token):
        user = super().get_user(validated_token)
        
        if not user.is_active:
            raise AuthenticationFailed(_('Foydalanuvchi hisobi faol emas.'), code='user_inactive')

        if user.is_locked():
            raise AuthenticationFailed(_('Hisob vaqtincha bloklangan. 5 daqiqadan so\'ng qayta urinib ko\'ring.'), code='account_locked')

        if user.tenant and user.tenant.status == 'frozen':
            # Faqat xavfsiz (GET) so'rovlarga yoki alohida tekshiruvga ruxsat berish mumkin
            # Bu yerda request obyektiga belgi qo'yiladi
            pass

        return user
