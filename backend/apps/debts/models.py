import uuid
from decimal import Decimal
from django.db import models
from django.conf import settings
from django.utils import timezone
from apps.core.models import BaseTenantModel
from apps.transactions.models import Transaction

class DebtHistoryType(models.TextChoices):
    BORROWED = 'borrowed', 'Qarz olindi'
    PAID = 'paid', 'Qarz to\'landi'

class DebtPaymentMethod(models.TextChoices):
    CASH = 'cash', 'Naqd'
    CARD = 'card', 'Karta'

class Debt(BaseTenantModel):
    client_name = models.CharField(
        max_length=255,
        verbose_name="Mijoz ismi"
    )
    client_phone = models.CharField(
        max_length=30,
        verbose_name="Mijoz telefon raqami"
    )
    total_debt = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name="Jami olingan qarz summasi"
    )
    remaining_debt = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name="Qolgan (to'lanmagan) qarz summasi"
    )
    due_date = models.DateField(
        null=True,
        blank=True,
        verbose_name="Qarzni to'lash muddati"
    )
    last_sms_sent_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Oxirgi SMS yuborilgan vaqt"
    )
    is_phone_verified = models.BooleanField(
        default=False,
        verbose_name="Telefon raqami SMS-kod bilan tasdiqlanganmi"
    )
    verified_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Tasdiqlangan sana va vaqt"
    )
    notes = models.TextField(
        blank=True,
        default='',
        verbose_name="Izoh/Qaydlar"
    )

    class Meta:
        db_table = 'debts'
        verbose_name = "Qarz"
        verbose_name_plural = "Qarzlar"
        ordering = ['-remaining_debt', '-updated_at']
        indexes = [
            models.Index(fields=['tenant', 'client_phone']),
            models.Index(fields=['tenant', 'remaining_debt']),
        ]

    def __str__(self):
        return f"{self.client_name} ({self.client_phone}) - Qoldiq: {self.remaining_debt:,.0f} so'm"

    @property
    def is_overdue(self) -> bool:
        """Qarz muddati o'tganligini tekshirish"""
        if self.remaining_debt > 0 and self.due_date:
            return self.due_date < timezone.now().date()
        return False


class DebtHistory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    debt = models.ForeignKey(
        Debt,
        on_delete=models.CASCADE,
        related_name='history',
        verbose_name="Qarz daftari yozuvi"
    )
    transaction = models.ForeignKey(
        Transaction,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='debt_histories',
        verbose_name="Tegishli savdo"
    )
    amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        verbose_name="Summa"
    )
    type = models.CharField(
        max_length=20,
        choices=DebtHistoryType.choices,
        verbose_name="Amal turi"
    )
    payment_method = models.CharField(
        max_length=20,
        choices=DebtPaymentMethod.choices,
        default=DebtPaymentMethod.CASH,
        verbose_name="To'lov turi"
    )
    performed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="Qabul qilgan xodim"
    )
    notes = models.TextField(
        blank=True,
        default='',
        verbose_name="To'lov izohi"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Sana va vaqt")

    class Meta:
        db_table = 'debt_history'
        verbose_name = "Qarz harakati tarixi"
        verbose_name_plural = "Qarzlar tarixi"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.debt.client_name} | {self.get_type_display()} | {self.amount:,.0f} so'm"
