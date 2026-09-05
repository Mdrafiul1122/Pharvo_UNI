from django.urls import path

from sales.views import CheckoutView, DiscountPreviewView, SaleListView

urlpatterns = [
    path('pos/checkout/', CheckoutView.as_view(), name='pos-checkout'),
    path('pos/discount-preview/', DiscountPreviewView.as_view(), name='pos-discount-preview'),
    path('sales/', SaleListView.as_view(), name='sales-list'),
]