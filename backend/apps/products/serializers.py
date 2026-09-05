from decimal import Decimal
from rest_framework import serializers
from .models import Product, StockMovement, PriceHistory, MovementType

from apps.core.models import Tenant

class ProductSerializer(serializers.ModelSerializer):
    available_stock = serializers.DecimalField(max_digits=14, decimal_places=4, read_only=True)
    is_low_stock = serializers.BooleanField(read_only=True)
    tenant_name = serializers.CharField(source='tenant.name', read_only=True)
    tenant_id = serializers.UUIDField(source='tenant.id', required=False, allow_null=True)

    class Meta:
        model = Product
        fields = [
            'id', 'tenant', 'tenant_id', 'tenant_name', 'name', 'purchase_unit', 'sale_unit', 'conversion_factor',
            'price_per_sale_unit', 'current_stock', 'reserved_stock',
            'available_stock', 'barcode', 'qr_code', 'low_stock_threshold',
            'is_low_stock', 'is_archived', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'tenant', 'tenant_name', 'reserved_stock', 'available_stock', 'is_low_stock', 'created_at', 'updated_at']

    def validate_barcode(self, value):
        if not value:
            return value
        value = value.strip()
        request = self.context.get('request')
        tenant = getattr(request, 'tenant', None) if request else None
        if not tenant and request and (getattr(request.user, 'role', '') == 'admin' or getattr(request.user, 'is_superuser', False)):
            t_id = self.initial_data.get('tenant_id') or self.initial_data.get('tenant')
            if t_id:
                tenant = Tenant.objects.filter(id=t_id).first()

        if tenant:
            qs = Product.objects.filter(tenant=tenant, barcode=value)
            if self.instance:
                qs = qs.exclude(id=self.instance.id)
            if qs.exists():
                existing = qs.first()
                raise serializers.ValidationError(
                    f"Ushbu shtrix-kod allaqachon '{existing.name}' mahsulotiga biriktirilgan!"
                )
        return value

    def validate_qr_code(self, value):
        if not value:
            return value
        value = value.strip()
        request = self.context.get('request')
        tenant = getattr(request, 'tenant', None) if request else None
        if not tenant and request and (getattr(request.user, 'role', '') == 'admin' or getattr(request.user, 'is_superuser', False)):
            t_id = self.initial_data.get('tenant_id') or self.initial_data.get('tenant')
            if t_id:
                tenant = Tenant.objects.filter(id=t_id).first()

        if tenant:
            qs = Product.objects.filter(tenant=tenant, qr_code=value)
            if self.instance:
                qs = qs.exclude(id=self.instance.id)
            if qs.exists():
                existing = qs.first()
                raise serializers.ValidationError(
                    f"Ushbu QR kod allaqachon '{existing.name}' mahsulotiga biriktirilgan!"
                )
        return value

    def validate_price_per_sale_unit(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("Mahsulot narxi manfiy bo'lishi mumkin emas!")
        return value

    def validate_conversion_factor(self, value):
        if value is not None and value <= 0:
            raise serializers.ValidationError("Konversiya koeffitsienti 0 dan katta bo'lishi shart!")
        return value


class StockMovementSerializer(serializers.ModelSerializer):
    performed_by_name = serializers.CharField(source='performed_by.name', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    sale_unit = serializers.CharField(source='product.sale_unit', read_only=True)

    class Meta:
        model = StockMovement
        fields = [
            'id', 'product', 'product_name', 'type', 'purchase_unit_amount',
            'sale_unit_amount', 'reason', 'performed_by', 'performed_by_name',
            'sale_unit', 'created_at'
        ]
        read_only_fields = ['id', 'product', 'performed_by', 'sale_unit_amount', 'created_at']


class CreateStockMovementSerializer(serializers.Serializer):
    type = serializers.ChoiceField(choices=MovementType.choices)
    purchase_unit_amount = serializers.DecimalField(max_digits=14, decimal_places=4, required=False, allow_null=True)
    sale_unit_amount = serializers.DecimalField(max_digits=14, decimal_places=4, required=False, allow_null=True)
    reason = serializers.CharField(required=False, allow_blank=True, default='')

    def validate(self, attrs):
        m_type = attrs.get('type')
        p_amount = attrs.get('purchase_unit_amount')
        s_amount = attrs.get('sale_unit_amount')
        reason = attrs.get('reason', '')

        if m_type == MovementType.TUZATISH and not reason.strip():
            raise serializers.ValidationError({"reason": "Inventarizatsiya tuzatishi uchun sabab (izoh) kiritilishi majburiy!"})

        if p_amount is None and s_amount is None:
            raise serializers.ValidationError("Kelish yoki sotish birligidagi miqdordan kamida biri kiritilishi shart!")

        return attrs


class PriceHistorySerializer(serializers.ModelSerializer):
    changed_by_name = serializers.CharField(source='changed_by.name', read_only=True)

    class Meta:
        model = PriceHistory
        fields = ['id', 'product', 'old_price', 'new_price', 'changed_by', 'changed_by_name', 'created_at']
        read_only_fields = '__all__'
