from django.urls import path

from crm.views import CustomerReminderListView, ReminderDetailView, ReminderListCreateView

urlpatterns = [
    path('crm/reminders/', ReminderListCreateView.as_view(), name='crm-reminder-list-create'),
    path('crm/reminders/<int:pk>/', ReminderDetailView.as_view(), name='crm-reminder-detail'),
    path('crm/customers/<int:customer_id>/reminders/', CustomerReminderListView.as_view(), name='crm-customer-reminders'),
]
