import logging
import re
import requests
from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)

class EskizSMSService:
    """
    Eskiz.uz SMS Gateway integratsiyasi.
    - Avtomatik JWT token olish va Redis'da keshlashtirish (25 kunlik TTL).
    - Telefon raqamlarini tozalash (998901234567 formatiga keltirish).
    - Sinov rejimi (ESKIZ_IS_TEST=True) da Eskiz qoidalariga muvofiq test xabar jo'natish.
    - SMS statusini tekshirish.
    """
    BASE_URL = "https://notify.eskiz.uz/api"
    TOKEN_CACHE_KEY = "eskiz_auth_token"
    TOKEN_CACHE_TIMEOUT = 25 * 24 * 3600  # 25 kun

    def __init__(self):
        self.email = getattr(settings, 'ESKIZ_EMAIL', '')
        self.password = getattr(settings, 'ESKIZ_PASSWORD', '')
        self.from_nick = getattr(settings, 'ESKIZ_FROM', '4546')
        self.is_test = getattr(settings, 'ESKIZ_IS_TEST', True)

    def clean_phone_number(self, phone: str) -> str:
        """
        Telefon raqamidan ortiqcha belgilarni olib tashlab, 998XXXXXXXXX formatiga keltiradi.
        """
        cleaned = re.sub(r'\D', '', str(phone))
        if len(cleaned) == 9:
            cleaned = '998' + cleaned
        elif len(cleaned) == 12 and cleaned.startswith('998'):
            pass
        return cleaned

    def get_token(self, force_refresh: bool = False) -> str:
        """
        Eskiz API JWT tokenni oladi (Redis keshidan yoki yangitdan login qilib).
        """
        if not force_refresh:
            cached_token = cache.get(self.TOKEN_CACHE_KEY)
            if cached_token:
                return cached_token

        if not self.email or not self.password:
            logger.warning("ESKIZ_EMAIL yoki ESKIZ_PASSWORD sozlanmagan!")
            return ""

        try:
            url = f"{self.BASE_URL}/auth/login"
            payload = {
                'email': self.email,
                'password': self.password
            }
            response = requests.post(url, data=payload, timeout=10)
            if response.status_code == 200:
                data = response.json()
                token = data.get('data', {}).get('token')
                if token:
                    cache.set(self.TOKEN_CACHE_KEY, token, self.TOKEN_CACHE_TIMEOUT)
                    logger.info("Eskiz.uz yangi JWT token muvaffaqiyatli olindi.")
                    return token
            logger.error(f"Eskiz login xatosi ({response.status_code}): {response.text}")
        except Exception as e:
            logger.error(f"Eskiz auth serveriga ulanishda xatolik: {e}")
        
        return ""

    def send_sms(self, phone: str, message: str, from_nick: str = None) -> dict:
        """
        Yagona SMS yuborish.
        """
        cleaned_phone = self.clean_phone_number(phone)
        if len(cleaned_phone) != 12:
            return {
                'success': False,
                'error': f"Telefon raqami noto'g'ri formatda: {phone} (998901234567 bo'lishi kerak)"
            }

        # Sinov rejimida Eskiz faqat ruxsat berilgan matnlarni qabul qiladi
        final_message = "Bu Eskiz dan test" if self.is_test else message
        sender_nick = from_nick or self.from_nick

        token = self.get_token()
        if not token:
            return {
                'success': False,
                'error': "Eskiz API tokeni mavjud emas yoki login xato."
            }

        url = f"{self.BASE_URL}/message/sms/send"
        headers = {
            'Authorization': f'Bearer {token}'
        }
        payload = {
            'mobile_phone': cleaned_phone,
            'message': final_message,
            'from': sender_nick
        }

        try:
            response = requests.post(url, data=payload, headers=headers, timeout=12)
            
            # Agar token eskirgan bo'lsa (401), bir marta yangilab qayta urinish
            if response.status_code == 401:
                logger.info("Eskiz token eskirgan, yangilanmoqda...")
                token = self.get_token(force_refresh=True)
                headers['Authorization'] = f'Bearer {token}'
                response = requests.post(url, data=payload, headers=headers, timeout=12)

            if response.status_code == 200:
                resp_data = response.json()
                logger.info(f"SMS muvaffaqiyatli yuborildi ({cleaned_phone}): {resp_data}")
                return {
                    'success': True,
                    'id': resp_data.get('id'),
                    'message': resp_data.get('message'),
                    'status': resp_data.get('status', 'waiting'),
                    'phone': cleaned_phone,
                    'sent_text': final_message
                }
            else:
                logger.error(f"Eskiz SMS yuborishda xatolik ({response.status_code}): {response.text}")
                return {
                    'success': False,
                    'status_code': response.status_code,
                    'error': response.text
                }
        except Exception as e:
            logger.error(f"Eskiz serveriga so'rov yuborishda xatolik: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    def get_sms_status(self, sms_id: str) -> dict:
        """
        Yuborilgan SMS statusini tekshirish (DELIVERED, REJECTED, WAITING va h.k.).
        """
        token = self.get_token()
        if not token:
            return {'success': False, 'error': "Token topilmadi."}

        url = f"{self.BASE_URL}/message/sms/status_by_id/{sms_id}"
        headers = {'Authorization': f'Bearer {token}'}

        try:
            response = requests.get(url, headers=headers, timeout=10)
            if response.status_code == 200:
                return {
                    'success': True,
                    'data': response.json().get('data', {})
                }
            return {
                'success': False,
                'status_code': response.status_code,
                'error': response.text
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def get_user_prices(self) -> dict:
        """
        SMS tariflari va narxlarini olish.
        """
        token = self.get_token()
        if not token:
            return {'success': False, 'error': "Token topilmadi."}

        url = f"{self.BASE_URL}/user/prices"
        headers = {'Authorization': f'Bearer {token}'}

        try:
            response = requests.get(url, headers=headers, timeout=10)
            if response.status_code == 200:
                return {'success': True, 'data': response.json()}
            return {'success': False, 'error': response.text}
        except Exception as e:
            return {'success': False, 'error': str(e)}
