from decimal import Decimal
from django.db import transaction, models
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiParameter

from apps.core.permissions import IsManager, IsTenantActive
from apps.core.models import UserRole, AuditLog
from .models import Product, StockMovement, PriceHistory, MovementType
from .serializers import (
    ProductSerializer,
    StockMovementSerializer,
    CreateStockMovementSerializer,
    PriceHistorySerializer
)

class ProductViewSet(viewsets.ModelViewSet):
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticated, IsTenantActive]

    def get_queryset(self):
        user = self.request.user
        if user.role == UserRole.ADMIN or user.is_superuser:
            qs = Product.objects.all()
        else:
            qs = Product.objects.filter(tenant=user.tenant)

        # Filters
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(name__icontains=search)

        barcode = self.request.query_params.get('barcode')
        if barcode:
            qs = qs.filter(barcode=barcode.strip())

        is_archived = self.request.query_params.get('is_archived')
        if is_archived is not None:
            qs = qs.filter(is_archived=is_archived.lower() == 'true')

        return qs.order_by('name')

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

        serializer.save(tenant=tenant)

        AuditLog.objects.create(
            tenant=tenant,
            user=user,
            action="product_created",
            details={
                'product_name': serializer.instance.name,
                'barcode': serializer.instance.barcode,
                'price': str(serializer.instance.price_per_sale_unit),
                'stock': str(serializer.instance.current_stock),
            },
            ip_address=self.request.META.get('REMOTE_ADDR')
        )

    def perform_update(self, serializer):
        old_product = self.get_object()
        old_price = old_product.price_per_sale_unit
        updated_product = serializer.save()

        # Narx o'zgargan bo'lsa PriceHistory yozish
        if updated_product.price_per_sale_unit != old_price:
            PriceHistory.objects.create(
                product=updated_product,
                old_price=old_price,
                new_price=updated_product.price_per_sale_unit,
                changed_by=self.request.user
            )
            AuditLog.objects.create(
                tenant=updated_product.tenant,
                user=self.request.user,
                action="price_changed",
                details={
                    'product_name': updated_product.name,
                    'old_price': str(old_price),
                    'new_price': str(updated_product.price_per_sale_unit)
                },
                ip_address=self.request.META.get('REMOTE_ADDR')
            )

    @extend_schema(
        parameters=[
            OpenApiParameter('barcode', str, description="Shtrix-kod yoki QR kod")
        ],
        responses={200: ProductSerializer}
    )
    @action(detail=False, methods=['get'], url_path='lookup')
    def lookup(self, request):
        code = request.query_params.get('barcode') or request.query_params.get('qr_code')
        if not code:
            return Response({'detail': "Shtrix-kod yoki QR kod kiritilishi shart!"}, status=status.HTTP_400_BAD_REQUEST)

        code = code.strip()
        user = request.user
        tenant = user.tenant

        product = Product.objects.filter(
            tenant=tenant,
            is_archived=False
        ).filter(models.Q(barcode=code) | models.Q(qr_code=code)).first()

        if not product:
            return Response({
                'detail': "Mahsulot topilmadi.",
                'scanned_code': code
            }, status=status.HTTP_404_NOT_FOUND)

        serializer = self.get_serializer(product)
        return Response(serializer.data)

    @extend_schema(request=CreateStockMovementSerializer, responses={201: StockMovementSerializer})
    @action(detail=True, methods=['post'], url_path='stock-movements', permission_classes=[permissions.IsAuthenticated, IsManager, IsTenantActive])
    def stock_movements(self, request, pk=None):
        product = self.get_object()
        serializer = CreateStockMovementSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        m_type = serializer.validated_data['type']
        p_amount = serializer.validated_data.get('purchase_unit_amount')
        s_amount = serializer.validated_data.get('sale_unit_amount')
        reason = serializer.validated_data.get('reason', '')

        with transaction.atomic():
            # 1. Miqdorni sotish birligiga konvertatsiya qilish
            if p_amount is not None:
                calc_sale_amount = Decimal(str(p_amount)) * product.conversion_factor
            else:
                calc_sale_amount = Decimal(str(s_amount))

            # 2. Qoldiqni o'zgartirish
            if m_type == MovementType.KIRIM:
                product.current_stock += calc_sale_amount
            elif m_type == MovementType.CHIQIM:
                if product.current_stock < calc_sale_amount:
                    return Response({'detail': "Ombor qoldig'i yetarli emas!"}, status=status.HTTP_400_BAD_REQUEST)
                product.current_stock -= calc_sale_amount
            elif m_type == MovementType.TUZATISH:
                # To'g'ridan-to'g'ri yangi qoldiq qilib belgilash
                product.current_stock = calc_sale_amount

            product.save(update_fields=['current_stock', 'updated_at'])

            movement = StockMovement.objects.create(
                product=product,
                type=m_type,
                purchase_unit_amount=p_amount,
                sale_unit_amount=calc_sale_amount,
                reason=reason,
                performed_by=request.user
            )

            AuditLog.objects.create(
                tenant=product.tenant,
                user=request.user,
                action=f"stock_{m_type}",
                details={
                    'product_name': product.name,
                    'type': m_type,
                    'amount': str(calc_sale_amount),
                    'unit': product.sale_unit,
                    'reason': reason
                },
                ip_address=request.META.get('REMOTE_ADDR')
            )

        return Response(StockMovementSerializer(movement).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='archive', permission_classes=[permissions.IsAuthenticated, IsManager, IsTenantActive])
    def archive(self, request, pk=None):
        product = self.get_object()
        product.is_archived = not product.is_archived
        product.save(update_fields=['is_archived', 'updated_at'])
        action_name = "arxivlandi" if product.is_archived else "arxivdan chiqarildi"
        return Response({'detail': f"Mahsulot {action_name}."}, status=status.HTTP_200_OK)
