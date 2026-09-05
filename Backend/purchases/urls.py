from django.urls import path

from purchases.views import PurchaseCreateView, PurchaseListView

urlpatterns = [
    path('purchases/create/', PurchaseCreateView.as_view(), name='purchase-create'),
    path('purchases/', PurchaseListView.as_view(), name='purchase-list'),
]