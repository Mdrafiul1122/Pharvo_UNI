from django.urls import path

from .views import (
    InteractionCheckView,
    InteractionListView,
    ProductDetailView,
    ProductListView,
)

urlpatterns = [
    path('inventory/', ProductListView.as_view(), name='inventory-list'),
    path('inventory/<int:pk>/', ProductDetailView.as_view(), name='inventory-detail'),
    path('interactions/', InteractionListView.as_view(), name='interaction-list'),
    path('interactions/check/', InteractionCheckView.as_view(), name='interaction-check'),
]
