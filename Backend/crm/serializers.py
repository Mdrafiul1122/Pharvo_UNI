from rest_framework import serializers

from crm.models import CrmPermission, Reminder
from customers.models import Customer
from inventory.models import InventoryProduct


class CustomerBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = ['id', 'name', 'phone', 'email', 'membership_tier']


class ProductBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = InventoryProduct
        fields = ['id', 'name', 'brand', 'barcode', 'unit_price']


class ReminderSerializer(serializers.ModelSerializer):
    customer = CustomerBriefSerializer(read_only=True)
    product = ProductBriefSerializer(read_only=True)

    class Meta:
        model = Reminder
        fields = [
            'id',
            'title',
            'reminder_time',
            'customer',
            'product',
            'is_active',
            'created_at',
            'updated_at',
        ]


class ReminderCreateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255, allow_blank=False)
    reminder_time = serializers.DateTimeField()
    customer = serializers.PrimaryKeyRelatedField(queryset=Customer.objects.all())
    product = serializers.PrimaryKeyRelatedField(queryset=InventoryProduct.objects.all())
    is_active = serializers.BooleanField(default=True)

    def validate_title(self, value):
        if not value.strip():
            raise serializers.ValidationError('Title cannot be empty.')
        return value.strip()


class CrmPermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CrmPermission
        fields = [
            'id',
            'customer_id',
            'medicine_id',
            'is_allowed',
            'updated_by',
            'updated_at',
            'notes',
        ]
        read_only_fields = ['updated_by', 'updated_at']
