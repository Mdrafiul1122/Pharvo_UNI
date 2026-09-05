from django.contrib.auth import get_user_model
from rest_framework import serializers

from customers.models import Customer
from inventory.models import InventoryProduct
from sales.models import Sale, SaleItem, SalePayment

User = get_user_model()


class ProductBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = InventoryProduct
        fields = ['id', 'name', 'brand', 'barcode', 'unit_price', 'stock_quantity']


class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = ['id', 'name', 'phone', 'email', 'membership_tier', 'loyalty_points']


class PosUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'role']


class SaleItemSerializer(serializers.ModelSerializer):
    product = ProductBriefSerializer(read_only=True)

    class Meta:
        model = SaleItem
        fields = [
            'id',
            'product',
            'quantity',
            'unit',
            'quantity_pcs',
            'unit_price',
            'subtotal',
        ]


class SalePaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalePayment
        fields = ['id', 'method', 'amount', 'created_at']


class SaleSerializer(serializers.ModelSerializer):
    customer = CustomerSerializer(read_only=True)
    user = PosUserSerializer(read_only=True)
    items = SaleItemSerializer(many=True, read_only=True)
    payments = SalePaymentSerializer(many=True, read_only=True)
    # CRM discount fields (populated at checkout time, absent in list views)
    manual_discount = serializers.SerializerMethodField()
    crm_discount = serializers.SerializerMethodField()
    crm_discount_breakdown = serializers.SerializerMethodField()
    crm_eligible = serializers.SerializerMethodField()

    class Meta:
        model = Sale
        fields = [
            'id',
            'invoice_number',
            'customer',
            'user',
            'total_amount',
            'discount',
            'manual_discount',
            'crm_discount',
            'crm_discount_breakdown',
            'crm_eligible',
            'payable_amount',
            'payment_method',
            'sale_date',
            'created_at',
            'items',
            'payments',
        ]

    def get_manual_discount(self, obj):
        info = getattr(obj, '_crm_discount_info', None)
        return info['manual_discount'] if info else None

    def get_crm_discount(self, obj):
        info = getattr(obj, '_crm_discount_info', None)
        return info['crm_discount'] if info else None

    def get_crm_discount_breakdown(self, obj):
        info = getattr(obj, '_crm_discount_info', None)
        return info['crm_discount_breakdown'] if info else None

    def get_crm_eligible(self, obj):
        info = getattr(obj, '_crm_discount_info', None)
        return info['crm_eligible'] if info else None


class CheckoutItemSerializer(serializers.Serializer):
    product = serializers.PrimaryKeyRelatedField(queryset=InventoryProduct.objects.all())
    quantity = serializers.IntegerField(min_value=1)
    unit = serializers.ChoiceField(choices=['pc', 'strip', 'box'])
    unit_price = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=0)


class CheckoutPaymentSerializer(serializers.Serializer):
    method = serializers.CharField(max_length=50)
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=0)


class CheckoutSerializer(serializers.Serializer):
    customer = serializers.PrimaryKeyRelatedField(
        queryset=Customer.objects.all(), required=False, allow_null=True
    )
    items = CheckoutItemSerializer(many=True)
    discount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, min_value=0)
    payments = CheckoutPaymentSerializer(many=True)

    def validate(self, attrs):
        if not attrs.get('items'):
            raise serializers.ValidationError('At least one item is required.')
        payments = attrs.get('payments', [])
        if not payments:
            raise serializers.ValidationError('At least one payment is required.')
        if sum(p['amount'] for p in payments) <= 0:
            raise serializers.ValidationError('Payment total must be greater than zero.')
        return attrs