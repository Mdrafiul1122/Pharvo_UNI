from datetime import timedelta

from django.db.models import Count, F, Q, Sum
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from customers.models import Customer
from dashboard.permissions import IsDashboardStaff
from inventory.models import InventoryProduct
from purchases.models import Purchase, PurchaseItem
from sales.models import Sale, SaleItem


def _parse_date_filters(request):
    """Extract optional date_from / date_to query params (YYYY-MM-DD)."""
    date_from = request.query_params.get('date_from')
    date_to = request.query_params.get('date_to')
    return date_from, date_to


def _build_date_range_trend(qs, date_field, days=7):
    """Return a list of {date, count, revenue} dicts for the last N days."""
    today = timezone.localdate()
    trend = []
    for i in range(days - 1, -1, -1):
        d = today - timedelta(days=i)
        day_count = qs.filter(**{date_field: d}).count()
        day_rev = qs.filter(**{date_field: d}).aggregate(
            total=Sum('payable_amount')
        )['total'] or 0
        trend.append({
            'date': str(d),
            'count': day_count,
            'revenue': float(day_rev),
        })
    return trend


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

class DashboardView(APIView):
    permission_classes = [IsDashboardStaff]

    def get(self, request):
        today = timezone.localdate()
        now = timezone.now()
        today_start = timezone.make_aware(
            timezone.datetime.combine(today, timezone.datetime.min.time())
        )

        # --- Product stats ---
        products = InventoryProduct.objects.all()
        total_products = products.count()
        active_products = products.filter(is_active=True).count()
        low_stock = products.filter(
            is_active=True,
            stock_quantity__lte=F('reorder_level'),
            stock_quantity__gt=0,
        ).count()
        out_of_stock = products.filter(stock_quantity=0).count()
        expired = products.filter(
            expiry_date__isnull=False,
            expiry_date__lt=today,
        ).count()
        near_expiry = products.filter(
            expiry_date__isnull=False,
            expiry_date__gte=today,
            expiry_date__lte=today + timedelta(days=30),
        ).count()

        # --- Customer stats ---
        total_customers = Customer.objects.count()

        # --- Sales stats ---
        sales_qs = Sale.objects.all()
        today_sales_qs = sales_qs.filter(sale_date=today)
        today_sales_count = today_sales_qs.count()
        today_revenue = today_sales_qs.aggregate(
            total=Sum('payable_amount')
        )['total'] or 0
        total_revenue = sales_qs.aggregate(
            total=Sum('payable_amount')
        )['total'] or 0

        # --- Recent sales (last 10) ---
        recent_sales = (
            Sale.objects.select_related('customer')
            .order_by('-created_at')[:10]
        )
        recent_sales_data = [
            {
                'id': s.id,
                'invoice_number': s.invoice_number,
                'customer': s.customer.name if s.customer else 'Walk-in',
                'total_amount': float(s.total_amount),
                'payable_amount': float(s.payable_amount),
                'payment_method': s.payment_method,
                'sale_date': str(s.sale_date),
            }
            for s in recent_sales
        ]

        # --- Sales trend (last 7 days) ---
        sales_trend = _build_date_range_trend(sales_qs, 'sale_date', days=7)

        return Response({
            'total_products': total_products,
            'active_products': active_products,
            'low_stock_count': low_stock,
            'out_of_stock_count': out_of_stock,
            'expired_count': expired,
            'near_expiry_count': near_expiry,
            'total_customers': total_customers,
            'today_sales': today_sales_count,
            'today_revenue': float(today_revenue),
            'total_revenue': float(total_revenue),
            'recent_sales': recent_sales_data,
            'sales_trend': sales_trend,
        })


# ---------------------------------------------------------------------------
# Reports — Sales
# ---------------------------------------------------------------------------

