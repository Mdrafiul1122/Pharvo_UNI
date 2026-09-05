from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Notification
from .permissions import IsNotificationStaff
from .serializers import NotificationSerializer


class NotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [IsNotificationStaff]

    def get_queryset(self):
        return Notification.objects.all()


class NotificationDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [IsNotificationStaff]
    queryset = Notification.objects.all()


@api_view(['GET'])
@permission_classes([IsNotificationStaff])
def unread_count(request):
    count = Notification.objects.filter(is_read=False).count()
    return Response({'unread_count': count})
