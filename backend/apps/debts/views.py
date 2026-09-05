from decimal import Decimal
from django.db import transaction, models
from django.utils import timezone
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiParameter

from apps.core.permissions import IsManager, IsTenantActive
from apps.core.models import UserRole, AuditLog
from apps.core.services.eskiz import EskizSMSService
from .models import Debt, DebtHistory, DebtHistoryType
from .serializers import (
    DebtSerializer,
    DebtHistorySerializer,
    DebtPaymentSerializer,
    SendSmsSerializer,
    VerifyPhoneSendCodeSerializer,
    VerifyPhoneCheckCodeSerializer
)
from .tasks import send_single_sms_task

class DebtViewSet(viewsets.ModelViewSet):
    serializer_class = DebtSerializer
    permission_classes = [permissions.IsAuthenticated, IsTenantActive]

    def get_queryset(self):
        user = self.request.user
        if user.role == UserRole.ADMIN or user.is_superuser:
            qs = Debt.objects.all()
        else:
            qs = Debt.objects.filter(tenant=user.tenant)

        # Filters
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                models.Q(client_name__icontains=search) |
                models.Q(client_phone__icontains=search)
            )

        is_overdue = self.request.query_params.get('is_overdue')
        if is_overdue and is_overdue.lower() == 'true':
            today = timezone.now().date()
            qs = qs.filter(remaining_debt__gt=Decimal('0.00'), due_date__lt=today)

        has_balance = self.request.query_params.get('has_balance')
        if has_balance and has_balance.lower() == 'true':
            qs = qs.filter(remaining_debt__gt=Decimal('0.00'))

        return qs.order_by('-remaining_debt', '-updated_at')

    def perform_create(self, serializer):
        user = self.request.user
        tenant = getattr(user, 'tenant', None)
        if not tenant and (user.role == UserRole.ADMIN or user.is_superuser):
            from apps.core.models import Tenant
            t_id = self.request.data.get('tenant_id') or self.request.data.get('tenant')
            if t_id:
                tenant = Tenant.objects.filter(id=t_id).first()
            if not tenant:
                tenant = Tenant.objects.first()

        serializer.save(
            tenant=tenant,
            remaining_debt=serializer.validated_data.get('total_debt', Decimal('0.00'))
        )

    @extend_schema(request=DebtPaymentSerializer, responses={201: DebtSerializer})
    @action(detail=True, methods=['post'], url_path='payments')
    def make_payment(self, request, pk=None):
        debt = self.get_object()
        serializer = DebtPaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        amount = serializer.validated_data['amount']
        payment_method = serializer.validated_data['payment_method']
        notes = serializer.validated_data.get('notes', '')

        if amount > debt.remaining_debt:
            return Response(
                {'detail': f"To'lov summasi qarz qoldig'idan ({debt.remaining_debt:,.0f} so'm) oshib ketdi!"},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            debt.remaining_debt -= amount
            debt.save(update_fields=['remaining_debt', 'updated_at'])

            history_entry = DebtHistory.objects.create(
                debt=debt,
                amount=amount,
                type=DebtHistoryType.PAID,
                payment_method=payment_method,
                performed_by=request.user,
                notes=notes
            )

            AuditLog.objects.create(
                tenant=debt.tenant,
                user=request.user,
                action="debt_payment",
                details={
                    'client_name': debt.client_name,
                    'amount_paid': str(amount),
                    'remaining_debt': str(debt.remaining_debt),
                    'payment_method': payment_method
                },
                ip_address=request.META.get('REMOTE_ADDR')
            )

        return Response(DebtSerializer(debt).data, status=status.HTTP_200_OK)

    @extend_schema(request=SendSmsSerializer, responses={200: dict})
    @action(detail=True, methods=['post'], url_path='send-sms', permission_classes=[permissions.IsAuthenticated, IsManager, IsTenantActive])
    def send_sms(self, request, pk=None):
        debt = self.get_object()
        serializer = SendSmsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        custom_message = serializer.validated_data.get('message', '').strip()
        store_name = debt.tenant.name if debt.tenant else "SotuvPro"
        amount_formatted = f"{debt.remaining_debt:,.0f}".replace(',', ' ')
        due_date_str = debt.due_date.strftime('%d.%m.%Y') if debt.due_date else "belgilanmagan"

        final_message = custom_message or (
            f"Hurmatli {debt.client_name}, {store_name} do'konidan "
            f"{amount_formatted} so'm qarzdorlik mavjud. To'lov muddati: {due_date_str}."
        )

        # Celery orqali asinxron yuborish
        task = send_single_sms_task.delay(
            phone=debt.client_phone,
            message=final_message,
            debt_id=str(debt.id),
            user_id=str(request.user.id)
        )

        return Response({
            'message': f"{debt.client_phone} raqamiga SMS eslatma yuborish navbatga qo'yildi.",
            'task_id': task.id,
            'client_phone': debt.client_phone
        }, status=status.HTTP_200_OK)

    @extend_schema(request=VerifyPhoneSendCodeSerializer, responses={200: dict})
    @action(detail=False, methods=['post'], url_path='verify-phone/send-code', permission_classes=[permissions.IsAuthenticated])
    def verify_phone_send_code(self, request):
        serializer = VerifyPhoneSendCodeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        phone = serializer.validated_data['phone']
        client_name = serializer.validated_data.get('client_name', '').strip()

        sms_service = EskizSMSService()
        cleaned_phone = sms_service.clean_phone_number(phone)
        if len(cleaned_phone) != 12:
            return Response({'detail': "Noto'g'ri telefon raqam formati! (+998901234567 bo'lishi kerak)"}, status=status.HTTP_400_BAD_REQUEST)

        import random
        from django.core.cache import cache
        from django.conf import settings
        code = str(random.randint(1000, 9999))

        cache_key = f"debt_otp:{cleaned_phone}"
        cache.set(cache_key, code, timeout=300)

        store_name = request.user.tenant.name if getattr(request.user, 'tenant', None) else "SotuvPro"
        sms_text = f"SotuvPro ({store_name}): Qarzni tasdiqlash kodi: {code}. Bu kodni begonalarga bermang!"

        send_single_sms_task.delay(
            phone=cleaned_phone,
            message=sms_text,
            user_id=str(request.user.id)
        )

        AuditLog.objects.create(
            tenant=getattr(request.user, 'tenant', None),
            user=request.user,
            action="otp_sent",
            details={
                'phone': cleaned_phone,
                'client_name': client_name,
                'purpose': 'debt_verification'
            },
            ip_address=request.META.get('REMOTE_ADDR')
        )

        return Response({
            'success': True,
            'message': f"+{cleaned_phone} raqamiga tasdiqlash kodi yuborildi.",
            'phone': cleaned_phone,
            'expires_in_seconds': 300,
            'debug_code': code if getattr(settings, 'ESKIZ_IS_TEST', True) else None
        }, status=status.HTTP_200_OK)

    @extend_schema(request=VerifyPhoneCheckCodeSerializer, responses={200: dict})
    @action(detail=False, methods=['post'], url_path='verify-phone/check-code', permission_classes=[permissions.IsAuthenticated])
    def verify_phone_check_code(self, request):
        serializer = VerifyPhoneCheckCodeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        phone = serializer.validated_data['phone']
        input_code = serializer.validated_data['code'].strip()

        sms_service = EskizSMSService()
        cleaned_phone = sms_service.clean_phone_number(phone)

        from django.core.cache import cache
        cache_key = f"debt_otp:{cleaned_phone}"
        saved_code = cache.get(cache_key)

        if not saved_code:
            return Response({
                'success': False,
                'detail': "Tasdiqlash kodi eskirgan yoki yuborilmagan. Qaytadan kod so'rang."
            }, status=status.HTTP_400_BAD_REQUEST)

        if saved_code != input_code:
            return Response({
                'success': False,
                'detail': "Tasdiqlash kodi noto'g'ri kiritildi!"
            }, status=status.HTTP_400_BAD_REQUEST)

        cache.delete(cache_key)
        cache.set(f"debt_verified:{cleaned_phone}", True, timeout=3600)

        tenant = getattr(request.user, 'tenant', None)
        if tenant:
            Debt.objects.filter(
                tenant=tenant,
                client_phone__icontains=cleaned_phone[-9:]
            ).update(
                is_phone_verified=True,
                verified_at=timezone.now()
            )

        AuditLog.objects.create(
            tenant=tenant,
            user=request.user,
            action="otp_verified",
            details={
                'phone': cleaned_phone,
                'status': 'verified'
            },
            ip_address=request.META.get('REMOTE_ADDR')
        )

        return Response({
            'success': True,
            'message': f"+{cleaned_phone} raqami muvaffaqiyatli tasdiqlandi ✅",
            'phone': cleaned_phone,
            'is_verified': True
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='sms-status/(?P<sms_id>[^/.]+)')
    def check_sms_status(self, request, sms_id=None):
        sms_service = EskizSMSService()
        result = sms_service.get_sms_status(sms_id)
        return Response(result)

    @action(detail=False, methods=['get'], url_path='sms-prices')
    def get_sms_prices(self, request):
        sms_service = EskizSMSService()
        result = sms_service.get_user_prices()
        return Response(result)