class SalesReportView(APIView):
    permission_classes = [IsDashboardStaff]

    def get(self, request):
        date_from, date_to = _parse_date_filters(request)
        qs = Sale.objects.all()
        if date_from:
            qs = qs.filter(sale_date__gte=date_from)
        if date_to:
            qs = qs.filter(sale_date__lte=date_to)

        agg = qs.aggregate(
            total_sales=Sum('total_amount'),
            total_discount=Sum('discount'),
            total_payable=Sum('payable_amount'),
            sales_count=Count('id'),
        )

        trend = _build_date_range_trend(qs, 'sale_date', days=7)

        return Response({
            'total_sales': float(agg['total_sales'] or 0),
            'total_discount': float(agg['total_discount'] or 0),
            'total_payable': float(agg['total_payable'] or 0),
            'sales_count': agg['sales_count'] or 0,
            'date_trend': trend,
        })


# ---------------------------------------------------------------------------
# Reports — Purchases
# ---------------------------------------------------------------------------

class PurchasesReportView(APIView):
    permission_classes = [IsDashboardStaff]

    def get(self, request):
        date_from, date_to = _parse_date_filters(request)
        qs = Purchase.objects.all()
        if date_from:
            qs = qs.filter(purchase_date__gte=date_from)
        if date_to:
            qs = qs.filter(purchase_date__lte=date_to)

        agg = qs.aggregate(
            total_purchases=Sum('total_amount'),
            total_discount=Sum('discount'),
            total_payable=Sum('payable_amount'),
            purchase_count=Count('id'),
        )

        trend = _build_date_range_trend(qs, 'purchase_date', days=7)

        return Response({
            'total_purchases': float(agg['total_purchases'] or 0),
            'total_discount': float(agg['total_discount'] or 0),
            'total_payable': float(agg['total_payable'] or 0),
            'purchase_count': agg['purchase_count'] or 0,
            'date_trend': trend,
        })


# ---------------------------------------------------------------------------
# Reports — Stock
# ---------------------------------------------------------------------------

class StockReportView(APIView):
    permission_classes = [IsDashboardStaff]

    def get(self, request):
        today = timezone.localdate()
        products = InventoryProduct.objects.all()

        total_products = products.count()
        total_stock = products.aggregate(
            total=Sum('stock_quantity')
        )['total'] or 0
        low_stock = products.filter(
            is_active=True,
            stock_quantity__lte=F('reorder_level'),
            stock_quantity__gt=0,
        ).count()
        out_of_stock = products.filter(stock_quantity=0).count()
        expired = products.filter(
            expiry_date__isnull=False,
            expiry_date__lt=today,
        ).count()
        near_expiry = products.filter(
            expiry_date__isnull=False,
            expiry_date__gte=today,
            expiry_date__lte=today + timedelta(days=30),
        ).count()

        return Response({
            'total_products': total_products,
            'total_stock': total_stock,
            'low_stock': low_stock,
            'out_of_stock': out_of_stock,
            'expired': expired,
            'near_expiry': near_expiry,
        })


# ---------------------------------------------------------------------------
# Reports — Customers
# ---------------------------------------------------------------------------

class CustomersReportView(APIView):
    permission_classes = [IsDashboardStaff]

    def get(self, request):
        customers = Customer.objects.all()
        total_customers = customers.count()

        # Membership tier breakdown
        tier_counts = (
            customers.values('membership_tier')
            .annotate(count=Count('id'))
            .order_by('membership_tier')
        )
        membership_tiers = {
            row['membership_tier']: row['count'] for row in tier_counts
        }

        # Top customers by total sales (only those linked to sales)
        top_customers = (
            Sale.objects.filter(customer__isnull=False)
            .values('customer__id', 'customer__name')
            .annotate(
                total_spent=Sum('payable_amount'),
                order_count=Count('id'),
            )
            .order_by('-total_spent')[:10]
        )
        top_customers_data = [
            {
                'customer_id': row['customer__id'],
                'customer_name': row['customer__name'],
                'total_spent': float(row['total_spent'] or 0),
                'order_count': row['order_count'],
            }
            for row in top_customers
        ]

        return Response({
            'total_customers': total_customers,
            'membership_tiers': membership_tiers,
            'top_customers': top_customers_data,
        })
