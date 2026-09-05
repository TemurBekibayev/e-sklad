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
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Qo'shilgan sana")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Yangilangan sana")

    class Meta:
        db_table = 'tenants'
        verbose_name = "Do'kon (Tenant)"
        verbose_name_plural = "Do'konlar (Tenants)"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.get_status_display()})"


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
