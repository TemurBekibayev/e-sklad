import uuid
from decimal import Decimal
from django.utils import timezone
from django.db import models, transaction
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from apps.core.permissions import IsTenantActive, IsManager
from apps.cafe.models import Hall, Table, TableStatus, Order, OrderStatus, OrderItem, Shift
from apps.cafe.serializers import (
    HallSerializer, TableSerializer, OrderSerializer,
    OrderItemSerializer, ShiftSerializer
)
from apps.products.models import Product
from apps.transactions.models import Transaction


def broadcast_cafe_event(tenant_id, event_type, data):
    try:
        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                f"cafe_tenant_{tenant_id}",
                {
                    "type": "cafe_message",
                    "event": event_type,
                    "data": data,
                }
            )
    except Exception as e:
        print(f"[WebSocket Broadcast Error] {e}")


class HallViewSet(viewsets.ModelViewSet):
    serializer_class = HallSerializer
    permission_classes = [permissions.IsAuthenticated, IsTenantActive]

    def get_queryset(self):
        return Hall.objects.for_tenant(self.request.user.tenant)

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.user.tenant)


class TableViewSet(viewsets.ModelViewSet):
    serializer_class = TableSerializer
    permission_classes = [permissions.IsAuthenticated, IsTenantActive]

    def get_queryset(self):
        return Table.objects.for_tenant(self.request.user.tenant).select_related('hall', 'current_waiter')

    def perform_create(self, serializer):
        table = serializer.save(tenant=self.request.user.tenant)
        broadcast_cafe_event(str(self.request.user.tenant.id), "TABLE_CREATED", TableSerializer(table).data)

    def perform_update(self, serializer):
        table = serializer.save()
        broadcast_cafe_event(str(self.request.user.tenant.id), "TABLE_UPDATED", TableSerializer(table).data)

    @action(detail=True, methods=['post'], url_path='change-status')
    def change_status(self, request, pk=None):
        table = self.get_object()
        new_status = request.data.get('status')
        if new_status in TableStatus.values:
            table.status = new_status
            if new_status == TableStatus.FREE:
                table.active_order_id = None
                table.current_waiter = None
            table.save(update_fields=['status', 'active_order_id', 'current_waiter', 'updated_at'])
            broadcast_cafe_event(str(request.user.tenant.id), "TABLE_STATUS_CHANGED", {
                "table_id": str(table.id),
                "status": table.status
            })
            return Response(TableSerializer(table).data)
        return Response({"detail": "Noto'g'ri holat"}, status=status.HTTP_400_BAD_REQUEST)


