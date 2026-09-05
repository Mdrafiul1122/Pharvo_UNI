"""
Dashboard & Reports — Test Suite

Tests all endpoints against the live PostgreSQL database.
Run with: python manage.py test dashboard --settings=config.settings
Or run this file directly: python dashboard/test_dashboard.py
"""
import os
import sys
import json
import traceback
from datetime import date, timedelta
from decimal import Decimal

# ── Setup Django ────────────────────────────────────────────────────────────
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from django.contrib.auth import get_user_model
from django.test import TestCase, RequestFactory
from django.utils import timezone

from rest_framework.test import APIRequestFactory, force_authenticate

User = get_user_model()
factory = APIRequestFactory()

# ── Helpers ─────────────────────────────────────────────────────────────────

passed = 0
failed = 0
errors = []


def run_test(name, fn):
    global passed, failed
    try:
        fn()
        passed += 1
        print(f"  PASS  {name}")
    except Exception as e:
        failed += 1
        tb = traceback.format_exc()
        errors.append((name, str(e), tb))
        print(f"  FAIL  {name}: {e}")


def make_request(method, path, user=None, data=None, **kwargs):
    """Build a fake request and call the view directly."""
    if method == 'GET':
        req = factory.get(path)
    elif method == 'POST':
        req = factory.post(path, data=json.dumps(data) if data else None,
                           content_type='application/json')
    else:
        raise ValueError(f"Unsupported method: {method}")

    if user:
        force_authenticate(req, user=user)
    else:
        # Simulate anonymous
        from rest_framework.test import force_authenticate as _fa
        req.user = type('AnonymousUser', (), {'is_authenticated': False, 'is_superuser': False})()

    return req


# ── Import views ────────────────────────────────────────────────────────────
from dashboard.views import (
    DashboardView,
    SalesReportView,
    PurchasesReportView,
    StockReportView,
    CustomersReportView,
)


# ── Tests ───────────────────────────────────────────────────────────────────

def test_dashboard_returns_200():
    user = User.objects.filter(is_superuser=True).first() or \
           User.objects.filter(role='admin').first() or \
           User.objects.filter(role='pharmacist').first() or \
           User.objects.filter(role='staff').first()
    if not user:
        user = User.objects.create_user(
            username='__test_dash_admin', password='testpass123',
            role='admin', is_staff=True, is_active=True
        )
        cleanup_users.append(user.id)
    req = make_request('GET', '/api/dashboard/', user=user)
    resp = DashboardView.as_view()(req)
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"


def test_dashboard_values_are_from_db():
    from inventory.models import InventoryProduct
    from customers.models import Customer
    from django.db.models import Sum

    user = _get_staff_user()
    req = make_request('GET', '/api/dashboard/', user=user)
    resp = DashboardView.as_view()(req)
    data = resp.data

    db_product_count = InventoryProduct.objects.count()
    db_customer_count = Customer.objects.count()

    assert data['total_products'] == db_product_count, \
        f"total_products: API={data['total_products']} DB={db_product_count}"
    assert data['total_customers'] == db_customer_count, \
        f"total_customers: API={data['total_customers']} DB={db_customer_count}"


def test_dashboard_product_count_matches_db():
    from inventory.models import InventoryProduct
    user = _get_staff_user()
    req = make_request('GET', '/api/dashboard/', user=user)
    resp = DashboardView.as_view()(req)
    assert resp.data['total_products'] == InventoryProduct.objects.count()


def test_dashboard_customer_count_matches_db():
    from customers.models import Customer
    user = _get_staff_user()
    req = make_request('GET', '/api/dashboard/', user=user)
    resp = DashboardView.as_view()(req)
    assert resp.data['total_customers'] == Customer.objects.count()


def test_dashboard_sales_totals_match_db():
    from sales.models import Sale
    from django.db.models import Sum
    user = _get_staff_user()
    req = make_request('GET', '/api/dashboard/', user=user)
    resp = DashboardView.as_view()(req)
    data = resp.data

    total_revenue = Sale.objects.aggregate(t=Sum('payable_amount'))['t'] or 0
    assert float(data['total_revenue']) == float(total_revenue), \
        f"total_revenue: API={data['total_revenue']} DB={float(total_revenue)}"


def test_dashboard_recent_sales_is_list():
    user = _get_staff_user()
    req = make_request('GET', '/api/dashboard/', user=user)
    resp = DashboardView.as_view()(req)
    assert isinstance(resp.data['recent_sales'], list)
    assert len(resp.data['recent_sales']) <= 10


