from django.utils import timezone
from rest_framework import serializers

from .models import Customer


class CustomerSerializer(serializers.ModelSerializer):
    created_at = serializers.DateTimeField(read_only=True)
    member_since = serializers.DateField(required=False, allow_null=True)
    address = serializers.CharField(required=False, allow_blank=True)
    email = serializers.CharField(required=False, allow_blank=True, max_length=254)
    loyalty_points = serializers.IntegerField(required=False)
    membership_tier = serializers.CharField(required=False, allow_blank=True, max_length=20)

    class Meta:
        model = Customer
        fields = [
            'id',
            'name',
            'phone',
            'email',
            'address',
            'loyalty_points',
            'created_at',
            'date_of_birth',
            'member_since',
            'membership_tier',
            'notes',
        ]
        read_only_fields = ['id', 'created_at']

    def create(self, validated_data):
        validated_data.setdefault('created_at', timezone.now())
        validated_data.setdefault('loyalty_points', 0)
        validated_data.setdefault('membership_tier', 'regular')
        validated_data.setdefault('notes', '')
        return super().create(validated_data)
