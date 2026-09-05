from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from crm.models import Reminder
from crm.permissions import IsCrmStaff
from crm.serializers import ReminderCreateSerializer, ReminderSerializer


class ReminderListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsCrmStaff]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ReminderCreateSerializer
        return ReminderSerializer

    def get_queryset(self):
        return (
            Reminder.objects.select_related('customer', 'product')
            .order_by('-created_at')
        )

    def create(self, request, *args, **kwargs):
        serializer = ReminderCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        now = timezone.now()
        reminder = Reminder.objects.create(
            title=data['title'],
            reminder_time=data['reminder_time'],
            customer=data['customer'],
            product=data['product'],
            is_active=data.get('is_active', True),
            created_at=now,
            updated_at=now,
        )

        output = ReminderSerializer(reminder).data
        return Response(output, status=status.HTTP_201_CREATED)


class ReminderDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ReminderSerializer
    permission_classes = [IsCrmStaff]
    queryset = Reminder.objects.select_related('customer', 'product')

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = ReminderCreateSerializer(data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        now = timezone.now()
        for attr, value in data.items():
            setattr(instance, attr, value)
        instance.updated_at = now
        instance.save()

        output = ReminderSerializer(instance).data
        return Response(output)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CustomerReminderListView(generics.ListAPIView):
    serializer_class = ReminderSerializer
    permission_classes = [IsCrmStaff]

    def get_queryset(self):
        customer_id = self.kwargs['customer_id']
        return (
            Reminder.objects.select_related('customer', 'product')
            .filter(customer_id=customer_id)
            .order_by('-created_at')
        )
