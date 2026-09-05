import logging
from decimal import Decimal
from celery import shared_task
from django.utils import timezone
from apps.core.services.eskiz import EskizSMSService
from apps.core.models import AuditLog
from .models import Debt

logger = logging.getLogger(__name__)

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_single_sms_task(self, phone: str, message: str, debt_id: str = None, user_id: str = None):
    """
    Celery fonida yagona SMS yuborish.
    """
    sms_service = EskizSMSService()
    result = sms_service.send_sms(phone=phone, message=message)

    if result.get('success'):
        if debt_id:
            try:
                debt = Debt.objects.filter(id=debt_id).first()
                if debt:
                    debt.last_sms_sent_at = timezone.now()
                    debt.save(update_fields=['last_sms_sent_at', 'updated_at'])

                    AuditLog.objects.create(
                        tenant=debt.tenant,
                        action="sms_sent",
                        details={
                            'phone': phone,
                            'client_name': debt.client_name,
                            'debt_id': str(debt.id),
                            'sms_provider_id': result.get('id'),
                            'message': result.get('sent_text')
                        }
                    )
            except Exception as e:
                logger.error(f"SMS yuborilgandan so'ng qarz ma'lumotini yangilashda xato: {e}")
        return result
    else:
        logger.warning(f"SMS yuborilmadi ({phone}): {result.get('error')}")
        return result


@shared_task
def send_debt_reminders_task():
    """
    Celery Beat orqali avtomatik ishga tushadigan fon vazifasi.
    Qarzdorlik muddati o'tgan yoki muddati yaqinlashgan (2 kun qolgan) barcha mijozlarga
    avtomatik SMS eslatma jo'natadi.
    """
    today = timezone.now().date()
    sms_service = EskizSMSService()

    # Muddati o'tgan yoki bugun/ertaga muddati keladigan faol qarzlar
    debts = Debt.objects.filter(
        remaining_debt__gt=Decimal('0.00'),
        due_date__lte=today + timezone.timedelta(days=2)
    ).select_related('tenant')

    sent_count = 0
    for debt in debts:
        # Oxirgi 24 soat ichida allaqachon SMS yuborilgan bo'lsa qayta yubormaslik
        if debt.last_sms_sent_at and (timezone.now() - debt.last_sms_sent_at).total_seconds() < 86400:
            continue

        store_name = debt.tenant.name if debt.tenant else "SotuvPro"
        amount_formatted = f"{debt.remaining_debt:,.0f}".replace(',', ' ')
        due_date_str = debt.due_date.strftime('%d.%m.%Y') if debt.due_date else "belgilanmagan"

        message = (
            f"Hurmatli {debt.client_name}, {store_name} do'konidan "
            f"{amount_formatted} so'm qarz to'lash muddati: {due_date_str}. "
            f"Iltimos, o'z vaqtida to'lovni amalga oshirishingizni so'raymiz."
        )

        send_single_sms_task.delay(
            phone=debt.client_phone,
            message=message,
            debt_id=str(debt.id)
        )
        sent_count += 1

    logger.info(f"Avtomatik qarz eslatmalari yuborildi: {sent_count} ta mijozga navbatga qo'yildi.")
    return {'scheduled_count': sent_count}
