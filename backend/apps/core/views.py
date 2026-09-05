from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db import models as dj_models
from drf_spectacular.utils import extend_schema

from .models import Tenant, AuditLog, UserRole
from .serializers import (
    CustomTokenObtainPairSerializer,
    TenantSerializer,
    UserSerializer,
    AuditLogSerializer
)
from .permissions import IsPlatformAdmin, IsManager, IsTenantActive

User = get_user_model()

class CustomLoginView(TokenObtainPairView):
    """
    PIN kod (worker/manager) yoki Email+Parol (manager/admin) orqali tizimga kirish
    """
    serializer_class = CustomTokenObtainPairSerializer
    throttle_scope = 'auth'


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(request=None, responses={200: dict})
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            return Response({'detail': 'Muvaffaqiyatli chiqildi.'}, status=status.HTTP_200_OK)
        except Exception:
            return Response({'detail': 'Muvaffaqiyatli chiqildi.'}, status=status.HTTP_200_OK)


class CurrentUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(responses={200: UserSerializer})
    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


class UserViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated, IsManager, IsTenantActive]
    pagination_class = None

    def get_queryset(self):
        user = self.request.user
        queryset = User.objects.all()
        tenant_id = self.request.query_params.get('tenant_id')
        
        if tenant_id:
            queryset = queryset.filter(tenant_id=tenant_id)
        elif user.role != UserRole.ADMIN and not user.is_superuser:
            queryset = queryset.filter(tenant=user.tenant)
            
        return queryset

    def perform_create(self, serializer):
        if self.request.user.role != UserRole.ADMIN and not self.request.user.is_superuser:
            serializer.save(tenant=self.request.user.tenant)
        else:
            serializer.save()

    @action(detail=True, methods=['patch', 'post'], url_path='set-debt-permission')
    def set_debt_permission(self, request, pk=None):
        emp = self.get_object()
        can_sell_on_debt = request.data.get('can_sell_on_debt')
        max_debt_limit = request.data.get('max_debt_limit')

        if can_sell_on_debt is not None:
            emp.can_sell_on_debt = bool(can_sell_on_debt)
        if max_debt_limit is not None:
            from decimal import Decimal
            emp.max_debt_limit = Decimal(str(max_debt_limit))

        emp.save(update_fields=['can_sell_on_debt', 'max_debt_limit'])
        return Response(self.get_serializer(emp).data)


from django.db import models as dj_models
from django.db import transaction as dj_transaction
from .models import TenantStatus

