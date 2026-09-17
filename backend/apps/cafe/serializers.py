from rest_framework import serializers
from apps.cafe.models import Hall, Table, Order, OrderItem, Shift
from apps.products.serializers import ProductSerializer

class HallSerializer(serializers.ModelSerializer):
    tables_count = serializers.SerializerMethodField()

    class Meta:
        model = Hall
        fields = ['id', 'name', 'service_percent', 'is_active', 'sort_order', 'tables_count', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_tables_count(self, obj):
        return obj.tables.count()


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = [
            'id', 'order', 'product', 'product_name', 'quantity', 'price',
            'total_price', 'comment', 'workshop', 'status', 'printed_at', 'created_at'
        ]
        read_only_fields = ['id', 'total_price', 'created_at']


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    table_name = serializers.CharField(source='table.name', read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'table', 'table_name', 'waiter', 'waiter_name',
            'status', 'service_percent', 'service_amount', 'discount_percent',
            'discount_amount', 'subtotal', 'total_amount', 'payment_method',
            'cash_amount', 'card_amount', 'guests_count', 'notes', 'items',
            'opened_at', 'closed_at', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'order_number', 'service_amount', 'subtotal', 'total_amount',
            'opened_at', 'closed_at', 'created_at', 'updated_at'
        ]


class TableSerializer(serializers.ModelSerializer):
    hall_name = serializers.CharField(source='hall.name', read_only=True)
    current_waiter_name = serializers.CharField(source='current_waiter.name', read_only=True)
    active_order = serializers.SerializerMethodField()

    class Meta:
        model = Table
        fields = [
            'id', 'hall', 'hall_name', 'number', 'name', 'capacity',
            'status', 'current_waiter', 'current_waiter_name',
            'active_order_id', 'active_order', 'qr_token', 'created_at'
        ]
        read_only_fields = ['id', 'qr_token', 'created_at']

    def get_active_order(self, obj):
        if obj.active_order_id:
            try:
                order = Order.objects.get(id=obj.active_order_id)
                return OrderSerializer(order).data
            except Order.DoesNotExist:
                return None
        return None


class ShiftSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.name', read_only=True)

    class Meta:
        model = Shift
        fields = [
            'id', 'user', 'user_name', 'opened_at', 'closed_at',
            'opening_cash', 'closing_cash', 'total_sales', 'status'
        ]
        read_only_fields = ['id', 'opened_at']
