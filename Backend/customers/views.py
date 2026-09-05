from django.db.models import Q
from rest_framework import generics

from crm.permissions import IsCrmStaff
from customers.models import Customer
from customers.serializers import CustomerSerializer


class CustomerListCreateView(generics.ListCreateAPIView):
    serializer_class = CustomerSerializer
    permission_classes = [IsCrmStaff]

    def get_queryset(self):
        qs = Customer.objects.all().order_by('-created_at')
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(name__icontains=search)
                | Q(phone__icontains=search)
                | Q(email__icontains=search)
            )
        return qs


class CustomerDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CustomerSerializer
    permission_classes = [IsCrmStaff]
    queryset = Customer.objects.all()
