import uuid
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.contrib.auth.hashers import make_password, check_password
from django.utils import timezone
from decimal import Decimal

class TenantStatus(models.TextChoices):
    ACTIVE = 'active', 'Faol'
    FROZEN = 'frozen', 'Muzlatilgan'

class UserRole(models.TextChoices):
    WORKER = 'worker', 'Savdo xodimi'
    MANAGER = 'manager', 'Menejer'
    ADMIN = 'admin', 'Platforma admini'

class Tenant(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, verbose_name="Do'kon nomi")
    address = models.TextField(blank=True, default='', verbose_name="Manzil")
    status = models.CharField(
        max_length=20,
        choices=TenantStatus.choices,
        default=TenantStatus.ACTIVE,
        verbose_name="Holati"
    )
    settings = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Do'kon sozlamalari",
        help_text="Masalan: {'max_worker_finalize_amount': 500000, 'allow_negative_stock': False}"
    )
    subscription_monthly_fee = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal('250000.00'),
        verbose_name="Oylik platforma abonent to'lovi (so'mda)"
    )
    sms_price_per_unit = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('100.00'),
        verbose_name="Bitta SMS narxi (so'mda)"
    )
    paid_until = models.DateField(
        null=True,
        blank=True,
        verbose_name="To'langan muddat (gacha)"
    )
    auto_freeze_on_expiry = models.BooleanField(
        default=True,
        verbose_name="Muddat o'tganda avtomatik bloklash"
    )
    last_payment_date = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Oxirgi to'lov sanasi"
    )
    last_payment_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Oxirgi to'lov summasi"
    )
    freeze_reason = models.CharField(
        max_length=255,
        blank=True,
        default='',
        verbose_name="Muzlatish sababi"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Qo'shilgan sana")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Yangilangan sana")

    class Meta:
        db_table = 'tenants'
        verbose_name = "Do'kon (Tenant)"
        verbose_name_plural = "Do'konlar (Tenants)"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.get_status_display()})"

    @property
    def is_subscription_active(self) -> bool:
        if not self.paid_until:
            return True
        return self.paid_until >= timezone.now().date()

    @property
    def days_left(self) -> int:
        if not self.paid_until:
            return 9999
        delta = self.paid_until - timezone.now().date()
        return delta.days

    def check_and_update_subscription(self, save=True):
        """
        Oylik to'lov muddatini tekshirish:
        - Agar paid_until o'tib ketgan bo'lsa va auto_freeze_on_expiry bo'lsa -> FROZEN holatiga o'tkazish
        - Agar paid_until kelajakda bo'lsa va to'lov tufayli muzlatilgan bo'lsa -> ACTIVE holatiga qaytarish
        """
        if not self.auto_freeze_on_expiry or not self.paid_until:
            return self.status

        today = timezone.now().date()
        if self.paid_until < today:
            if self.status != TenantStatus.FROZEN:
                self.status = TenantStatus.FROZEN
                self.freeze_reason = f"Oylik to'lov muddati tugagan ({self.paid_until.strftime('%Y-%m-%d')})"
                if save:
                    self.save(update_fields=['status', 'freeze_reason', 'updated_at'])
                    try:
                        AuditLog.objects.create(
                            tenant=self,
                            action='tenant_auto_frozen',
                            details={'reason': self.freeze_reason, 'paid_until': str(self.paid_until)}
                        )
                    except Exception:
                        pass
        else:
            if self.status == TenantStatus.FROZEN and ('to\'lov' in self.freeze_reason.lower() or 'tolov' in self.freeze_reason.lower() or not self.freeze_reason):
                self.status = TenantStatus.ACTIVE
                self.freeze_reason = ''
                if save:
                    self.save(update_fields=['status', 'freeze_reason', 'updated_at'])
                    try:
                        AuditLog.objects.create(
                            tenant=self,
                            action='tenant_auto_unfrozen',
                            details={'reason': "To'lov amal qilmoqda", 'paid_until': str(self.paid_until)}
                        )
                    except Exception:
                        pass
        return self.status


class TenantQuerySet(models.QuerySet):
    def for_tenant(self, tenant):
        if not tenant:
            return self.none()
        return self.filter(tenant=tenant)


class TenantManager(models.Manager):
    def get_queryset(self):
        return TenantQuerySet(self.model, using=self._db)

    def for_tenant(self, tenant):
        return self.get_queryset().for_tenant(tenant)


class BaseTenantModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="%(app_label)s_%(class)ss",
        verbose_name="Do'kon"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Yaratilgan sana")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Yangilangan sana")

    objects = TenantManager()

    class Meta:
        abstract = True


