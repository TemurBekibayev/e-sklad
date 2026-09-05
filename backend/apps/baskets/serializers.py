import uuid
from decimal import Decimal
from rest_framework import serializers
from apps.products.models import Product
from .models import Basket, BasketItem, BasketStatus

class BasketItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    sale_unit = serializers.CharField(source='product.sale_unit', read_only=True)
    unit_price = serializers.DecimalField(source='product.price_per_sale_unit', max_digits=14, decimal_places=2, read_only=True)
    subtotal = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model = BasketItem
        fields = [
            'id', 'basket', 'product', 'product_name', 
            'sale_unit', 'unit_price', 'quantity', 
            'subtotal', 'added_at', 'updated_at'
        ]
        read_only_fields = ['id', 'basket', 'added_at', 'updated_at']

class BasketSerializer(serializers.ModelSerializer):
    items = BasketItemSerializer(many=True, read_only=True)
    total_amount = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    items_count = serializers.IntegerField(read_only=True)
    worker_name = serializers.CharField(source='worker.name', read_only=True)

    class Meta:
        model = Basket
        fields = [
            'id', 'worker', 'worker_name', 'client_name', 'client_phone',
            'status', 'notes', 'items_count', 'total_amount', 'items',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'worker', 'created_at', 'updated_at']

class CreateBasketItemSerializer(serializers.Serializer):
    product_id = serializers.UUIDField()
    quantity = serializers.DecimalField(max_digits=14, decimal_places=4, default=Decimal('1.0000'))

class FinalizeSaleSerializer(serializers.Serializer):
    payment_method = serializers.CharField(required=False, default='cash')
    cash_amount = serializers.DecimalField(max_digits=14, decimal_places=2, required=False, default=Decimal('0.00'))
    card_amount = serializers.DecimalField(max_digits=14, decimal_places=2, required=False, default=Decimal('0.00'))
    debt_amount = serializers.DecimalField(max_digits=14, decimal_places=2, required=False, default=Decimal('0.00'))
    discount_amount = serializers.DecimalField(max_digits=14, decimal_places=2, required=False, default=Decimal('0.00'))
    client_name = serializers.CharField(max_length=255, required=False, allow_blank=True, default='')
    client_phone = serializers.CharField(max_length=50, required=False, allow_blank=True, default='')
    due_date = serializers.CharField(required=False, allow_blank=True, allow_null=True, default='')
    items = serializers.ListField(child=serializers.DictField(), required=False)

    def validate_payment_method(self, value):
        val = str(value).strip().lower()
        mapping = {
            'naqd': 'cash',
            'cash': 'cash',
            'karta': 'card',
            'card': 'card',
            'qarz': 'debt',
            'debt': 'debt',
            'aralash': 'mixed',
            'mixed': 'mixed',
        }
        if val in mapping:
            return mapping[val]
        raise serializers.ValidationError(f"'{value}' yaroqsiz to'lov turi. Ruxsat etilganlar: naqd, karta, qarz, aralash.")