class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated, IsTenantActive]

    def get_queryset(self):
        return Order.objects.for_tenant(self.request.user.tenant).select_related('table', 'waiter').prefetch_related('items')

    def create(self, request, *args, **kwargs):
        tenant = request.user.tenant
        table_id = request.data.get('table') or request.data.get('tableId')
        items_data = request.data.get('items', [])
        notes = request.data.get('notes', '')
        guests_count = int(request.data.get('guests_count', 1))

        if not table_id:
            return Response({"detail": "Stol ko'rsatilishi shart"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            table = Table.objects.for_tenant(tenant).get(id=table_id)
        except Table.DoesNotExist:
            return Response({"detail": "Stol topilmadi"}, status=status.HTTP_404_NOT_FOUND)

        with transaction.atomic():
            if table.active_order_id and table.status in [TableStatus.BUSY, TableStatus.BILL_REQUESTED]:
                try:
                    order = Order.objects.for_tenant(tenant).get(id=table.active_order_id, status__in=[OrderStatus.OPEN, OrderStatus.BILL_REQUESTED])
                except Order.DoesNotExist:
                    order = None
            else:
                order = None

            if not order:
                today_count = Order.objects.for_tenant(tenant).filter(created_at__date=timezone.now().date()).count() + 1
                order_number = f"#{today_count:04d}"

                service_pct = table.hall.service_percent if table.hall else Decimal('0.00')

                order = Order.objects.create(
                    tenant=tenant,
                    table=table,
                    order_number=order_number,
                    waiter=request.user,
                    waiter_name=request.user.name or request.user.email,
                    service_percent=service_pct,
                    guests_count=guests_count,
                    notes=notes,
                    status=OrderStatus.OPEN,
                )

                table.status = TableStatus.BUSY
                table.active_order_id = order.id
                table.current_waiter = request.user
                table.save(update_fields=['status', 'active_order_id', 'current_waiter', 'updated_at'])

            for item in items_data:
                prod_id = item.get('product_id') or item.get('product')
                prod_name = item.get('product_name') or ''
                qty = int(item.get('quantity', 1))
                price = Decimal(str(item.get('price', 0)))
                comment = item.get('comment', '')
                workshop = item.get('workshop', 'Oshxona')

                product_obj = None
                if prod_id:
                    try:
                        product_obj = Product.objects.for_tenant(tenant).get(id=prod_id)
                        if not prod_name:
                            prod_name = product_obj.name
                        if not price:
                            price = product_obj.price_per_sale_unit
                    except (Product.DoesNotExist, ValueError):
                        pass

                OrderItem.objects.create(
                    tenant=tenant,
                    order=order,
                    product=product_obj,
                    product_name=prod_name or "Taom",
                    quantity=qty,
                    price=price,
                    total_price=price * qty,
                    comment=comment,
                    workshop=workshop,
                    status='new'
                )

            order.recalculate_totals()

        broadcast_cafe_event(str(tenant.id), "KITCHEN_NEW_TICKET", {
            "orderId": str(order.id),
            "tableNumber": order.table.number if order.table else "",
            "waiterName": order.waiter_name,
        })
        broadcast_cafe_event(str(tenant.id), "ORDER_UPDATED", OrderSerializer(order).data)
        broadcast_cafe_event(str(tenant.id), "TABLE_UPDATED", TableSerializer(table).data)

        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='add-items')
    def add_items(self, request, pk=None):
        order = self.get_object()
        tenant = request.user.tenant
        items_data = request.data.get('items', [])

        with transaction.atomic():
            for item in items_data:
                prod_id = item.get('product_id') or item.get('product')
                prod_name = item.get('product_name') or ''
                qty = int(item.get('quantity', 1))
                price = Decimal(str(item.get('price', 0)))
                comment = item.get('comment', '')
                workshop = item.get('workshop', 'Oshxona')

                product_obj = None
                if prod_id:
                    try:
                        product_obj = Product.objects.for_tenant(tenant).get(id=prod_id)
                        if not prod_name:
                            prod_name = product_obj.name
                        if not price:
                            price = product_obj.price_per_sale_unit
                    except (Product.DoesNotExist, ValueError):
                        pass

                OrderItem.objects.create(
                    tenant=tenant,
                    order=order,
                    product=product_obj,
                    product_name=prod_name or "Taom",
                    quantity=qty,
                    price=price,
                    total_price=price * qty,
                    comment=comment,
                    workshop=workshop,
                    status='new'
                )

            order.recalculate_totals()

        broadcast_cafe_event(str(tenant.id), "KITCHEN_NEW_TICKET", {
            "orderId": str(order.id),
            "tableNumber": order.table.number if order.table else "",
            "waiterName": order.waiter_name,
        })
        broadcast_cafe_event(str(tenant.id), "ORDER_ITEMS_ADDED", OrderSerializer(order).data)
        return Response(OrderSerializer(order).data)

    @action(detail=True, methods=['post'], url_path='bill-request')
    def bill_request(self, request, pk=None):
        order = self.get_object()
        tenant = request.user.tenant

        order.status = OrderStatus.BILL_REQUESTED
        order.save(update_fields=['status', 'updated_at'])

        table = order.table
        table.status = TableStatus.BILL_REQUESTED
        table.save(update_fields=['status', 'updated_at'])

        broadcast_cafe_event(str(tenant.id), "BILL_REQUESTED", {
            "order_id": str(order.id),
            "table_id": str(table.id),
            "table_name": table.name,
            "waiter_name": order.waiter_name,
            "total_amount": str(order.total_amount)
        })
        return Response({"status": "bill_requested", "order": OrderSerializer(order).data})

    @action(detail=True, methods=['post'], url_path='pay')
    def pay(self, request, pk=None):
        order = self.get_object()
        tenant = request.user.tenant

        payment_method = request.data.get('payment_method', 'cash')
        cash_amt = Decimal(str(request.data.get('cash_amount', order.total_amount if payment_method == 'cash' else 0)))
        card_amt = Decimal(str(request.data.get('card_amount', order.total_amount if payment_method == 'card' else 0)))

        with transaction.atomic():
            order.status = OrderStatus.PAID
            order.payment_method = payment_method
            order.cash_amount = cash_amt
            order.card_amount = card_amt
            order.closed_at = timezone.now()
            order.save(update_fields=['status', 'payment_method', 'cash_amount', 'card_amount', 'closed_at', 'updated_at'])

            table = order.table
            table.status = TableStatus.FREE
            table.active_order_id = None
            table.current_waiter = None
            table.save(update_fields=['status', 'active_order_id', 'current_waiter', 'updated_at'])

            items_snapshot = [
                {
                    "product_name": it.product_name,
                    "quantity": it.quantity,
                    "price": str(it.price),
                    "total": str(it.total_price),
                    "comment": it.comment
                }
                for it in order.items.all()
            ]

            Transaction.objects.create(
                tenant=tenant,
                finalized_by=request.user,
                client_name=f"{table.name} (KafePOS)",
                payment_method=payment_method if payment_method in ['cash', 'card'] else 'cash',
                cash_amount=cash_amt,
                card_amount=card_amt,
                total_amount=order.total_amount,
                discount_amount=order.discount_amount,
                status='completed',
                items_snapshot=items_snapshot
            )

        broadcast_cafe_event(str(tenant.id), "PAYMENT_COMPLETED", {
            "order_id": str(order.id),
            "table_id": str(table.id),
            "total_amount": str(order.total_amount),
            "payment_method": payment_method
        })

        return Response({
            "success": True,
            "order": OrderSerializer(order).data,
            "table": TableSerializer(table).data
        })

    @action(detail=False, methods=['get'], url_path='kitchen-tickets')
    def kitchen_tickets(self, request):
        tenant = request.user.tenant
        cutoff_time = timezone.now() - timezone.timedelta(hours=24)
        orders = (
            Order.objects.for_tenant(tenant)
            .filter(
                models.Q(status__in=[OrderStatus.OPEN, OrderStatus.BILL_REQUESTED])
                | models.Q(
                    status=OrderStatus.PAID,
                    created_at__gte=cutoff_time,
                )
            )
            .distinct()
            .select_related('table', 'waiter')
            .prefetch_related('items')
            .order_by('created_at')
        )

        tickets = []
        for ord in orders:
            active_items = ord.items.exclude(status='cancelled')
            if active_items.exists():
                all_ready = all(it.status == 'ready' for it in active_items)
                if ord.status == OrderStatus.PAID and all_ready and ord.created_at < (timezone.now() - timezone.timedelta(minutes=30)):
                    continue

                any_cooking = any(it.status in ['cooking', 'in_progress'] for it in active_items)
                calc_status = "ready" if all_ready else ("in_progress" if any_cooking else "pending")

                tickets.append({
                    "id": f"ticket_{ord.id}",
                    "orderId": str(ord.id),
                    "tableNumber": ord.table.number if ord.table else ord.table_name or "Stol",
                    "tableName": ord.table.name if ord.table else ord.table_name or "Stol",
                    "waiterName": ord.waiter_name or (ord.waiter.name if ord.waiter else "Ofitsiant"),
                    "timestamp": ord.created_at.isoformat(),
                    "status": calc_status,
                    "order_status": ord.status,
                    "items": [
                        {
                            "id": str(it.id),
                            "productId": str(it.product.id) if it.product else None,
                            "product_name": it.product_name,
                            "quantity": it.quantity,
                            "comment": it.comment,
                            "workshop": it.workshop,
                            "status": it.status,
                        }
                        for it in active_items
                    ]
                })

        return Response({"success": True, "tickets": tickets})

    @action(detail=True, methods=['post'], url_path='kitchen-status')
    def kitchen_status(self, request, pk=None):
        order = self.get_object()
        tenant = request.user.tenant
        new_status = request.data.get('status', 'in_progress')

        if new_status == 'ready':
            order.items.exclude(status='cancelled').update(status='ready')
            broadcast_cafe_event(str(tenant.id), "KITCHEN_TICKET_READY", {
                "orderId": str(order.id),
                "tableNumber": order.table.number if order.table else "",
                "waiterName": order.waiter_name,
            })
        elif new_status == 'in_progress':
            order.items.exclude(status='cancelled').filter(status='new').update(status='cooking')
            broadcast_cafe_event(str(tenant.id), "KITCHEN_TICKET_IN_PROGRESS", {
                "orderId": str(order.id),
                "tableNumber": order.table.number if order.table else "",
            })

        return Response({"success": True, "status": new_status})

    @action(detail=True, methods=['post'], url_path='item-out-of-stock')
    def item_out_of_stock(self, request, pk=None):
        order = self.get_object()
        tenant = request.user.tenant
        item_id = request.data.get('itemId')
        product_name = request.data.get('productName', '')

        with transaction.atomic():
            if item_id:
                order.items.filter(id=item_id).update(status='cancelled')
            elif product_name:
                order.items.filter(product_name=product_name).update(status='cancelled')
            order.recalculate_totals()

        broadcast_cafe_event(str(tenant.id), "DISH_OUT_OF_STOCK", {
            "orderId": str(order.id),
            "tableNumber": order.table.number if order.table else "",
            "waiterName": order.waiter_name,
            "productName": product_name,
            "message": f"{order.table.name if order.table else 'Stol'} uchun '{product_name}' oshxonada yo'q deb belgilandi!",
        })
        broadcast_cafe_event(str(tenant.id), "ORDER_UPDATED", OrderSerializer(order).data)

        return Response({"success": True, "order": OrderSerializer(order).data})


class ShiftViewSet(viewsets.ModelViewSet):
    serializer_class = ShiftSerializer
    permission_classes = [permissions.IsAuthenticated, IsTenantActive]

    def get_queryset(self):
        return Shift.objects.for_tenant(self.request.user.tenant)

    @action(detail=False, methods=['post'], url_path='open')
    def open_shift(self, request):
        tenant = request.user.tenant
        opening_cash = Decimal(str(request.data.get('opening_cash', 0)))

        shift = Shift.objects.create(
            tenant=tenant,
            user=request.user,
            opening_cash=opening_cash,
            status='open'
        )
        return Response(ShiftSerializer(shift).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='close')
    def close_shift(self, request, pk=None):
        shift = self.get_object()
        closing_cash = Decimal(str(request.data.get('closing_cash', 0)))

        shift.closing_cash = closing_cash
        shift.closed_at = timezone.now()
        shift.status = 'closed'
        shift.save(update_fields=['closing_cash', 'closed_at', 'status', 'updated_at'])

        return Response(ShiftSerializer(shift).data)