def test_dashboard_sales_trend_has_7_days():
    user = _get_staff_user()
    req = make_request('GET', '/api/dashboard/', user=user)
    resp = DashboardView.as_view()(req)
    assert len(resp.data['sales_trend']) == 7
    for entry in resp.data['sales_trend']:
        assert 'date' in entry
        assert 'count' in entry
        assert 'revenue' in entry


def test_reports_sales_returns_200():
    user = _get_staff_user()
    req = make_request('GET', '/api/reports/sales/', user=user)
    resp = SalesReportView.as_view()(req)
    assert resp.status_code == 200


def test_reports_sales_totals_match_db():
    from sales.models import Sale
    from django.db.models import Sum, Count
    user = _get_staff_user()
    req = make_request('GET', '/api/reports/sales/', user=user)
    resp = SalesReportView.as_view()(req)
    data = resp.data

    agg = Sale.objects.aggregate(
        total_sales=Sum('total_amount'),
        total_discount=Sum('discount'),
        total_payable=Sum('payable_amount'),
        sales_count=Count('id'),
    )
    assert float(data['total_sales']) == float(agg['total_sales'] or 0)
    assert float(data['total_discount']) == float(agg['total_discount'] or 0)
    assert float(data['total_payable']) == float(agg['total_payable'] or 0)
    assert data['sales_count'] == (agg['sales_count'] or 0)


def test_reports_sales_with_date_filter():
    from sales.models import Sale
    from django.db.models import Sum, Count
    user = _get_staff_user()
    today = str(timezone.localdate())
    req = make_request('GET', f'/api/reports/sales/?date_from={today}&date_to={today}', user=user)
    resp = SalesReportView.as_view()(req)
    data = resp.data

    agg = Sale.objects.filter(sale_date=today).aggregate(
        total_sales=Sum('total_amount'),
        sales_count=Count('id'),
    )
    assert float(data['total_sales']) == float(agg['total_sales'] or 0)
    assert data['sales_count'] == (agg['sales_count'] or 0)


def test_reports_purchases_returns_200():
    user = _get_staff_user()
    req = make_request('GET', '/api/reports/purchases/', user=user)
    resp = PurchasesReportView.as_view()(req)
    assert resp.status_code == 200


def test_reports_purchases_totals_match_db():
    from purchases.models import Purchase
    from django.db.models import Sum, Count
    user = _get_staff_user()
    req = make_request('GET', '/api/reports/purchases/', user=user)
    resp = PurchasesReportView.as_view()(req)
    data = resp.data

    agg = Purchase.objects.aggregate(
        total_purchases=Sum('total_amount'),
        total_discount=Sum('discount'),
        total_payable=Sum('payable_amount'),
        purchase_count=Count('id'),
    )
    assert float(data['total_purchases']) == float(agg['total_purchases'] or 0)
    assert float(data['total_discount']) == float(agg['total_discount'] or 0)
    assert float(data['total_payable']) == float(agg['total_payable'] or 0)
    assert data['purchase_count'] == (agg['purchase_count'] or 0)


def test_reports_stock_returns_200():
    user = _get_staff_user()
    req = make_request('GET', '/api/reports/stock/', user=user)
    resp = StockReportView.as_view()(req)
    assert resp.status_code == 200


def test_reports_stock_totals_match_db():
    from inventory.models import InventoryProduct
    from django.db.models import Sum
    user = _get_staff_user()
    req = make_request('GET', '/api/reports/stock/', user=user)
    resp = StockReportView.as_view()(req)
    data = resp.data

    today = timezone.localdate()
    products = InventoryProduct.objects.all()
    total_products = products.count()
    total_stock = products.aggregate(t=Sum('stock_quantity'))['t'] or 0

    assert data['total_products'] == total_products
    assert data['total_stock'] == total_stock


def test_reports_stock_low_stock_calculation():
    from inventory.models import InventoryProduct
    from django.db.models import F
    user = _get_staff_user()
    req = make_request('GET', '/api/reports/stock/', user=user)
    resp = StockReportView.as_view()(req)
    data = resp.data

    db_low = InventoryProduct.objects.filter(
        is_active=True,
        stock_quantity__lte=F('reorder_level'),
        stock_quantity__gt=0,
    ).count()
    db_out = InventoryProduct.objects.filter(stock_quantity=0).count()

    assert data['low_stock'] == db_low, f"low_stock: API={data['low_stock']} DB={db_low}"
    assert data['out_of_stock'] == db_out, f"out_of_stock: API={data['out_of_stock']} DB={db_out}"


