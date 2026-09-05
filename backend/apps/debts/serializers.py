from decimal import Decimal
from rest_framework import serializers
from .models import Debt, DebtHistory, DebtPaymentMethod, DebtHistoryType

class DebtHistorySerializer(serializers.ModelSerializer):
    performed_by_name = serializers.CharField(source='performed_by.name', read_only=True)

    class Meta:
        model = DebtHistory
        fields = [
            'id', 'debt', 'transaction', 'amount', 'type',
            'payment_method', 'performed_by', 'performed_by_name',
            'notes', 'created_at'
        ]
        read_only_fields = ['id', 'debt', 'performed_by', 'created_at']


class DebtSerializer(serializers.ModelSerializer):
    is_overdue = serializers.BooleanField(read_only=True)
    history = DebtHistorySerializer(many=True, read_only=True)
    tenant_name = serializers.CharField(source='tenant.name', read_only=True)

    class Meta:
        model = Debt
        fields = [
            'id', 'tenant', 'tenant_name', 'client_name', 'client_phone',
            'total_debt', 'remaining_debt', 'due_date', 'is_overdue',
            'is_phone_verified', 'verified_at',
            'last_sms_sent_at', 'notes', 'history', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'tenant', 'tenant_name', 'is_overdue', 'is_phone_verified', 'verified_at', 'last_sms_sent_at', 'created_at', 'updated_at']


class DebtPaymentSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=14, decimal_places=2)
    payment_method = serializers.ChoiceField(
        choices=DebtPaymentMethod.choices,
        default=DebtPaymentMethod.CASH
    )
    notes = serializers.CharField(required=False, allow_blank=True, default='')

    def validate_amount(self, value):
        if value <= Decimal('0.00'):
            raise serializers.ValidationError("To'lov summasi 0 dan katta bo'lishi shart!")
        return value


class SendSmsSerializer(serializers.Serializer):
    message = serializers.CharField(required=False, allow_blank=True, default='')


class VerifyPhoneSendCodeSerializer(serializers.Serializer):
    phone = serializers.CharField(max_length=30)
    client_name = serializers.CharField(max_length=255, required=False, allow_blank=True, default='')


class VerifyPhoneCheckCodeSerializer(serializers.Serializer):
    phone = serializers.CharField(max_length=30)
    code = serializers.CharField(max_length=10)

