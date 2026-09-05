from django.urls import path

from audit.views import AuditLogDetailView, AuditLogListView

urlpatterns = [
    path('audit/', AuditLogListView.as_view(), name='audit-list'),
    path('audit/<int:pk>/', AuditLogDetailView.as_view(), name='audit-detail'),
]