class UserManager(BaseUserManager):
    def create_user(self, email=None, name=None, password=None, pin=None, role=UserRole.WORKER, tenant=None, **extra_fields):
        if email:
            email = self.normalize_email(email)
        
        user = self.model(
            email=email,
            name=name or (email if email else 'User'),
            role=role,
            tenant=tenant,
            **extra_fields
        )
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()

        if pin:
            user.set_pin(pin)

        user.save(using=self._db)
        return user

    def create_superuser(self, email, password, name="Administrator", **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', UserRole.ADMIN)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self.create_user(email=email, name=name, password=password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='users',
        verbose_name="Tegishli Do'kon"
    )
    name = models.CharField(max_length=255, verbose_name="Foydalanuvchi ismi")
    email = models.EmailField(unique=True, null=True, blank=True, verbose_name="Email")
    phone_number = models.CharField(max_length=30, blank=True, default='', verbose_name="Telefon raqami")
    pin_hash = models.CharField(max_length=255, blank=True, default='', verbose_name="PIN Xesh")
    plain_pin = models.CharField(max_length=10, blank=True, default='', verbose_name="Ochiq PIN")
    plain_password = models.CharField(max_length=128, blank=True, default='', verbose_name="Ochiq Parol")
    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.WORKER,
        verbose_name="Roli"
    )
    is_active = models.BooleanField(default=True, verbose_name="Faolmi")
    is_staff = models.BooleanField(default=False, verbose_name="Xodim maqomi")

    # Qarzga sotish ruxsati va limitlari (Menejer boshqaradigan qism)
    can_sell_on_debt = models.BooleanField(
        default=False, 
        verbose_name="Menejer tasdig'isiz qarzga sotish ruxsati"
    )
    max_debt_limit = models.DecimalField(
        max_digits=14, 
        decimal_places=2, 
        default=Decimal('1500000.00'), 
        verbose_name="Ruxsatsiz maksimal qarz limiti (so'mda)"
    )
    
    # Brute-force himoyasi (5 ta xatodan so'ng 5 daqiqa blok)
    failed_pin_attempts = models.PositiveIntegerField(default=0, verbose_name="Muvaffaqiyatsiz PIN urinishlar")
    locked_until = models.DateTimeField(null=True, blank=True, verbose_name="Qulflangan vaqtigacha")

    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Yaratilgan sana")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Yangilangan sana")

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['name']

    class Meta:
        db_table = 'users'
        verbose_name = "Foydalanuvchi"
        verbose_name_plural = "Foydalanuvchilar"
        ordering = ['-created_at']

    def __str__(self):
        tenant_str = f" [{self.tenant.name}]" if self.tenant else " [Platforma Admin]"
        return f"{self.name} ({self.get_role_display()}){tenant_str}"

    def set_pin(self, pin: str):
        self.pin_hash = make_password(str(pin).strip())
        self.plain_pin = str(pin).strip()

    def set_password(self, raw_password):
        super().set_password(raw_password)
        self.plain_password = str(raw_password).strip()

    def check_pin(self, pin: str) -> bool:
        if not self.pin_hash:
            return False
        return check_password(str(pin).strip(), self.pin_hash)

    def is_locked(self) -> bool:
        if self.locked_until and self.locked_until > timezone.now():
            return True
        return False

    def register_failed_attempt(self):
        self.failed_pin_attempts += 1
        if self.failed_pin_attempts >= 5:
            self.locked_until = timezone.now() + timedelta(minutes=5)
        self.save(update_fields=['failed_pin_attempts', 'locked_until'])

    def reset_failed_attempts(self):
        if self.failed_pin_attempts > 0 or self.locked_until is not None:
            self.failed_pin_attempts = 0
            self.locked_until = None
            self.save(update_fields=['failed_pin_attempts', 'locked_until'])


class AuditLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='audit_logs',
        verbose_name="Do'kon"
    )
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs',
        verbose_name="Foydalanuvchi"
    )
    action = models.CharField(max_length=100, verbose_name="Bajarilgan amal")
    details = models.JSONField(default=dict, blank=True, verbose_name="Tafsilotlar (JSON)")
    ip_address = models.GenericIPAddressField(null=True, blank=True, verbose_name="IP Manzil")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Sana va vaqt")

    class Meta:
        db_table = 'audit_logs'
        verbose_name = "Audit log"
        verbose_name_plural = "Audit loglar"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.created_at.strftime('%Y-%m-%d %H:%M')} | {self.action} | User: {self.user_id}"


class SubscriptionPayment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name='subscription_payments',
        verbose_name="Do'kon"
    )
    amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        verbose_name="To'lov summasi (so'mda)"
    )
    months_paid = models.PositiveIntegerField(
        default=1,
        verbose_name="Necha oylik to'lov"
    )
    paid_from = models.DateField(
        verbose_name="Boshlanish sanasi"
    )
    paid_until = models.DateField(
        verbose_name="Yangi to'langan muddat (gacha)"
    )
    payment_method = models.CharField(
        max_length=50,
        choices=[
            ('cash', 'Naqd pul'),
            ('card', 'Bank kartasi / Terminal'),
            ('bank_transfer', "Bank o'tkazmasi (Hisob raqam)"),
            ('click', 'Click'),
            ('payme', 'Payme'),
            ('admin', 'Admin tomonidan uzaytirildi'),
        ],
        default='cash',
        verbose_name="To'lov usuli"
    )
    payment_date = models.DateTimeField(
        default=timezone.now,
        verbose_name="To'lov qabul qilingan vaqt"
    )
    notes = models.TextField(
        blank=True,
        default='',
        verbose_name="Izoh"
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='received_subscription_payments',
        verbose_name="Qabul qilgan xodim/admin"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'subscription_payments'
        verbose_name = "Obuna to'lovi"
        verbose_name_plural = "Obuna to'lovlari"
        ordering = ['-payment_date']

    def __str__(self):
        return f"{self.tenant.name} | {self.amount:,.0f} UZS | {self.paid_until}"
