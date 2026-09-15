import uuid
from decimal import Decimal
from django.db import models
from django.utils import timezone
from apps.core.models import BaseTenantModel, User
from apps.products.models import Product

class Hall(BaseTenantModel):
    name = models.CharField(max_length=100, verbose_name=Zal nomi)
    service_percent = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name=Xizmat foizi (%)
    )
    is_active = models.BooleanField(default=True, verbose_name=Faol)
    sort_order = models.IntegerField(default=1, verbose_name=Tartib raqami)

    class Meta:
        db_table = 'cafe_halls'
        verbose_name = 'Zal'
        verbose_name_plural = 'Zallar'
        ordering = ['sort_order', 'name']
        indexes = [
            models.Index(fields=['tenant', 'is_active']),
        ]

    def __str__(self):
        return f{self.name} ({self.tenant.name})


class TableStatus(models.TextChoices):
    FREE = 'free', Bo'sh
    BUSY = 'busy', 'Band'
    BILL_REQUESTED = 'bill_requested', Hisob so'ralgan
    RESERVED = 'reserved', 'Bron qilingan'


class Table(BaseTenantModel):
    hall = models.ForeignKey(
        Hall,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tables',
        verbose_name=Zal
    )
    number = models.IntegerField(verbose_name=Stol raqami)
    name = models.CharField(max_length=100, verbose_name=Stol nomi)
    capacity = models.IntegerField(default=4, verbose_name=Sig'imi)
    status = models.CharField(
        max_length=20,
        choices=TableStatus.choices,
        default=TableStatus.FREE,
        db_index=True,
        verbose_name=Holati
    )
    current_waiter = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='current_tables',
        verbose_name=Ofitsiant
    )
    active_order_id = models.UUIDField(null=True, blank=True, verbose_name=Faol buyurtma ID)
    qr_token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False, verbose_name=QR Menyu kodi)

    class Meta:
        db_table = 'cafe_tables'
        verbose_name = 'Stol'
        verbose_name_plural = 'Stollar'
        ordering = ['number']
        indexes = [
            models.Index(fields=['tenant', 'status']),
            models.Index(fields=['tenant', 'number']),
        ]

    def __str__(self):
        return f{self.name} - {self.get_status_display()}


class OrderStatus(models.TextChoices):
    OPEN = 'open', 'Ochiq'
    BILL_REQUESTED = 'bill_requested', Hisob so'ralgan
    PAID = 'paid', To'langan
    CANCELLED = 'cancelled', 'Bekor qilingan'


class PaymentMethod(models.TextChoices):
    CASH = 'cash', 'Naqd'
    CARD = 'card', 'Karta'
    SPLIT = 'split', 'Aralash'
    OTHER = 'other', 'Boshqa'


