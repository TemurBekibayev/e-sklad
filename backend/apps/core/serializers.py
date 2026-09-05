from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import authenticate, get_user_model
from django.utils.translation import gettext_lazy as _
from django.db import models
from django.db.models import Q
from .models import Tenant, AuditLog, UserRole

User = get_user_model()

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    PIN kod (worker/manager) yoki Email+Parol (manager/admin) orqali kirish
    """
    login = serializers.CharField(required=False, write_only=True, help_text="Email, username yoki xodim ismi")
    pin = serializers.CharField(required=False, write_only=True, max_length=10, help_text="4 xonali PIN kod")
    password = serializers.CharField(required=False, write_only=True, help_text="Parol (email bilan kirilganda)")
    tenant_id = serializers.UUIDField(required=False, write_only=True, help_text="PIN bilan kirganda do'kon ID (agar bir nechta do'kon bo'lsa)")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['email'] = serializers.CharField(required=False, allow_blank=True)
        self.fields['password'] = serializers.CharField(required=False, allow_blank=True)

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['tenant_id'] = str(user.tenant_id) if user.tenant_id else None
        token['tenant_name'] = user.tenant.name if user.tenant else None
        token['role'] = user.role
        token['name'] = user.name
        token['email'] = user.email
        token['can_sell_on_debt'] = user.can_sell_on_debt
        token['max_debt_limit'] = float(user.max_debt_limit)
        return token

    def validate(self, attrs):
        login_val = attrs.get('login') or attrs.get('email') or attrs.get('username')
        pin_val = attrs.get('pin')
        password_val = attrs.get('password')
        tenant_id = attrs.get('tenant_id')

        user = None

        # 1. Agar login va parol/pin berilgan bo'lsa
        user = None

        # Foydalanuvchini login/email/telefon orqali topish
        users_qs = User.objects.filter(is_active=True)
        if tenant_id:
            users_qs = users_qs.filter(tenant_id=tenant_id)
        if login_val:
            users_qs = users_qs.filter(
                models.Q(name__iexact=login_val) | 
                models.Q(email__iexact=login_val) | 
                models.Q(phone_number=login_val)
            )

        candidate_user = users_qs.first() if login_val else None

        # A) Agar PIN kiritilgan bo'lsa (4-6 xonali raqam)
        if pin_val and str(pin_val).isdigit() and len(str(pin_val)) <= 6:
            for u in (users_qs if login_val else User.objects.filter(is_active=True)):
                if u.check_pin(pin_val):
                    user = u
                    break

        # B) Agar parol berilgan bo'lsa yoki PIN mos kelmagan bo'lsa
        if not user and password_val:
            if candidate_user and candidate_user.check_password(password_val):
                user = candidate_user
            elif login_val:
                user = authenticate(username=login_val, password=password_val)

        # C) Agar PIN raqamli bo'lmasa, uni parol sifatida ham tekshirib ko'rish
        if not user and pin_val and not password_val and candidate_user:
            if candidate_user.check_password(pin_val):
                user = candidate_user

        if not user:
            if candidate_user:
                candidate_user.register_failed_attempt()
            raise serializers.ValidationError({
                'detail': _('Login, PIN kod yoki parol noto\'g\'ri.')
            })

        if user.is_locked():
            raise serializers.ValidationError({
                'detail': _('Hisob vaqtincha bloklangan (5 ta noto\'g\'ri urinish). 5 daqiqadan so\'ng urinib ko\'ring.')
            })

        user.reset_failed_attempts()

        if not user.is_active:
            raise serializers.ValidationError({'detail': _('Foydalanuvchi hisobi faolsizlantirilgan.')})

        # Token yaratish
        refresh = self.get_token(user)

        data = {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': {
                'id': str(user.id),
                'name': user.name,
                'email': user.email,
                'role': user.role,
                'tenant_id': str(user.tenant_id) if user.tenant_id else None,
                'tenant_name': user.tenant.name if user.tenant else None,
                'tenant_status': user.tenant.status if user.tenant else None,
                'can_sell_on_debt': user.can_sell_on_debt,
                'max_debt_limit': float(user.max_debt_limit),
            }
        }
        return data


class TenantSerializer(serializers.ModelSerializer):
    users_count = serializers.IntegerField(source='users.count', read_only=True)
    products_count = serializers.SerializerMethodField()
    today_sales = serializers.SerializerMethodField()
    total_debts = serializers.SerializerMethodField()

    class Meta:
        model = Tenant
        fields = [
            'id', 'name', 'address', 'status', 'settings', 
            'users_count', 'products_count', 'today_sales', 'total_debts',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_products_count(self, obj):
        try:
            from apps.products.models import Product
            return Product.objects.filter(tenant=obj).count()
        except Exception:
            return 0

    def get_today_sales(self, obj):
        try:
            from apps.transactions.models import Transaction
            from django.utils import timezone
            from django.db import models as dj_models
            today = timezone.now().date()
            total = Transaction.objects.filter(tenant=obj, created_at__date=today, status='completed').aggregate(
                total=dj_models.Sum('total_amount')
            )['total']
            return f"{total:,.0f} so'm" if total else "0 so'm"
        except Exception:
            return "0 so'm"

    def get_total_debts(self, obj):
        try:
            from apps.debts.models import Debt
            from django.db import models as dj_models
            total = Debt.objects.filter(tenant=obj, remaining_debt__gt=0).aggregate(
                total=dj_models.Sum('remaining_debt')
            )['total']
            return f"{total:,.0f} so'm" if total else "0 so'm"
        except Exception:
            return "0 so'm"


class UserSerializer(serializers.ModelSerializer):
    pin = serializers.CharField(write_only=True, required=False, max_length=10)
    password = serializers.CharField(write_only=True, required=False, min_length=6)

    class Meta:
        model = User
        fields = [
            'id', 'tenant', 'name', 'email', 'phone_number',
            'role', 'is_active', 'can_sell_on_debt', 'max_debt_limit',
            'failed_pin_attempts', 'locked_until',
            'pin', 'password', 'plain_pin', 'plain_password', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'failed_pin_attempts', 'locked_until', 'plain_pin', 'plain_password', 'created_at', 'updated_at']

    def create(self, validated_data):
        pin = validated_data.pop('pin', None)
        password = validated_data.pop('password', None)
        user = User.objects.create(**validated_data)
        if pin:
            user.set_pin(pin)
            user.save(update_fields=['pin_hash'])
        if password:
            user.set_password(password)
            user.save(update_fields=['password'])
        return user

    def update(self, instance, validated_data):
        pin = validated_data.pop('pin', None)
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if pin:
            instance.set_pin(pin)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class AuditLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.name', read_only=True)
    tenant_name = serializers.CharField(source='tenant.name', read_only=True)

    class Meta:
        model = AuditLog
        fields = ['id', 'tenant', 'tenant_name', 'user', 'user_name', 'action', 'details', 'ip_address', 'created_at']
        read_only_fields = '__all__'


from apps.debts.models import Debt
from apps.transactions.models import Transaction

class DebtSerializer(serializers.ModelSerializer):
    class Meta:
        model = Debt
        fields = ['id', 'client_name', 'client_phone', 'total_debt', 'remaining_debt', 'due_date', 'notes', 'created_at', 'updated_at']

class TransactionSerializer(serializers.ModelSerializer):
    finalized_by_name = serializers.CharField(source='finalized_by.name', read_only=True)
    class Meta:
        model = Transaction
        fields = [
            'id', 'basket', 'finalized_by', 'finalized_by_name', 'payment_method', 
            'cash_amount', 'card_amount', 'debt_amount', 'discount_amount', 
            'total_amount', 'status', 'client_name', 'client_phone', 
            'items_snapshot', 'created_at'
        ]