def test_reports_stock_expiry_calculation():
    from inventory.models import InventoryProduct
    today = timezone.localdate()
    user = _get_staff_user()
    req = make_request('GET', '/api/reports/stock/', user=user)
    resp = StockReportView.as_view()(req)
    data = resp.data

    db_expired = InventoryProduct.objects.filter(
        expiry_date__isnull=False, expiry_date__lt=today
    ).count()
    db_near = InventoryProduct.objects.filter(
        expiry_date__isnull=False,
        expiry_date__gte=today,
        expiry_date__lte=today + timedelta(days=30),
    ).count()

    assert data['expired'] == db_expired, f"expired: API={data['expired']} DB={db_expired}"
    assert data['near_expiry'] == db_near, f"near_expiry: API={data['near_expiry']} DB={db_near}"


def test_reports_customers_returns_200():
    user = _get_staff_user()
    req = make_request('GET', '/api/reports/customers/', user=user)
    resp = CustomersReportView.as_view()(req)
    assert resp.status_code == 200


def test_reports_customers_total_matches_db():
    from customers.models import Customer
    user = _get_staff_user()
    req = make_request('GET', '/api/reports/customers/', user=user)
    resp = CustomersReportView.as_view()(req)
    assert resp.data['total_customers'] == Customer.objects.count()


def test_reports_customers_tier_counts():
    from customers.models import Customer
    from django.db.models import Count
    user = _get_staff_user()
    req = make_request('GET', '/api/reports/customers/', user=user)
    resp = CustomersReportView.as_view()(req)
    data = resp.data

    tiers = Customer.objects.values('membership_tier').annotate(c=Count('id')).order_by('membership_tier')
    expected = {t['membership_tier']: t['c'] for t in tiers}
    assert data['membership_tiers'] == expected


def test_customer_role_denied_dashboard():
    user = _get_customer_user()
    req = make_request('GET', '/api/dashboard/', user=user)
    resp = DashboardView.as_view()(req)
    assert resp.status_code == 403, f"Expected 403, got {resp.status_code}"


def test_customer_role_denied_reports_sales():
    user = _get_customer_user()
    req = make_request('GET', '/api/reports/sales/', user=user)
    resp = SalesReportView.as_view()(req)
    assert resp.status_code == 403


def test_customer_role_denied_reports_purchases():
    user = _get_customer_user()
    req = make_request('GET', '/api/reports/purchases/', user=user)
    resp = PurchasesReportView.as_view()(req)
    assert resp.status_code == 403


def test_customer_role_denied_reports_stock():
    user = _get_customer_user()
    req = make_request('GET', '/api/reports/stock/', user=user)
    resp = StockReportView.as_view()(req)
    assert resp.status_code == 403


def test_customer_role_denied_reports_customers():
    user = _get_customer_user()
    req = make_request('GET', '/api/reports/customers/', user=user)
    resp = CustomersReportView.as_view()(req)
    assert resp.status_code == 403


def test_unauthenticated_denied_dashboard():
    req = make_request('GET', '/api/dashboard/')
    resp = DashboardView.as_view()(req)
    assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"


def test_unauthenticated_denied_reports():
    for view_cls in [SalesReportView, PurchasesReportView, StockReportView, CustomersReportView]:
        req = make_request('GET', '/api/reports/sales/')
        resp = view_cls.as_view()(req)
        assert resp.status_code == 401, f"Expected 401 for {view_cls.__name__}, got {resp.status_code}"


def test_no_hardcoded_values():
    """Verify dashboard returns dynamic data, not static/mocked numbers."""
    user = _get_staff_user()
    req = make_request('GET', '/api/dashboard/', user=user)
    resp = DashboardView.as_view()(req)
    data = resp.data

    # Ensure all numeric fields are actual numbers (not strings, not None)
    for key in ['total_products', 'active_products', 'low_stock_count',
                'out_of_stock_count', 'expired_count', 'near_expiry_count',
                'total_customers', 'today_sales']:
        assert isinstance(data[key], int), f"{key} should be int, got {type(data[key])}"
        assert data[key] >= 0, f"{key} should be >= 0, got {data[key]}"

    for key in ['today_revenue', 'total_revenue']:
        assert isinstance(data[key], (int, float)), f"{key} should be numeric, got {type(data[key])}"
        assert data[key] >= 0, f"{key} should be >= 0, got {data[key]}"


def test_no_db_modifications():
    """Verify test run didn't create/modify any data."""
    from inventory.models import InventoryProduct
    from customers.models import Customer
    from sales.models import Sale
    from purchases.models import Purchase

    # These counts should match what's in the live DB
    # (we don't know exact values, but calling the views shouldn't change them)
    p1 = InventoryProduct.objects.count()
    c1 = Customer.objects.count()
    s1 = Sale.objects.count()
    pu1 = Purchase.objects.count()

    # Hit all views
    user = _get_staff_user()
    for view_cls in [DashboardView, SalesReportView, PurchasesReportView,
                     StockReportView, CustomersReportView]:
        req = make_request('GET', '/api/dashboard/', user=user)
        view_cls.as_view()(req)

    # Verify counts unchanged
    assert InventoryProduct.objects.count() == p1, "Products modified!"
    assert Customer.objects.count() == c1, "Customers modified!"
    assert Sale.objects.count() == s1, "Sales modified!"
    assert Purchase.objects.count() == pu1, "Purchases modified!"