class TenantViewSet(viewsets.ModelViewSet):
    serializer_class = TenantSerializer

    def get_permissions(self):
        if self.action in ['create', 'destroy']:
            return [IsPlatformAdmin()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.role == UserRole.ADMIN or user.is_superuser:
            return Tenant.objects.all()
        if user.tenant:
            return Tenant.objects.filter(id=user.tenant.id)
        return Tenant.objects.none()

    def create(self, request, *args, **kwargs):
        name = request.data.get('name')
        address = request.data.get('address', '')
        manager_name = request.data.get('manager_name')
        manager_email = request.data.get('manager_email')
        manager_phone = request.data.get('manager_phone', '')
        manager_pin = request.data.get('manager_pin')
        manager_password = request.data.get('manager_password')

        if not name or not manager_name or not manager_pin:
            return Response({'detail': "Do'kon nomi, manager ismi va PIN-kodi kiritilishi shart."}, status=status.HTTP_400_BAD_REQUEST)

        if len(str(manager_pin)) != 4 or not str(manager_pin).isdigit():
            return Response({'detail': "PIN-kod 4 xonali son bo'lishi shart."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with dj_transaction.atomic():
                tenant = Tenant.objects.create(
                    name=name,
                    address=address,
                    status=TenantStatus.ACTIVE,
                    settings={
                        'max_worker_finalize_amount': 1000000.0,
                        'allow_negative_stock': False,
                        'auto_sms_enabled': False
                    }
                )

                manager = User.objects.create_user(
                    email=manager_email or None,
                    name=manager_name,
                    phone_number=manager_phone,
                    role=UserRole.MANAGER,
                    tenant=tenant,
                    is_staff=True
                )
                manager.set_pin(manager_pin)
                if manager_password:
                    manager.set_password(manager_password)
                manager.save()

            serializer = self.get_serializer(tenant)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(responses={200: dict})
    @action(detail=False, methods=['get'], url_path='billing-summary', permission_classes=[permissions.IsAuthenticated])
    def billing_summary(self, request):
        user = request.user
        tenant = user.tenant
        if not tenant and (user.role == UserRole.ADMIN or user.is_superuser):
            t_id = request.query_params.get('tenant_id')
            tenant = Tenant.objects.filter(id=t_id).first() if t_id else Tenant.objects.first()

        if not tenant:
            return Response({'detail': "Do'kon topilmadi."}, status=status.HTTP_404_NOT_FOUND)

        from .services.sms_billing import get_tenant_billing_summary
        summary = get_tenant_billing_summary(tenant)
        return Response(summary)


class AdminDashboardStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]

    @extend_schema(responses={200: dict})
    def get(self, request):
        active_tenants = Tenant.objects.filter(status=TenantStatus.ACTIVE).count()
        total_users = User.objects.count()
        
        import decimal
        from datetime import timedelta
        
        today = timezone.now().date()
        today_sales = decimal.Decimal('0.00')
        overdue_debts = decimal.Decimal('0.00')
        
        try:
            from apps.transactions.models import Transaction
            from apps.debts.models import Debt
            
            today_sales = Transaction.objects.filter(created_at__date=today, status='completed').aggregate(
                total=dj_models.Sum('total_amount')
            )['total'] or decimal.Decimal('0.00')
            
            overdue_debts = Debt.objects.filter(due_date__lt=today, remaining_debt__gt=0).aggregate(
                total=dj_models.Sum('remaining_debt')
            )['total'] or decimal.Decimal('0.00')
        except Exception as e:
            print("Stats aggregation err:", e)

        # 1. Real attention required (tenants with overdue debts)
        attention_required = []
        try:
            from apps.debts.models import Debt
            overdue_tenants = Debt.objects.filter(due_date__lt=today, remaining_debt__gt=0).select_related('tenant').order_by('due_date')
            seen_tenants = set()
            for od in overdue_tenants:
                if od.tenant and od.tenant_id not in seen_tenants:
                    seen_tenants.add(od.tenant_id)
                    days_overdue = (today - od.due_date).days if od.due_date else 1
                    attention_required.append({
                        'id': str(od.tenant.id),
                        'name': od.tenant.name,
                        'days': f"{days_overdue} kun kechikkan ({od.client_name})"
                    })
                if len(attention_required) >= 5:
                    break
        except Exception as e:
            print("Attention required err:", e)

        # 2. Real recent activity from AuditLog
        recent_activity = []
        try:
            logs = AuditLog.objects.select_related('tenant', 'user').order_by('-created_at')[:8]
            for log in logs:
                u_name = log.user.name if log.user else 'Tizim'
                t_name = log.tenant.name if log.tenant else "Boshqaruv"
                
                act_lower = log.action.lower()
                if any(w in act_lower for w in ['savdo', 'sale', 'to\'lov', 'tasdiq', 'kirim']):
                    action_type = 'success'
                elif any(w in act_lower for w in ['qarz', 'ogohlantirish', 'xato', 'deactivate']):
                    action_type = 'warning'
                else:
                    action_type = 'primary'
                    
                recent_activity.append({
                    'id': str(log.id),
                    'tenant': t_name,
                    'user': u_name,
                    'userInitial': u_name[0].upper() if u_name else 'T',
                    'action': log.action,
                    'actionType': action_type,
                    'time': log.created_at.strftime('%H:%M %d.%m.%Y')
                })
        except Exception as e:
            print("Recent activity err:", e)

        return Response({
            'activeTenants': active_tenants,
            'totalUsers': total_users,
            'todaySales': f"{today_sales:,.0f} UZS",
            'overdueDebts': f"{overdue_debts:,.0f} UZS",
            'attentionRequired': attention_required,
            'recentActivity': recent_activity
        })


class AdminReportsView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]

    @extend_schema(responses={200: dict})
    def get(self, request):
        import decimal
        from datetime import timedelta
        from django.db.models import Sum
        from apps.transactions.models import Transaction

        now = timezone.now()
        today = now.date()
        yesterday = today - timedelta(days=1)
        seven_days_ago = today - timedelta(days=7)
        fourteen_days_ago = today - timedelta(days=14)

        # 1. Date Range label
        start_of_month = today.replace(day=1)
        date_range_label = f"{start_of_month.strftime('%d.%m.%Y')} – {today.strftime('%d.%m.%Y')}"

        # 2. Real Store Ratings
        tenants = Tenant.objects.all()
        store_ratings = []
        max_sales = decimal.Decimal('0.00')

        store_stats = []
        for t in tenants:
            sales_sum = Transaction.objects.filter(
                tenant=t,
                status='completed'
            ).aggregate(total=Sum('total_amount'))['total'] or decimal.Decimal('0.00')

            store_stats.append({
                'name': t.name,
                'raw_sales': sales_sum
            })
            if sales_sum > max_sales:
                max_sales = sales_sum

        store_stats.sort(key=lambda x: x['raw_sales'], reverse=True)

        for s in store_stats:
            val = s['raw_sales']
            percent = int(round((val / max_sales * 100))) if max_sales > 0 else 0
            if val >= 1_000_000_000:
                sales_formatted = f"{(val / 1_000_000_000):.1f}B".replace('.0B', 'B')
            elif val >= 1_000_000:
                sales_formatted = f"{(val / 1_000_000):.1f}M".replace('.0M', 'M')
            elif val >= 1_000:
                sales_formatted = f"{(val / 1_000):.0f}K"
            else:
                sales_formatted = f"{val:,.0f} UZS"

            store_ratings.append({
                'name': s['name'],
                'sales': sales_formatted,
                'percent': percent
            })

        # 3. Monthly Store Growth
        months_uz = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek']
        monthly_growth = []

        for i in range(6, -1, -1):
            target_month = (today.month - i - 1) % 12 + 1
            target_year = today.year - (1 if (today.month - i) <= 0 else 0)
            month_name = months_uz[target_month - 1]
            
            if target_month == 12:
                end_of_target_month = timezone.datetime(target_year + 1, 1, 1, tzinfo=timezone.get_current_timezone())
            else:
                end_of_target_month = timezone.datetime(target_year, target_month + 1, 1, tzinfo=timezone.get_current_timezone())

            count_up_to_month = Tenant.objects.filter(created_at__lt=end_of_target_month).count()
            monthly_growth.append({
                'month': month_name,
                'stores': count_up_to_month
            })

        # 4. DAU (Kunlik faol foydalanuvchilar)
        dau_today_users = set(AuditLog.objects.filter(created_at__date=today).values_list('user_id', flat=True))
        dau_today_workers = set(Transaction.objects.filter(created_at__date=today).values_list('finalized_by_id', flat=True))
        dau_today_count = len(dau_today_users.union(dau_today_workers) - {None})

        dau_yesterday_users = set(AuditLog.objects.filter(created_at__date=yesterday).values_list('user_id', flat=True))
        dau_yesterday_workers = set(Transaction.objects.filter(created_at__date=yesterday).values_list('finalized_by_id', flat=True))
        dau_yesterday_count = len(dau_yesterday_users.union(dau_yesterday_workers) - {None})

        if dau_yesterday_count > 0:
            dau_growth_num = int(round(((dau_today_count - dau_yesterday_count) / dau_yesterday_count) * 100))
            dau_growth_str = f"+{dau_growth_num}%" if dau_growth_num >= 0 else f"{dau_growth_num}%"
        else:
            dau_growth_str = "+100%" if dau_today_count > 0 else "0%"

        if dau_today_count == 0:
            total_active_u = User.objects.filter(is_active=True).count()
            dau_today_count = min(total_active_u, 1)

        # 5. WAU (Haftalik faol foydalanuvchilar)
        wau_curr_users = set(AuditLog.objects.filter(created_at__date__gte=seven_days_ago).values_list('user_id', flat=True))
        wau_curr_workers = set(Transaction.objects.filter(created_at__date__gte=seven_days_ago).values_list('finalized_by_id', flat=True))
        wau_curr_count = len(wau_curr_users.union(wau_curr_workers) - {None})

        wau_prev_users = set(AuditLog.objects.filter(created_at__date__range=(fourteen_days_ago, seven_days_ago)).values_list('user_id', flat=True))
        wau_prev_workers = set(Transaction.objects.filter(created_at__date__range=(fourteen_days_ago, seven_days_ago)).values_list('finalized_by_id', flat=True))
        wau_prev_count = len(wau_prev_users.union(wau_prev_workers) - {None})

        if wau_prev_count > 0:
            wau_growth_num = int(round(((wau_curr_count - wau_prev_count) / wau_prev_count) * 100))
            wau_growth_str = f"+{wau_growth_num}%" if wau_growth_num >= 0 else f"{wau_growth_num}%"
        else:
            wau_growth_str = "+100%" if wau_curr_count > 0 else "0%"

        if wau_curr_count == 0:
            wau_curr_count = User.objects.filter(is_active=True).count()

        return Response({
            'dateRange': date_range_label,
            'storeRatings': store_ratings,
            'monthlyGrowth': monthly_growth,
            'dau': {
                'count': f"{dau_today_count:,}",
                'growth': dau_growth_str
            },
            'wau': {
                'count': f"{wau_curr_count:,}",
                'growth': wau_growth_str
            }
        })


from apps.products.models import Product, StockMovement
from rest_framework import serializers as rest_serializers

class StockMovementSerializer(rest_serializers.ModelSerializer):
    performed_by_name = rest_serializers.CharField(source='performed_by.name', read_only=True)
    class Meta:
        model = StockMovement
        fields = ['id', 'product', 'type', 'purchase_unit_amount', 'sale_unit_amount', 'reason', 'performed_by', 'performed_by_name', 'created_at']
        read_only_fields = ['id', 'product', 'performed_by', 'created_at']

class ProductMiniSerializer(rest_serializers.ModelSerializer):
    tenant_name = rest_serializers.CharField(source='tenant.name', read_only=True)
    class Meta:
        model = Product
        fields = ['id', 'tenant_id', 'tenant_name', 'name', 'purchase_unit', 'sale_unit', 'price_per_sale_unit', 'current_stock', 'barcode']

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductMiniSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        user = self.request.user
        queryset = Product.objects.all()
        
        tenant_id = self.request.query_params.get('tenant_id')
        if tenant_id and (user.role == UserRole.ADMIN or user.is_superuser):
            queryset = queryset.filter(tenant_id=tenant_id)
        elif user.role != UserRole.ADMIN and not user.is_superuser:
            queryset = queryset.filter(tenant=user.tenant)
            
        return queryset

    def perform_create(self, serializer):
        if self.request.user.role != UserRole.ADMIN and not self.request.user.is_superuser:
            serializer.save(tenant=self.request.user.tenant)
        else:
            tenant_id = self.request.data.get('tenant_id')
            if tenant_id:
                serializer.save(tenant_id=tenant_id)
            else:
                serializer.save()

    @action(detail=False, methods=['get'], url_path='lookup')
    def lookup(self, request):
        barcode = request.query_params.get('barcode')
        if not barcode:
            return Response({'detail': "Shtrix-kod yuborilishi shart."}, status=status.HTTP_400_BAD_REQUEST)
            
        user = request.user
        product = None
        
        # 1. Search in own tenant
        if user.role != UserRole.ADMIN and not user.is_superuser:
            product = Product.objects.filter(tenant=user.tenant, barcode=barcode).first()
            
        # 2. Search globally across other tenants as a suggestion
        is_global_suggestion = False
        if not product:
            product = Product.objects.filter(barcode=barcode).first()
            if product:
                is_global_suggestion = True
                
        if not product:
            return Response({
                'detail': "Mahsulot topilmadi.",
                'scanned_code': barcode,
                'exists_globally': False
            }, status=status.HTTP_404_NOT_FOUND)
            
        serializer = self.get_serializer(product)
        data = serializer.data
        data['exists_globally'] = is_global_suggestion
        
        return Response(data)

    @action(detail=True, methods=['get', 'post'], url_path='stock-movements')
    def stock_movements(self, request, pk=None):
        product = self.get_object()
        if request.method == 'GET':
            movements = product.movements.all()
            serializer = StockMovementSerializer(movements, many=True)
            return Response(serializer.data)
            
        elif request.method == 'POST':
            serializer = StockMovementSerializer(data=request.data)
            if serializer.is_valid():
                try:
                    with dj_transaction.atomic():
                        movement = serializer.save(
                            product=product,
                            performed_by=request.user
                        )
                        
                        # Update the product's current_stock based on the movement type
                        amount = movement.sale_unit_amount
                        if movement.type == 'kirim':
                            product.current_stock += amount
                        elif movement.type == 'chiqim':
                            product.current_stock -= amount
                        elif movement.type == 'tuzatish':
                            product.current_stock = amount
                            
                        product.save()
                    
                    fresh_serializer = StockMovementSerializer(movement)
                    return Response(fresh_serializer.data, status=status.HTTP_201_CREATED)
                except Exception as e:
                    return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
                    
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


from apps.debts.models import Debt
from apps.transactions.models import Transaction
from .serializers import DebtSerializer, TransactionSerializer

class DebtViewSet(viewsets.ModelViewSet):
    queryset = Debt.objects.all()
    serializer_class = DebtSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        user = self.request.user
        queryset = Debt.objects.all()
        
        tenant_id = self.request.query_params.get('tenant_id')
        if tenant_id and (user.role == UserRole.ADMIN or user.is_superuser):
            queryset = queryset.filter(tenant_id=tenant_id)
        elif user.role != UserRole.ADMIN and not user.is_superuser:
            queryset = queryset.filter(tenant=user.tenant)
            
        return queryset

    def perform_create(self, serializer):
        if self.request.user.role != UserRole.ADMIN and not self.request.user.is_superuser:
            serializer.save(tenant=self.request.user.tenant)
        else:
            tenant_id = self.request.data.get('tenant_id')
            if tenant_id:
                serializer.save(tenant_id=tenant_id)
            else:
                serializer.save()


class TransactionViewSet(viewsets.ModelViewSet):
    queryset = Transaction.objects.all()
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        user = self.request.user
        queryset = Transaction.objects.all()
        
        tenant_id = self.request.query_params.get('tenant_id')
        if tenant_id and (user.role == UserRole.ADMIN or user.is_superuser):
            queryset = queryset.filter(tenant_id=tenant_id)
        elif user.role != UserRole.ADMIN and not user.is_superuser:
            queryset = queryset.filter(tenant=user.tenant)
            
        return queryset

    def create(self, request, *args, **kwargs):
        from decimal import Decimal
        user = request.user
        data = request.data.copy()
        
        payment_method = data.get('payment_method', 'cash')
        debt_amount = Decimal(str(data.get('debt_amount', 0) or 0))
        
        is_debt = payment_method == 'debt' or (payment_method == 'mixed' and debt_amount > 0)
        status_val = 'completed'
        approval_message = None

        if user.role == UserRole.WORKER and is_debt:
            if not user.can_sell_on_debt:
                status_val = 'pending_approval'
                approval_message = "Ushbu sotuvchiga to'g'ridan-to'g'ri qarzga sotish ruxsati berilmagan. Savdo menejer tasdig'iga yuborildi."
            elif debt_amount > user.max_debt_limit:
                status_val = 'pending_approval'
                approval_message = f"Qarz summasi ({debt_amount:,.0f} UZS) ruxsat etilgan limitdan ({user.max_debt_limit:,.0f} UZS) yuqori. Menejer tasdig'i talab etiladi."

        data['status'] = status_val
        if user.tenant and not (user.role == UserRole.ADMIN or user.is_superuser):
            data['tenant'] = user.tenant.id
        data['finalized_by'] = user.id

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        
        with dj_transaction.atomic():
            tx = serializer.save(
                tenant=user.tenant if (user.role != UserRole.ADMIN and not user.is_superuser) else serializer.validated_data.get('tenant'),
                finalized_by=user,
                status=status_val
            )
            
            if status_val == 'completed' and is_debt:
                client_name = data.get('client_name') or 'Noma\'lum mijoz'
                client_phone = data.get('client_phone') or ''
                
                from apps.debts.models import Debt, DebtHistory, DebtHistoryType
                debt_obj = Debt.objects.filter(tenant=tx.tenant, client_phone=client_phone).first() if client_phone else None
                if not debt_obj and client_name:
                    debt_obj = Debt.objects.filter(tenant=tx.tenant, client_name__iexact=client_name).first()
                    
                if debt_obj:
                    debt_obj.remaining_debt += debt_amount
                    debt_obj.total_debt += debt_amount
                    debt_obj.save(update_fields=['remaining_debt', 'total_debt'])
                else:
                    debt_obj = Debt.objects.create(
                        tenant=tx.tenant,
                        client_name=client_name,
                        client_phone=client_phone,
                        total_debt=debt_amount,
                        remaining_debt=debt_amount,
                        is_phone_verified=data.get('is_phone_verified', False)
                    )
                    
                DebtHistory.objects.create(
                    debt=debt_obj,
                    type=DebtHistoryType.INCREASE,
                    amount=debt_amount,
                    remaining_after=debt_obj.remaining_debt,
                    created_by=user,
                    notes=f"Savdo #{tx.id}"
                )

            AuditLog.objects.create(
                tenant=tx.tenant,
                user=user,
                action='savdo_yakunlandi' if status_val == 'completed' else 'savdo_tasdiqqa_yuborildi',
                details={
                    'transaction_id': str(tx.id),
                    'total_amount': float(tx.total_amount),
                    'payment_method': tx.payment_method,
                    'status': status_val,
                    'debt_amount': float(debt_amount)
                }
            )

        res_data = self.get_serializer(tx).data
        if approval_message:
            res_data['message'] = approval_message
        return Response(res_data, status=status.HTTP_201_CREATED)
