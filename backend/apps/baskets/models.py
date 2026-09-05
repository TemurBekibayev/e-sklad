import uuid
from decimal import Decimal
from django.db import models
from django.conf import settings
from apps.core.models import BaseTenantModel
from apps.products.models import Product

class BasketStatus(models.TextChoices):
    ACTIVE = 'active', 'Faol'
    COMPLETED = 'completed', 'Yakunlangan'
    CANCELLED = 'cancelled', 'Bekor qilingan'
    STALE = 'stale', 'Eskirgan'
    PENDING_APPROVAL = 'pending_approval', 'Menejer tasdig\'ini kutmoqda'

class Basket(BaseTenantModel):
    worker = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='baskets',
        verbose_name="Savdo xodimi"
    )
    client_name = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        verbose_name="Mijoz ismi"
    )
    client_phone = models.CharField(
        max_length=30,
        null=True,
        blank=True,
        verbose_name="Mijoz telefon raqami"
    )
    status = models.CharField(
        max_length=30,
        choices=BasketStatus.choices,
        default=BasketStatus.ACTIVE,
        verbose_name="Savat holati"
    )
    notes = models.TextField(blank=True, default='', verbose_name="Izoh")

    class Meta:
        db_table = 'baskets'
        verbose_name = "Savat"
        verbose_name_plural = "Savatlar"
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['tenant', 'worker', 'status']),
            models.Index(fields=['tenant', 'status']),
        ]

    def __str__(self):
        client = self.client_name or "Nomsiz mijoz"
        return f"Savat #{str(self.id)[:8]} ({client}) - {self.get_status_display()}"

    @property
    def total_amount(self) -> Decimal:
        """Savatdagi umumiy summa"""
        total = Decimal('0.00')
        for item in self.items.select_related('product').all():
            total += item.subtotal
        return total

    @property
    def items_count(self) -> int:
        return self.items.count()


class BasketItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    basket = models.ForeignKey(
        Basket,
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name="Tegishli savat"
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='basket_items',
        verbose_name="Mahsulot"
    )
    quantity = models.DecimalField(
        max_digits=14,
        decimal_places=4,
        default=Decimal('1.0000'),
        verbose_name="Miqdor (sotish birligida)"
    )
    scanned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="Skanerlagan xodim"
    )
    added_at = models.DateTimeField(auto_now_add=True, verbose_name="Qo'shilgan vaqt")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Yangilangan vaqt")

    class Meta:
        db_table = 'basket_items'
        verbose_name = "Savat elementi"
        verbose_name_plural = "Savat elementlari"
        ordering = ['added_at']
        unique_together = ('basket', 'product')

    def __str__(self):
        return f"{self.product.name} x {self.quantity} {self.product.sale_unit}"

    @property
    def unit_price(self) -> Decimal:
        return self.product.price_per_sale_unit

    @property
    def subtotal(self) -> Decimal:
        return self.quantity * self.product.price_per_sale_unit
