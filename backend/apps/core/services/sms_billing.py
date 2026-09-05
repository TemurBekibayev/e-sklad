from decimal import Decimal
from django.utils import timezone
from apps.core.models import Tenant, AuditLog

def get_tenant_billing_summary(tenant: Tenant) -> dict:
    """
    Do'konning joriy oydagi SMS xarajatlari va platforma oylik abonent to'lovini hisoblash.
    Menejer Eskiz.uz ichki ma'lumotlarini ko'rmaydi, faqat o'z do'konining haqiqiy hisobini ko'radi.
    """
    now = timezone.now()
    start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # 1. Joriy oyda yuborilgan SMS'lar soni (AuditLog bo'yicha)
    sms_count = AuditLog.objects.filter(
        tenant=tenant,
        action__in=['sms_sent', 'otp_sent'],
        created_at__gte=start_of_month
    ).count()

    sms_price = tenant.sms_price_per_unit or Decimal('100.00')
    sms_total_cost = Decimal(str(sms_count)) * sms_price
    subscription_fee = tenant.subscription_monthly_fee or Decimal('250000.00')
    total_due = subscription_fee + sms_total_cost

    month_names = {
        1: 'Yanvar', 2: 'Fevral', 3: 'Mart', 4: 'Aprel',
        5: 'May', 6: 'Iyun', 7: 'Iyul', 8: 'Avgust',
        9: 'Sentyabr', 10: 'Oktyabr', 11: 'Noyabr', 12: 'Dekabr'
    }
    current_month_str = f"{month_names.get(now.month, '')} {now.year}"

    return {
        'tenant_id': str(tenant.id),
        'tenant_name': tenant.name,
        'billing_period': current_month_str,
        'sms_used_count': sms_count,
        'sms_unit_price': float(sms_price),
        'sms_total_cost': float(sms_total_cost),
        'subscription_monthly_fee': float(subscription_fee),
        'total_due_amount': float(total_due),
        'currency': 'UZS'
    }
