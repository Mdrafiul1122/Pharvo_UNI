from rest_framework import serializers

from .models import (
    DrugInteraction,
    InventoryCategory,
    InventoryMedicineGroup,
    InventoryProduct,
    InventorySupplier,
)


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = InventoryCategory
        fields = ['id', 'name']


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = InventorySupplier
        fields = ['id', 'name']


class MedicineGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = InventoryMedicineGroup
        fields = ['id', 'name']


class DrugInteractionSerializer(serializers.ModelSerializer):
    class Meta:
        model = DrugInteraction
        fields = [
            'id',
            'drug_a',
            'drug_b',
            'interaction_level',
            'description',
            'is_active',
        ]


class InteractionCheckSerializer(serializers.Serializer):
    product_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        required=True,
    )

    def validate_product_ids(self, value):
        if not value:
            raise serializers.ValidationError('At least one product is required.')
        if len(value) != len(set(value)):
            raise serializers.ValidationError('Duplicate product IDs are not allowed.')
        return value


class ProductSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    supplier = SupplierSerializer(read_only=True)
    group = MedicineGroupSerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        source='category', queryset=InventoryCategory.objects.all(),
        required=False, allow_null=True, write_only=True,
    )
    supplier_id = serializers.PrimaryKeyRelatedField(
        source='supplier', queryset=InventorySupplier.objects.all(),
        required=False, allow_null=True, write_only=True,
    )
    group_id = serializers.PrimaryKeyRelatedField(
        source='group', queryset=InventoryMedicineGroup.objects.all(),
        required=False, allow_null=True, write_only=True,
    )
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)

    class Meta:
        model = InventoryProduct
        fields = [
            'id',
            'name',
            'brand',
            'barcode',
            'unit_price',
            'cost_price',
            'stock_quantity',
            'reorder_level',
            'expiry_date',
            'is_active',
            'description',
            'category',
            'supplier',
            'group',
            'category_id',
            'supplier_id',
            'group_id',
            'created_at',
            'updated_at',
            'box_price',
            'strip_price',
            'pcs_per_box',
            'pcs_per_strip',
            'strips_per_box',
            'is_sensitive',
        ]
        read_only_fields = ['id']

    def create(self, validated_data):
        from django.utils import timezone

        now = timezone.now()
        validated_data['created_at'] = now
        validated_data['updated_at'] = now
        return super().create(validated_data)

    def update(self, instance, validated_data):
        from django.utils import timezone

        validated_data['updated_at'] = timezone.now()
        return super().update(instance, validated_data)
