from rest_framework import generics

from audit.models import AuditLog
from audit.permissions import IsAuditStaff
from audit.serializers import AuditLogSerializer


class AuditLogListView(generics.ListAPIView):
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuditStaff]

    def get_queryset(self):
        qs = AuditLog.objects.select_related('user').order_by('-timestamp', '-id')

        action = self.request.query_params.get('action')
        if action:
            qs = qs.filter(action__icontains=action)

        user_id = self.request.query_params.get('user')
        if user_id:
            qs = qs.filter(user_id=user_id)

        start_date = self.request.query_params.get('start_date')
        if start_date:
            qs = qs.filter(timestamp__date__gte=start_date)

        end_date = self.request.query_params.get('end_date')
        if end_date:
            qs = qs.filter(timestamp__date__lte=end_date)

        return qs


class AuditLogDetailView(generics.RetrieveAPIView):
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuditStaff]
    queryset = AuditLog.objects.select_related('user')
