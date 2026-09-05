import uuid
from decimal import Decimal
from django.db import models
from django.conf import settings
from apps.core.models import BaseTenantModel
from apps.baskets.models import Basket

class PaymentMethod(models.TextChoices):
    CASH = 'cash', 'Naqd'
    CARD = 'card', 'Karta'
    DEBT = 'debt', 'Qarz'
    MIXED = 'mixed', 'Aralash (Naqd + Qarz/Karta)'

class TransactionStatus(models.TextChoices):
    COMPLETED = 'completed', 'Muvaffaqiyatli yakunlangan'
    REFUNDED = 'refunded', 'Qaytarilgan (Refund)'
    PENDING_APPROVAL = 'pending_approval', 'Menejer tasdig\'ini kutmoqda'

class Transaction(BaseTenantModel):
    basket = models.ForeignKey(
        Basket,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='transactions',
        verbose_name="Tegishli savat"
    )
    finalized_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='finalized_transactions',
        verbose_name="Savdoni yakunlagan/yuborgan xodim"
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_transactions',
        verbose_name="Tasdiqlagan menejer"
    )
    payment_method = models.CharField(
        max_length=20,
        choices=PaymentMethod.choices,
        verbose_name="To'lov turi"
    )
    cash_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name="Naqd to'langan summa"
    )
    card_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name="Karta orqali to'langan summa"
    )
    debt_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name="Qarzga yozilgan summa"
    )
    discount_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name="Chegirma summasi"
    )
    total_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        verbose_name="Jami yakuniy summa"
    )
    status = models.CharField(
        max_length=30,
        choices=TransactionStatus.choices,
        default=TransactionStatus.COMPLETED,
        verbose_name="Tranzaksiya holati"
    )
    client_name = models.CharField(
        max_length=255,
        blank=True,
        default='',
        verbose_name="Mijoz ismi"
    )
    client_phone = models.CharField(
        max_length=30,
        blank=True,
        default='',
        verbose_name="Mijoz telefoni"
    )
    items_snapshot = models.JSONField(
        default=list,
        blank=True,
        verbose_name="Sotilgan tovarlar ro'yxati (snapshot)"
    )
    refund_reason = models.TextField(
        blank=True,
        default='',
        verbose_name="Qaytarish sababi"
    )
    refunded_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Qaytarilgan sana"
    )

    class Meta:
        db_table = 'transactions'
        verbose_name = "Savdo tranzaksiyasi"
        verbose_name_plural = "Savdo tranzaksiyalari"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['tenant', 'created_at']),
            models.Index(fields=['tenant', 'status']),
            models.Index(fields=['tenant', 'finalized_by']),
        ]

    def __str__(self):
        return f"Savdo #{str(self.id)[:8]} | {self.total_amount:,.0f} so'm | {self.get_payment_method_display()}"