class Order(BaseTenantModel):
    order_number = models.CharField(max_length=50, db_index=True, verbose_name=Buyurtma raqami)
    table = models.ForeignKey(
        Table,
        on_delete=models.CASCADE,
        related_name='orders',
        verbose_name=Stol
    )
    waiter = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cafe_orders',
        verbose_name=Ofitsiant
    )
    waiter_name = models.CharField(max_length=150, blank=True, default='', verbose_name=Ofitsiant ismi)
    status = models.CharField(
        max_length=20,
        choices=OrderStatus.choices,
        default=OrderStatus.OPEN,
        db_index=True,
        verbose_name=Buyurtma holati
    )
    service_percent = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name=Xizmat foizi
    )
    service_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name=Xizmat haqi
    )
    discount_percent = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name=Chegirma foizi
    )
    discount_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name=Chegirma summasi
    )
    subtotal = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name=Taomlar summasi
    )
    total_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name=Jami to'lov
    )
    payment_method = models.CharField(
        max_length=20,
        choices=PaymentMethod.choices,
        default=PaymentMethod.CASH,
        verbose_name=To'lov usuli
    )
    cash_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name=Naqd summa
    )
    card_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name=Karta summa
    )
    guests_count = models.IntegerField(default=1, verbose_name=Mehmonlar soni)
    notes = models.TextField(blank=True, default='', verbose_name=Izoh)
    opened_at = models.DateTimeField(default=timezone.now, verbose_name=Ochilgan vaqti)
    closed_at = models.DateTimeField(null=True, blank=True, verbose_name=Yopilgan vaqti)

    class Meta:
        db_table = 'cafe_orders'
        verbose_name = 'Kafe Buyurtmasi'
        verbose_name_plural = 'Kafe Buyurtmalari'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['tenant', 'status']),
            models.Index(fields=['tenant', 'created_at']),
            models.Index(fields=['tenant', 'table', 'status']),
        ]

    def __str__(self):
        return f{self.order_number} - {self.table.name} ({self.get_status_display()})

    def recalculate_totals(self, save=True):
        items = self.items.exclude(status='cancelled')
        subtotal_val = sum((item.price * item.quantity for item in items), Decimal('0.00'))
        self.subtotal = subtotal_val

        if self.service_percent > 0:
            self.service_amount = (self.subtotal * self.service_percent / Decimal('100.00')).quantize(Decimal('0.01'))
        else:
            self.service_amount = Decimal('0.00')

        if self.discount_percent > 0:
            self.discount_amount = ((self.subtotal + self.service_amount) * self.discount_percent / Decimal('100.00')).quantize(Decimal('0.01'))

        self.total_amount = self.subtotal + self.service_amount - self.discount_amount
        if save:
            self.save(update_fields=['subtotal', 'service_amount', 'discount_amount', 'total_amount', 'updated_at'])


class OrderItemStatus(models.TextChoices):
    NEW = 'new', 'Yangi'
    COOKING = 'cooking', 'Tayyorlanmoqda'
    READY = 'ready', 'Tayyor'
    SERVED = 'served', 'Yetkazildi'
    CANCELLED = 'cancelled', 'Bekor qilingan'


class OrderItem(BaseTenantModel):
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name=Buyurtma
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cafe_order_items',
        verbose_name=Mahsulot
    )
    product_name = models.CharField(max_length=255, verbose_name=Taom nomi)
    quantity = models.IntegerField(default=1, verbose_name=Miqdori)
    price = models.DecimalField(max_digits=14, decimal_places=2, verbose_name=Narxi)
    total_price = models.DecimalField(max_digits=14, decimal_places=2, verbose_name=Jami narxi)
    comment = models.CharField(max_length=255, blank=True, default='', verbose_name=Oshpazga izoh)
    workshop = models.CharField(max_length=100, default='Oshxona', verbose_name=Sex)
    status = models.CharField(
        max_length=20,
        choices=OrderItemStatus.choices,
        default=OrderItemStatus.NEW,
        verbose_name=Holati
    )
    printed_at = models.DateTimeField(null=True, blank=True, verbose_name=Oshxona cheki vaqti)

    class Meta:
        db_table = 'cafe_order_items'
        verbose_name = 'Buyurtmadagi Taom'
        verbose_name_plural = 'Buyurtmadagi Taomlar'
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['tenant', 'order']),
            models.Index(fields=['tenant', 'status']),
        ]

    def save(self, *args, **kwargs):
        self.total_price = (self.price * Decimal(self.quantity)).quantize(Decimal('0.01'))
        super().save(*args, **kwargs)


class Shift(BaseTenantModel):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='cafe_shifts',
        verbose_name=Kassir
    )
    opened_at = models.DateTimeField(default=timezone.now, verbose_name=Ochilgan vaqt)
    closed_at = models.DateTimeField(null=True, blank=True, verbose_name=Yopilgan vaqt)
    opening_cash = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'), verbose_name=Boshlang'ich naqd)
    closing_cash = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'), verbose_name=Yopilishdagi naqd)
    total_sales = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'), verbose_name=Jami savdo)
    status = models.CharField(
        max_length=20,
        choices=[('open', 'Ochiq'), ('closed', 'Yopilgan')],
        default='open',
        verbose_name=Holati
    )

    class Meta:
        db_table = 'cafe_shifts'
        verbose_name = 'Kassa Smenasi'
        verbose_name_plural = 'Kassa Smenalari'
        ordering = ['-opened_at']
