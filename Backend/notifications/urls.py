from django.urls import path
from . import views

urlpatterns = [
    path('notifications/unread-count/', views.unread_count, name='notification-unread-count'),
    path('notifications/', views.NotificationListView.as_view(), name='notification-list'),
    path('notifications/<int:pk>/', views.NotificationDetailView.as_view(), name='notification-detail'),
]
