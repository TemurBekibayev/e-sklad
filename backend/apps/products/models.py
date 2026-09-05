import uuid
from decimal import Decimal
from django.db import models
from django.conf import settings
from apps.core.models import BaseTenantModel

class MovementType(models.TextChoices):
    KIRIM = 'kirim', 'Kirim'
    CHIQIM = 'chiqim', 'Chiqim'
    TUZATISH = 'tuzatish', 'Inventarizatsiya tuzatishi'

class Product(BaseTenantModel):
    name = models.CharField(max_length=255, verbose_name="Mahsulot nomi")
    purchase_unit = models.CharField(
        max_length=50,
        verbose_name="Kelish birligi",
        help_text="Masalan: qop, tonna, rulon, blok"
    )
    sale_unit = models.CharField(
        max_length=50,
        verbose_name="Sotish birligi",
        help_text="Masalan: dona, metr, kg, litr"
    )
    conversion_factor = models.DecimalField(
        max_digits=12,
        decimal_places=4,
        default=Decimal('1.0000'),
        verbose_name="Konversiya koeffitsienti",
        help_text="1 kelish birligi nechta sotish birligiga tengligi (masalan 1 qop = 50 kg bo'lsa: 50)"
    )
    price_per_sale_unit = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        verbose_name="Sotish birligi narxi (so'mda)"
    )
    current_stock = models.DecimalField(
        max_digits=14,
        decimal_places=4,
        default=Decimal('0.0000'),
        verbose_name="Joriy qoldiq (sotish birligida)"
    )
    reserved_stock = models.DecimalField(
        max_digits=14,
        decimal_places=4,
        default=Decimal('0.0000'),
        verbose_name="Band qilingan qoldiq (savatchalarda)"
    )
    barcode = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        db_index=True,
        verbose_name="Shtrix kod (Barcode)"
    )
    qr_code = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        db_index=True,
        verbose_name="QR kod"
    )
    low_stock_threshold = models.DecimalField(
        max_digits=14,
        decimal_places=4,
        default=Decimal('5.0000'),
        verbose_name="Kam qoldiq chegarasi"
    )
    is_archived = models.BooleanField(default=False, verbose_name="Arxivlanganmi")

    class Meta:
        db_table = 'products'
        verbose_name = "Mahsulot"
        verbose_name_plural = "Mahsulotlar"
        ordering = ['name']
        indexes = [
            models.Index(fields=['tenant', 'barcode']),
            models.Index(fields=['tenant', 'qr_code']),
            models.Index(fields=['tenant', 'is_archived']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['tenant', 'barcode'],
                condition=models.Q(barcode__isnull=False) & ~models.Q(barcode=''),
                name='unique_product_barcode_per_tenant'
            ),
            models.UniqueConstraint(
                fields=['tenant', 'qr_code'],
                condition=models.Q(qr_code__isnull=False) & ~models.Q(qr_code=''),
                name='unique_product_qrcode_per_tenant'
            ),
        ]

    def __str__(self):
        return f"{self.name} ({self.current_stock} {self.sale_unit})"

    @property
    def available_stock(self) -> Decimal:
        """Sotuvga tayyor bo'lgan erkin qoldiq"""
        return max(Decimal('0'), self.current_stock - self.reserved_stock)

    @property
    def is_low_stock(self) -> bool:
        """Kam qoldiq bo'lib qolganligini tekshirish"""
        return self.available_stock <= self.low_stock_threshold


class StockMovement(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='movements',
        verbose_name="Mahsulot"
    )
    type = models.CharField(
        max_length=20,
        choices=MovementType.choices,
        verbose_name="Harakat turi"
    )
    purchase_unit_amount = models.DecimalField(
        max_digits=14,
        decimal_places=4,
        null=True,
        blank=True,
        verbose_name="Kelish birligidagi miqdor"
    )
    sale_unit_amount = models.DecimalField(
        max_digits=14,
        decimal_places=4,
        verbose_name="Sotish birligidagi miqdor"
    )
    reason = models.TextField(
        blank=True,
        default='',
        verbose_name="Sabab/Izoh (inventarizatsiya tuzatishi uchun)"
    )
    performed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="Bajaruvchi xodim"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Sana va vaqt")

    class Meta:
        db_table = 'stock_movements'
        verbose_name = "Sklad harakati"
        verbose_name_plural = "Sklad harakatlari"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.product.name} | {self.get_type_display()} | {self.sale_unit_amount} {self.product.sale_unit}"


class PriceHistory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='price_history',
        verbose_name="Mahsulot"
    )
    old_price = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        verbose_name="Eski narx"
    )
    new_price = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        verbose_name="Yangi narx"
    )
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="O'zgartiruvchi xodim"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="O'zgargan sana")

    class Meta:
        db_table = 'price_history'
        verbose_name = "Narx o'zgarishi tarixi"
        verbose_name_plural = "Narxlar tarixi"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.product.name}: {self.old_price} -> {self.new_price}"