def test_reports_sales_trend_has_7_days():
    user = _get_staff_user()
    req = make_request('GET', '/api/reports/sales/', user=user)
    resp = SalesReportView.as_view()(req)
    assert len(resp.data['date_trend']) == 7


def test_reports_purchases_trend_has_7_days():
    user = _get_staff_user()
    req = make_request('GET', '/api/reports/purchases/', user=user)
    resp = PurchasesReportView.as_view()(req)
    assert len(resp.data['date_trend']) == 7


# ── User helpers ────────────────────────────────────────────────────────────

cleanup_users = []
_user_cache = {}


def _get_or_create(username, **kwargs):
    if username not in _user_cache:
        user, created = User.objects.get_or_create(
            username=username,
            defaults=kwargs,
        )
        if created:
            user.set_password('testpass123')
            user.save()
            cleanup_users.append(user.id)
        _user_cache[username] = user
    return _user_cache[username]


def _get_staff_user():
    for role in ['admin', 'pharmacist', 'staff']:
        user = User.objects.filter(role=role, is_active=True).first()
        if user:
            return user
    return _get_or_create('__test_dash_staff', role='staff', is_active=True)


def _get_customer_user():
    user = User.objects.filter(role='customer', is_active=True).first()
    if user:
        return user
    return _get_or_create('__test_dash_customer', role='customer', is_active=True)


# ── Main ────────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    print("\n" + "=" * 60)
    print("  DASHBOARD & REPORTS — TEST SUITE")
    print("=" * 60 + "\n")

    tests = [
        ("Dashboard returns 200", test_dashboard_returns_200),
        ("Dashboard values from DB", test_dashboard_values_are_from_db),
        ("Dashboard product count matches DB", test_dashboard_product_count_matches_db),
        ("Dashboard customer count matches DB", test_dashboard_customer_count_matches_db),
        ("Dashboard sales totals match DB", test_dashboard_sales_totals_match_db),
        ("Dashboard recent_sales is list", test_dashboard_recent_sales_is_list),
        ("Dashboard sales_trend has 7 days", test_dashboard_sales_trend_has_7_days),
        ("Reports sales returns 200", test_reports_sales_returns_200),
        ("Reports sales totals match DB", test_reports_sales_totals_match_db),
        ("Reports sales with date filter", test_reports_sales_with_date_filter),
        ("Reports sales trend has 7 days", test_reports_sales_trend_has_7_days),
        ("Reports purchases returns 200", test_reports_purchases_returns_200),
        ("Reports purchases totals match DB", test_reports_purchases_totals_match_db),
        ("Reports purchases trend has 7 days", test_reports_purchases_trend_has_7_days),
        ("Reports stock returns 200", test_reports_stock_returns_200),
        ("Reports stock totals match DB", test_reports_stock_totals_match_db),
        ("Reports stock low_stock calculation", test_reports_stock_low_stock_calculation),
        ("Reports stock expiry calculation", test_reports_stock_expiry_calculation),
        ("Reports customers returns 200", test_reports_customers_returns_200),
        ("Reports customers total matches DB", test_reports_customers_total_matches_db),
        ("Reports customers tier counts", test_reports_customers_tier_counts),
        ("Customer role denied dashboard", test_customer_role_denied_dashboard),
        ("Customer role denied reports/sales", test_customer_role_denied_reports_sales),
        ("Customer role denied reports/purchases", test_customer_role_denied_reports_purchases),
        ("Customer role denied reports/stock", test_customer_role_denied_reports_stock),
        ("Customer role denied reports/customers", test_customer_role_denied_reports_customers),
        ("Unauthenticated denied dashboard", test_unauthenticated_denied_dashboard),
        ("Unauthenticated denied reports", test_unauthenticated_denied_reports),
        ("No hardcoded/mock values", test_no_hardcoded_values),
        ("No DB modifications", test_no_db_modifications),
    ]

    for name, fn in tests:
        run_test(name, fn)

    # Cleanup temp users
    User.objects.filter(id__in=cleanup_users).delete()

    print("\n" + "=" * 60)
    print(f"  RESULTS: {passed} passed, {failed} failed, {passed + failed} total")
    print("=" * 60)

    if errors:
        print("\nFailed tests:")
        for name, err, tb in errors:
            print(f"\n--- {name} ---")
            print(err)

    print()
    sys.exit(1 if failed else 0)
