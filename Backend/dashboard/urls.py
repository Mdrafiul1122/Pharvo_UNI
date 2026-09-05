from django.urls import path

from dashboard.views import (
    CustomersReportView,
    DashboardView,
    PurchasesReportView,
    SalesReportView,
    StockReportView,
)

urlpatterns = [
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
    path('reports/sales/', SalesReportView.as_view(), name='reports-sales'),
    path('reports/purchases/', PurchasesReportView.as_view(), name='reports-purchases'),
    path('reports/stock/', StockReportView.as_view(), name='reports-stock'),
    path('reports/customers/', CustomersReportView.as_view(), name='reports-customers'),
]
