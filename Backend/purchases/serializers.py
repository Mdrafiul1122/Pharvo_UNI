from rest_framework import serializers

from inventory.models import InventoryProduct, InventorySupplier
from purchases.models import Purchase, PurchaseItem
from sales.serializers import PosUserSerializer, ProductBriefSerializer


class SupplierBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = InventorySupplier
        fields = ['id', 'name', 'contact_person', 'phone', 'email']


class PurchaseItemSerializer(serializers.ModelSerializer):
    product = ProductBriefSerializer(read_only=True)

    class Meta:
        model = PurchaseItem
        fields = [
            'id',
            'product',
            'quantity',
            'unit_price',
            'subtotal',
            'expiry_date',
            'manufactured_date',
        ]


class PurchaseSerializer(serializers.ModelSerializer):
    supplier = SupplierBriefSerializer(read_only=True)
    user = PosUserSerializer(read_only=True)
    items = PurchaseItemSerializer(many=True, read_only=True)

    class Meta:
        model = Purchase
        fields = [
            'id',
            'invoice_number',
            'supplier',
            'user',
            'total_amount',
            'discount',
            'payable_amount',
            'purchase_date',
            'created_at',
            'items',
        ]


class PurchaseCreateItemSerializer(serializers.Serializer):
    product = serializers.PrimaryKeyRelatedField(queryset=InventoryProduct.objects.all())
    quantity = serializers.IntegerField(min_value=1)
    unit_price = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=0)
    expiry_date = serializers.DateField(required=False, allow_null=True)
    manufactured_date = serializers.DateField(required=False, allow_null=True)


class PurchaseCreateSerializer(serializers.Serializer):
    supplier = serializers.PrimaryKeyRelatedField(queryset=InventorySupplier.objects.all())
    items = PurchaseCreateItemSerializer(many=True)
    discount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, min_value=0)

    def validate(self, attrs):
        if not attrs.get('items'):
            raise serializers.ValidationError({'items': 'At least one item is required.'})
        return attrs