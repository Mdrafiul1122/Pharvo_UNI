from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True, default=None)

    class Meta:
        model = Notification
        fields = [
            'id', 'type', 'title', 'message', 'severity',
            'is_read', 'dedup_key', 'created_at', 'product', 'product_name',
        ]
        read_only_fields = ['id', 'created_at', 'dedup_key']
