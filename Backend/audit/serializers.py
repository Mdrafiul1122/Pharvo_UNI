from rest_framework import serializers

from accounts.models import User
from audit.models import AuditLog


class UserBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'role']


class AuditLogSerializer(serializers.ModelSerializer):
    user = UserBriefSerializer(read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            'id',
            'action',
            'details',
            'ip_address',
            'timestamp',
            'user',
            'user_id',
        ]
        read_only_fields = fields
