import uuid
from decimal import Decimal
from django.db import transaction as dj_transaction
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.permissions import IsTenantActive
from apps.core.models import UserRole, AuditLog
from apps.products.models import Product, StockMovement, MovementType
from apps.transactions.models import Transaction, PaymentMethod, TransactionStatus
from apps.debts.models import Debt, DebtHistory, DebtHistoryType

from .models import Basket, BasketItem, BasketStatus
from .serializers import (
    BasketSerializer,
    BasketItemSerializer,
    CreateBasketItemSerializer,
    FinalizeSaleSerializer
)

class BasketViewSet(viewsets.ModelViewSet):
    serializer_class = BasketSerializer
    permission_classes = [permissions.IsAuthenticated, IsTenantActive]

    def get_queryset(self):
        user = self.request.user
        if user.role == UserRole.ADMIN or user.is_superuser:
            qs = Basket.objects.all()
        else:
            qs = Basket.objects.filter(tenant=user.tenant)
            
        # Agar oddiy xodim bo'lsa va boshqa xodimlarni ko'rish shart bo'lmasa, faqat o'z savatlarini oladi
        if user.role == UserRole.WORKER:
            qs = qs.filter(worker=user)
            
        status_param = self.request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param)
            
        return qs.order_by('-updated_at')

    def perform_create(self, serializer):
        user = self.request.user
        serializer.save(
            tenant=user.tenant,
            worker=user,
            status=BasketStatus.ACTIVE
        )

    @action(detail=False, methods=['get'], url_path='active')
    def active_baskets(self, request):
        """Xodimning barcha faol savatlarini qaytarish"""
        qs = self.get_queryset().filter(status=BasketStatus.ACTIVE)
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='items')
    def add_item(self, request, pk=None):
        """Savatga tovar qo'shish"""
        basket = self.get_basket_or_create(pk, request.user)
        serializer = CreateBasketItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        product_id = serializer.validated_data['product_id']
        quantity = Decimal(str(serializer.validated_data.get('quantity', 1)))

        product = get_object_or_404(Product, id=product_id, tenant=request.user.tenant)

        item, created = BasketItem.objects.get_or_create(
            basket=basket,
            product=product,
            defaults={'quantity': quantity, 'scanned_by': request.user}
        )
        if not created:
            item.quantity += quantity
            item.scanned_by = request.user
            item.save(update_fields=['quantity', 'scanned_by', 'updated_at'])

        basket_serializer = BasketSerializer(basket)
        return Response(basket_serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    @action(detail=True, methods=['patch', 'delete'], url_path=r'items/(?P<item_id>[^/.]+)')
    def manage_item(self, request, pk=None, item_id=None):
        """Savatdagi tovar miqdorini o'zgartirish yoki o'chirish"""
        basket = self.get_basket_or_create(pk, request.user)
        item = get_object_or_404(BasketItem, id=item_id, basket=basket)

        if request.method == 'DELETE':
            item.delete()
            return Response({'detail': "Tovar savatdan o'chirildi."}, status=status.HTTP_204_NO_CONTENT)

        # PATCH
        new_quantity = request.data.get('quantity')
        if new_quantity is not None:
            q_val = Decimal(str(new_quantity))
            if q_val <= 0:
                item.delete()
            else:
                item.quantity = q_val
                item.save(update_fields=['quantity', 'updated_at'])

        basket_serializer = BasketSerializer(basket)
        return Response(basket_serializer.data)

    def get_basket_or_create(self, pk, user):
        """ID bo'yicha savatni olish, agar topilmasa (lokal yaratilgan bo'lsa) avtomatik yaratish"""
        basket = Basket.objects.filter(id=pk, tenant=user.tenant).first()
        if not basket:
            # Agar UUID valid bo'lsa shu ID bilan yaratamiz
            try:
                valid_uuid = uuid.UUID(str(pk))
                basket = Basket.objects.create(
                    id=valid_uuid,
                    tenant=user.tenant,
                    worker=user,
                    status=BasketStatus.ACTIVE
                )
            except (ValueError, TypeError):
                basket = Basket.objects.create(
                    tenant=user.tenant,
                    worker=user,
                    status=BasketStatus.ACTIVE
                )
        return basket

    @action(detail=True, methods=['post'], url_path='finalize')
    def finalize_sale(self, request, pk=None):
        """
        Savatdagi tovarlar savdosini yakunlash
        Naqd, Karta, Qarz yoki Aralash to'lovlarni qayta ishlash
        """
        user = request.user
        basket = self.get_basket_or_create(pk, user)

        serializer = FinalizeSaleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        vdata = serializer.validated_data

        payment_method = vdata.get('payment_method', 'cash')
        cash_amount = Decimal(str(vdata.get('cash_amount', 0) or 0))
        card_amount = Decimal(str(vdata.get('card_amount', 0) or 0))
        debt_amount = Decimal(str(vdata.get('debt_amount', 0) or 0))
        discount_amount = Decimal(str(vdata.get('discount_amount', 0) or 0))
        client_name = vdata.get('client_name') or basket.client_name or ''
        client_phone = vdata.get('client_phone') or basket.client_phone or ''
        due_date_raw = vdata.get('due_date')
        due_date = due_date_raw.strip() if (due_date_raw and str(due_date_raw).strip()) else None

        is_debt = (payment_method == 'debt') or (payment_method == 'mixed' and debt_amount > 0)
        
        # Qarz huquqi va limit tekshiruvi
        status_val = TransactionStatus.COMPLETED
        approval_message = None

        if user.role == UserRole.WORKER and is_debt:
            if not user.can_sell_on_debt:
                status_val = TransactionStatus.PENDING_APPROVAL
                approval_message = "Ushbu sotuvchiga to'g'ridan-to'g'ri qarzga sotish ruxsati berilmagan. Savdo menejer tasdig'iga yuborildi."
            elif debt_amount > user.max_debt_limit:
                status_val = TransactionStatus.PENDING_APPROVAL
                approval_message = f"Qarz summasi ({debt_amount:,.0f} UZS) ruxsat etilgan limitdan ({user.max_debt_limit:,.0f} UZS) yuqori. Menejer tasdig'i talab etiladi."

        # Tovar elementlari ro'yxatini yig'ish (snapshot)
        items_snapshot = []
        raw_items = vdata.get('items')

        with dj_transaction.atomic():
            if raw_items:
                for r_item in raw_items:
                    p_id = r_item.get('product_id') or r_item.get('id')
                    prod = Product.objects.filter(id=p_id, tenant=user.tenant).first()
                    qty = Decimal(str(r_item.get('quantity', 1)))
                    price = Decimal(str(r_item.get('price') or (prod.price_per_sale_unit if prod else 0)))
                    subtotal = qty * price
                    items_snapshot.append({
                        'product_id': str(p_id),
                        'product_name': prod.name if prod else (r_item.get('name') or 'Noma\'lum tovar'),
                        'sale_unit': prod.sale_unit if prod else (r_item.get('sale_unit') or 'dona'),
                        'unit_price': float(price),
                        'quantity': float(qty),
                        'subtotal': float(subtotal)
                    })
                    # Skladdan chiqarish (agar completed bo'lsa)
                    if status_val == TransactionStatus.COMPLETED and prod:
                        prod.current_stock -= qty
                        prod.save(update_fields=['current_stock', 'updated_at'])
                        StockMovement.objects.create(
                            product=prod,
                            type=MovementType.CHIQIM,
                            sale_unit_amount=-qty,
                            performed_by=user,
                            reason=f"Savdo (Mobile/POS) #{basket.id}"
                        )
            else:
                # Savatdagi elementlardan olish
                basket_items = basket.items.select_related('product').all()
                for b_item in basket_items:
                    prod = b_item.product
                    qty = b_item.quantity
                    price = prod.price_per_sale_unit
                    subtotal = qty * price
                    items_snapshot.append({
                        'product_id': str(prod.id),
                        'product_name': prod.name,
                        'sale_unit': prod.sale_unit,
                        'unit_price': float(price),
                        'quantity': float(qty),
                        'subtotal': float(subtotal)
                    })
                    # Skladdan chiqarish
                    if status_val == TransactionStatus.COMPLETED:
                        prod.current_stock -= qty
                        prod.save(update_fields=['current_stock', 'updated_at'])
                        StockMovement.objects.create(
                            product=prod,
                            type=MovementType.CHIQIM,
                            sale_unit_amount=-qty,
                            performed_by=user,
                            reason=f"Savdo (Mobile/POS) #{basket.id}"
                        )

            # Jami summani hisoblash
            calculated_total = sum(Decimal(str(it['subtotal'])) for it in items_snapshot)
            if calculated_total == 0 and (cash_amount + card_amount + debt_amount) > 0:
                calculated_total = cash_amount + card_amount + debt_amount - discount_amount

            # 1. Tranzaksiya yaratish
            tx = Transaction.objects.create(
                tenant=user.tenant,
                basket=basket,
                finalized_by=user,
                payment_method=payment_method,
                cash_amount=cash_amount,
                card_amount=card_amount,
                debt_amount=debt_amount,
                discount_amount=discount_amount,
                total_amount=calculated_total,
                status=status_val,
                client_name=client_name,
                client_phone=client_phone,
                items_snapshot=items_snapshot
            )

            # 2. Agar qarz bo'lsa va completed bo'lsa -> Debt va DebtHistory yaratish/yangilash
            if status_val == TransactionStatus.COMPLETED and is_debt and debt_amount > 0:
                debt_obj = Debt.objects.filter(tenant=user.tenant, client_phone=client_phone).first() if client_phone else None
                if not debt_obj and client_name:
                    debt_obj = Debt.objects.filter(tenant=user.tenant, client_name__iexact=client_name).first()

                if debt_obj:
                    debt_obj.remaining_debt += debt_amount
                    debt_obj.total_debt += debt_amount
                    if due_date:
                        debt_obj.due_date = due_date
                    debt_obj.save(update_fields=['remaining_debt', 'total_debt', 'due_date', 'updated_at'])
                else:
                    debt_obj = Debt.objects.create(
                        tenant=user.tenant,
                        client_name=client_name or 'Noma\'lum mijoz',
                        client_phone=client_phone,
                        total_debt=debt_amount,
                        remaining_debt=debt_amount,
                        due_date=due_date
                    )

                DebtHistory.objects.create(
                    debt=debt_obj,
                    type=DebtHistoryType.INCREASE,
                    amount=debt_amount,
                    remaining_after=debt_obj.remaining_debt,
                    created_by=user,
                    notes=f"Savdo (Mobile/POS) #{tx.id}"
                )

            # 3. Savat holatini yangilash
            basket.status = BasketStatus.COMPLETED if status_val == TransactionStatus.COMPLETED else BasketStatus.PENDING_APPROVAL
            basket.client_name = client_name
            basket.client_phone = client_phone
            basket.save(update_fields=['status', 'client_name', 'client_phone', 'updated_at'])

            # 4. Audit log
            AuditLog.objects.create(
                tenant=user.tenant,
                user=user,
                action='savdo_yakunlandi' if status_val == TransactionStatus.COMPLETED else 'savdo_tasdiqqa_yuborildi',
                details={
                    'transaction_id': str(tx.id),
                    'basket_id': str(basket.id),
                    'total_amount': float(tx.total_amount),
                    'payment_method': payment_method,
                    'status': status_val,
                    'debt_amount': float(debt_amount),
                    'items_count': len(items_snapshot)
                },
                ip_address=request.META.get('REMOTE_ADDR')
            )

        resp_status = status.HTTP_201_CREATED if status_val == TransactionStatus.COMPLETED else status.HTTP_200_OK
        return Response({
            'transaction_id': str(tx.id),
            'basket_id': str(basket.id),
            'status': tx.status,
            'total_amount': str(tx.total_amount),
            'debt_amount': str(tx.debt_amount),
            'payment_method': tx.payment_method,
            'message': approval_message or "Savdo muvaffaqiyatli yakunlandi."
        }, status=resp_status)

    @action(detail=False, methods=['post'], url_path='sync-offline')
    def sync_offline(self, request):
        """Oflayn savdo hodisalarini ommaviy sinxronlash"""
        events = request.data.get('events', [])
        synced_count = 0
        conflicts = []

        for evt in events:
            try:
                action_type = evt.get('action')
                if action_type in ['finalize', 'finalize_sale']:
                    temp_id = evt.get('temp_id') or evt.get('temp_basket_id')
                    # Savdoni yakunlash
                    fake_request = type('Request', (), {
                        'user': request.user,
                        'data': evt,
                        'META': request.META
                    })()
                    self.finalize_sale(fake_request, pk=temp_id)
                    synced_count += 1
            except Exception as e:
                conflicts.append({'event': evt, 'error': str(e)})

        return Response({
            'synced_count': synced_count,
            'conflicts': conflicts
        })
