"""
CRM Discount Service & POS Integration Tests

Tests the CRM discount eligibility logic and POS automatic discount.
Runs against the live PostgreSQL database. Creates temporary test data
and cleans up afterward. Database baseline MUST remain unchanged.
"""
import os
import sys
from decimal import Decimal

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from django.utils import timezone
from django.db import connection

from accounts.models import User
from customers.models import Customer
from inventory.models import InventoryProduct, InventorySupplier
from crm.models import Reminder
from crm.services import (
    calculate_crm_discount,
    _customer_has_crm_recommendation,
    _customer_eligible_amount,
    ELIGIBLE_AMOUNT_THRESHOLD,
    CRM_TIER_DISCOUNT_RATES,
    DEFAULT_CRM_DISCOUNT_RATE,
    _tier_discount_rate,
    _money,
)
from sales.models import Sale, SaleItem, SalePayment

passed = 0
failed = 0
errors = []
cleanup_sale_ids = []
cleanup_customer_ids = []
cleanup_product_ids = []
cleanup_user_ids = []
cleanup_reminder_ids = []


def test(name, fn):
    global passed, failed
    try:
        fn()
        passed += 1
        print(f"  PASS  {name}")
    except Exception as e:
        failed += 1
        errors.append((name, e))
        print(f"  FAIL  {name}: {e}")


def assert_eq(a, b, msg=""):
    if a != b:
        raise AssertionError(f"Expected {b!r}, got {a!r}. {msg}")


def assert_true(val, msg=""):
    if not val:
        raise AssertionError(f"Expected truthy, got {val!r}. {msg}")


def assert_false(val, msg=""):
    if val:
        raise AssertionError(f"Expected falsy, got {val!r}. {msg}")


def assert_in(val, collection, msg=""):
    if val not in collection:
        raise AssertionError(f"Expected {val!r} in {collection!r}. {msg}")


print("\n=== CRM DISCOUNT & POS INTEGRATION TESTS ===\n")

# ── Record baseline BEFORE creating fixtures ──
print("--- Baseline ---")
with connection.cursor() as cur:
    cur.execute("SELECT COUNT(*) FROM sales_sale")
    baseline_sales = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM sales_saleitem")
    baseline_sale_items = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM sales_salepayment")
    baseline_sale_payments = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM customers_customer")
    baseline_customers = cur.fetchone()[0]
print(f"  Sales: {baseline_sales}, Items: {baseline_sale_items}, Payments: {baseline_sale_payments}, Customers: {baseline_customers}")

# ── Create test fixtures ──
print("\n--- Creating test fixtures ---")

# Clean up any leftover test data from previous runs
User.objects.filter(username='crm_disc_test_admin').delete()
Customer.objects.filter(phone__in=['01888888888', '01888888889', '01888888890', '01888888891']).delete()
InventoryProduct.objects.filter(barcode__startswith='CRM-TST-').delete()
InventorySupplier.objects.filter(phone='01999999999').delete()

test_admin = User.objects.create_user(
    username='crm_disc_test_admin', password='testpass123', role='admin', is_staff=True, is_active=True
)
cleanup_user_ids.append(test_admin.pk)

test_supplier = InventorySupplier.objects.create(
    id=9001, name='CRM Test Supplier', contact_person='Test', phone='01999999999',
    email='crmtest@supplier.com', address='Test', created_at=timezone.now(), is_active=True
)

test_product_a = InventoryProduct.objects.create(
    id=9001, name='CRM Test Med A', brand='TestBrand', barcode='CRM-TST-A001',
    unit_price=Decimal('15.00'), cost_price=Decimal('10.00'),
    stock_quantity=500, reorder_level=10,
    is_active=True, description='Test', created_at=timezone.now(),
    updated_at=timezone.now(), is_sensitive=False,
    supplier=test_supplier, pcs_per_strip=10, pcs_per_box=30,
    strips_per_box=3, strip_price=Decimal('150.00'), box_price=Decimal('450.00'),
)
cleanup_product_ids.append(test_product_a.pk)

test_product_b = InventoryProduct.objects.create(
    id=9002, name='CRM Test Med B', brand='TestBrand', barcode='CRM-TST-B001',
    unit_price=Decimal('8.00'), cost_price=Decimal('5.00'),
    stock_quantity=300, reorder_level=10,
    is_active=True, description='Test', created_at=timezone.now(),
    updated_at=timezone.now(), is_sensitive=False,
    supplier=test_supplier, pcs_per_strip=10, pcs_per_box=30,
    strips_per_box=3, strip_price=Decimal('80.00'), box_price=Decimal('240.00'),
)
cleanup_product_ids.append(test_product_b.pk)

test_customer = Customer.objects.create(
    id=9001, name='CRM Disc Test Customer', phone='01888888888',
    email='crmdisctest@test.com', address='123 Test',
    loyalty_points=100, created_at=timezone.now(), membership_tier='silver',
)
cleanup_customer_ids.append(test_customer.pk)

test_customer_2 = Customer.objects.create(
    id=9002, name='CRM Disc Test Customer 2', phone='01888888889',
    email='crmdisctest2@test.com', address='456 Test',
    loyalty_points=0, created_at=timezone.now(), membership_tier='bronze',
)
cleanup_customer_ids.append(test_customer_2.pk)

test_customer_unknown = Customer.objects.create(
    id=9003, name='CRM Disc Test Customer 3', phone='01888888890',
    email='crmdisctest3@test.com', address='789 Test',
    loyalty_points=0, created_at=timezone.now(), membership_tier='platinum',
)
cleanup_customer_ids.append(test_customer_unknown.pk)

test_customer_regular = Customer.objects.create(
    id=9004, name='CRM Disc Test Customer 4', phone='01888888891',
    email='crmdisctest4@test.com', address='012 Test',
    loyalty_points=0, created_at=timezone.now(), membership_tier='regular',
)
cleanup_customer_ids.append(test_customer_regular.pk)

print(f"  Created test fixtures: 2 products, 2 customers, 1 admin user")


# ── Helper: create a test sale for purchase history ──
def create_history_sale(customer, items_data, sale_date=None):
    """Create a sale for purchase history testing. Returns the Sale object."""
    if sale_date is None:
        sale_date = timezone.localdate()

    now = timezone.now()
    import secrets
    sale = Sale.objects.create(
        invoice_number=f'HIST-{timezone.now().strftime("%Y%m%d%H%M%S")}-{secrets.token_hex(2).upper()}',
        total_amount=Decimal('0'),
        discount=Decimal('0'),
        payable_amount=Decimal('0'),
        payment_method='cash',
        sale_date=sale_date,
        created_at=now,
        customer=customer,
        user=test_admin,
    )
    cleanup_sale_ids.append(sale.pk)

    item_total = Decimal('0')
    for product, qty, unit_price in items_data:
        subtotal = _money(qty * unit_price)
        item_total += subtotal
        SaleItem.objects.create(
            sale=sale, product=product, quantity=qty, unit=unit_price,
            quantity_pcs=qty, unit_price=unit_price, subtotal=subtotal,
        )

    sale.total_amount = item_total
    sale.payable_amount = item_total
    sale.save()

    SalePayment.objects.create(
        sale=sale, method='cash', amount=item_total, created_at=now,
    )

    return sale


# ═══════════════════════════════════════════════════════════════
# TEST GROUP 1: Configuration
# ═══════════════════════════════════════════════════════════════
print("\n--- Configuration Tests ---")

test("ELIGIBLE_AMOUNT_THRESHOLD is 100",
     lambda: assert_eq(ELIGIBLE_AMOUNT_THRESHOLD, Decimal('100.00')))

test("Tier discount rates: silver=5%, gold=10%, bronze=0%",
     lambda: (assert_eq(CRM_TIER_DISCOUNT_RATES['silver'], Decimal('0.05')),
              assert_eq(CRM_TIER_DISCOUNT_RATES['gold'], Decimal('0.10')),
              assert_eq(CRM_TIER_DISCOUNT_RATES['bronze'], Decimal('0'))))

test("'regular'/'premium' are NOT CRM tiers (fall back to Basic -> 0%)",
     lambda: (assert_false('regular' in CRM_TIER_DISCOUNT_RATES,
                           "backend default tier must not silently get a discount"),
              assert_false('premium' in CRM_TIER_DISCOUNT_RATES)))

def test_tier_discount_rate_lookup():
    assert_eq(_tier_discount_rate(test_customer), Decimal('0.05'))        # silver  -> Regular -> 5%
    assert_eq(_tier_discount_rate(test_customer_2), Decimal('0'))         # bronze  -> Basic   -> 0%
    assert_eq(_tier_discount_rate(test_customer_unknown), Decimal('0'))   # unknown -> Basic   -> 0%
    assert_eq(_tier_discount_rate(test_customer_regular), Decimal('0'))   # regular -> Basic   -> 0%
    assert_eq(_tier_discount_rate(None), DEFAULT_CRM_DISCOUNT_RATE)       # no customer -> 0%

test("_tier_discount_rate resolves from membership tier", test_tier_discount_rate_lookup)

def test_no_customer_no_rate():
    result = calculate_crm_discount(None, [])
    assert_eq(result['rate'], '0')

test("No customer -> rate is 0", test_no_customer_no_rate)

test("_money rounds correctly",
     lambda: assert_eq(_money(Decimal('1.235')), Decimal('1.24')))


# ═══════════════════════════════════════════════════════════════
# TEST GROUP 2: CRM Recommendation checks (Reminder-based)
# ═══════════════════════════════════════════════════════════════
print("\n--- CRM Recommendation Check Tests ---")

def test_no_recommendation():
    result = _customer_has_crm_recommendation(test_customer.pk, test_product_a.pk)
    assert_false(result, "Should be False when no Reminder exists")

test("No Reminder -> False", test_no_recommendation)

def test_recommendation_active():
    reminder = Reminder.objects.create(
        customer_id=test_customer.pk,
        product_id=test_product_a.pk,
        title='Test recommendation',
        reminder_time=timezone.now(),
        is_active=True,
        created_at=timezone.now(),
        updated_at=timezone.now(),
    )
    cleanup_reminder_ids.append(reminder.pk)
    result = _customer_has_crm_recommendation(test_customer.pk, test_product_a.pk)
    assert_true(result, "Should be True when active Reminder exists")

test("Active Reminder -> True", test_recommendation_active)

def test_recommendation_inactive():
    reminder = Reminder.objects.create(
        customer_id=test_customer.pk,
        product_id=test_product_b.pk,
        title='Test inactive recommendation',
        reminder_time=timezone.now(),
        is_active=False,
        created_at=timezone.now(),
        updated_at=timezone.now(),
    )
    cleanup_reminder_ids.append(reminder.pk)
    result = _customer_has_crm_recommendation(test_customer.pk, test_product_b.pk)
    assert_false(result, "Should be False when Reminder is inactive")

test("Inactive Reminder -> False", test_recommendation_inactive)


# ═══════════════════════════════════════════════════════════════
# TEST GROUP 3: Eligible amount calculation
# ═══════════════════════════════════════════════════════════════
print("\n--- Eligible Amount Tests ---")

def test_no_purchase_history():
    amount = _customer_eligible_amount(test_customer_2.pk, test_product_a.pk)
    assert_eq(amount, Decimal('0.00'), "No purchase history -> 0")

test("No purchase history -> 0 BDT", test_no_purchase_history)

def test_purchase_history_below_100():
    create_history_sale(test_customer, [
        (test_product_a, 5, Decimal('16.00')),  # 5 * 16 = 80
    ])
    amount = _customer_eligible_amount(test_customer.pk, test_product_a.pk)
    assert_eq(amount, Decimal('80.00'), "5 * 16 = 80")

test("Purchase history 80 BDT -> 80 BDT", test_purchase_history_below_100)

def test_purchase_history_exactly_100():
    create_history_sale(test_customer, [
        (test_product_a, 1, Decimal('20.00')),  # +20 = 100
    ])
    amount = _customer_eligible_amount(test_customer.pk, test_product_a.pk)
    assert_eq(amount, Decimal('100.00'), "80 + 20 = 100")

test("Purchase history 100 BDT -> 100 BDT", test_purchase_history_exactly_100)

def test_purchase_history_above_100():
    create_history_sale(test_customer, [
        (test_product_a, 1, Decimal('25.00')),  # +25 = 125
    ])
    amount = _customer_eligible_amount(test_customer.pk, test_product_a.pk)
    assert_eq(amount, Decimal('125.00'), "100 + 25 = 125")

test("Purchase history 125 BDT -> 125 BDT", test_purchase_history_above_100)

def test_purchase_history_per_product():
    create_history_sale(test_customer, [
        (test_product_b, 8, Decimal('7.50')),  # 8 * 7.50 = 60
    ])
    amount_a = _customer_eligible_amount(test_customer.pk, test_product_a.pk)
    amount_b = _customer_eligible_amount(test_customer.pk, test_product_b.pk)
    assert_eq(amount_a, Decimal('125.00'), "Product A: 125 BDT")
    assert_eq(amount_b, Decimal('60.00'), "Product B: 60 BDT")

test("Eligible amount is per-product", test_purchase_history_per_product)


# ═══════════════════════════════════════════════════════════════
# TEST GROUP 4: calculate_crm_discount (eligibility logic)
# ═══════════════════════════════════════════════════════════════
print("\n--- calculate_crm_discount Tests ---")

def test_no_customer():
    result = calculate_crm_discount(None, [{'product': test_product_a, 'quantity': 5, 'unit_price': Decimal('15.00')}])
    assert_eq(result['crm_discount'], Decimal('0'))
    assert_false(result['eligible'])
    assert_eq(result['breakdown'], [])
    assert_eq(result['rate'], '0')

test("No customer -> no discount", test_no_customer)

def test_no_recommendation_no_discount():
    result = calculate_crm_discount(test_customer_2, [
        {'product': test_product_a, 'quantity': 5, 'unit_price': Decimal('15.00')},
    ])
    assert_eq(result['crm_discount'], Decimal('0'))
    assert_false(result['eligible'])

test("No CRM recommendation -> no discount", test_no_recommendation_no_discount)

def test_tier_rate_applies():
    # test_customer is silver (5%); has active Reminder + history > 100.
    # Item IS eligible, so a 5% discount applies.
    result = calculate_crm_discount(test_customer, [
        {'product': test_product_a, 'quantity': 5, 'unit_price': Decimal('15.00')},
    ])
    assert_eq(result['crm_discount'], Decimal('3.75'))  # 5 * 15 = 75 * 5%
    assert_true(result['eligible'])
    assert_eq(result['rate'], '0.05')

test("Silver tier 5% -> discount applies", test_tier_rate_applies)

def test_inactive_recommendation_no_discount():
    # test_customer has inactive Reminder for product_b
    result = calculate_crm_discount(test_customer, [
        {'product': test_product_b, 'quantity': 10, 'unit_price': Decimal('8.00')},
    ])
    assert_eq(result['crm_discount'], Decimal('0'))
    assert_false(result['eligible'])

test("Inactive recommendation -> no discount", test_inactive_recommendation_no_discount)

def test_empty_items():
    result = calculate_crm_discount(test_customer, [])
    assert_eq(result['crm_discount'], Decimal('0'))
    assert_false(result['eligible'])
    assert_eq(result['breakdown'], [])

test("Empty items -> no discount", test_empty_items)

def test_multiple_items_breakdown_always_returned():
    result = calculate_crm_discount(test_customer, [
        {'product': test_product_a, 'quantity': 3, 'unit_price': Decimal('15.00')},
        {'product': test_product_b, 'quantity': 5, 'unit_price': Decimal('8.00')},
    ])
    # Product A is eligible (5% of 45 = 2.25); product B has inactive reminder -> 0.
    assert_eq(result['crm_discount'], Decimal('2.25'))
    # Breakdown is always returned.
    assert_eq(len(result['breakdown']), 2)

test("Multiple items -> breakdown always returned", test_multiple_items_breakdown_always_returned)

def test_below_threshold_not_eligible():
    # test_customer_2 has no purchase history, add a reminder with low spend
    create_history_sale(test_customer_2, [
        (test_product_a, 5, Decimal('16.00')),  # 80 BDT, below threshold
    ])
    reminder = Reminder.objects.create(
        customer_id=test_customer_2.pk,
        product_id=test_product_a.pk,
        title='Below threshold test',
        reminder_time=timezone.now(),
        is_active=True,
        created_at=timezone.now(),
        updated_at=timezone.now(),
    )
    cleanup_reminder_ids.append(reminder.pk)

    result = calculate_crm_discount(test_customer_2, [
        {'product': test_product_a, 'quantity': 5, 'unit_price': Decimal('15.00')},
    ])
    assert_eq(result['crm_discount'], Decimal('0'))
    assert_false(result['eligible'])
    # Breakdown shows has_recommendation=True but is_eligible=False
    assert_eq(len(result['breakdown']), 1)
    assert_true(result['breakdown'][0]['has_crm_recommendation'])
    assert_false(result['breakdown'][0]['is_eligible'])

test("Below 100 BDT threshold -> not eligible", test_below_threshold_not_eligible)

def test_above_threshold_eligible():
    # test_customer_2 has product_a at 80 BDT, add more to go above 100
    create_history_sale(test_customer_2, [
        (test_product_a, 2, Decimal('15.00')),  # +30 = 110 BDT
    ])
    result = calculate_crm_discount(test_customer_2, [
        {'product': test_product_a, 'quantity': 5, 'unit_price': Decimal('15.00')},
    ])
    assert_eq(result['crm_discount'], Decimal('0'))  # rate=0
    assert_true(result['eligible'])  # But IS eligible
    assert_eq(len(result['breakdown']), 1)
    assert_true(result['breakdown'][0]['has_crm_recommendation'])
    assert_true(result['breakdown'][0]['is_eligible'])

test("Above 100 BDT + active reminder -> eligible", test_above_threshold_eligible)


# ═══════════════════════════════════════════════════════════════
# TEST GROUP 5: POS Checkout Integration
# ═══════════════════════════════════════════════════════════════
print("\n--- POS Checkout Integration Tests ---")

def test_pos_checkout_no_customer():
    from sales.views import _create_sale
    items = [{'product': test_product_a, 'quantity': 2, 'unit': 'strip', 'unit_price': Decimal('150.00')}]
    payments = [{'method': 'cash', 'amount': Decimal('300.00')}]
    sale = _create_sale(test_admin, {
        'items': items, 'payments': payments, 'discount': Decimal('0'), 'customer': None,
    })
    cleanup_sale_ids.append(sale.pk)
    assert_eq(sale.total_amount, Decimal('300.00'))
    assert_eq(sale.discount, Decimal('0'))
    assert_eq(sale.payable_amount, Decimal('300.00'))
    info = getattr(sale, '_crm_discount_info', {})
    assert_eq(Decimal(info.get('crm_discount', '0')), Decimal('0'))
    assert_false(info.get('crm_eligible', False))

test("POS: no customer -> no CRM discount", test_pos_checkout_no_customer)

def test_pos_checkout_no_recommendation():
    from sales.views import _create_sale
    # test_customer_2 has no active Reminder for product_b
    items = [{'product': test_product_b, 'quantity': 2, 'unit': 'strip', 'unit_price': Decimal('80.00')}]
    payments = [{'method': 'cash', 'amount': Decimal('160.00')}]
    sale = _create_sale(test_admin, {
        'items': items, 'payments': payments, 'discount': Decimal('0'), 'customer': test_customer_2,
    })
    cleanup_sale_ids.append(sale.pk)
    assert_eq(sale.discount, Decimal('0'))
    assert_eq(sale.payable_amount, Decimal('160.00'))
    info = getattr(sale, '_crm_discount_info', {})
    assert_eq(Decimal(info.get('crm_discount', '0')), Decimal('0'))
    assert_false(info.get('crm_eligible', False))

test("POS: customer without recommendation -> no CRM discount", test_pos_checkout_no_recommendation)

def test_pos_checkout_tier_discount_applied():
    from sales.views import _create_sale
    # test_customer is silver (5%); has active Reminder + history > 100 for product_a.
    # Item is eligible, so a 5% CRM discount applies at checkout.
    items = [{'product': test_product_a, 'quantity': 3, 'unit': 'strip', 'unit_price': Decimal('150.00')}]
    payments = [{'method': 'cash', 'amount': Decimal('427.50')}]
    sale = _create_sale(test_admin, {
        'items': items, 'payments': payments, 'discount': Decimal('0'), 'customer': test_customer,
    })
    cleanup_sale_ids.append(sale.pk)
    assert_eq(sale.total_amount, Decimal('450.00'))
    assert_eq(sale.discount, Decimal('22.50'))  # 450 * 5%
    assert_eq(sale.payable_amount, Decimal('427.50'))
    info = getattr(sale, '_crm_discount_info', {})
    assert_eq(Decimal(info.get('crm_discount', '0')), Decimal('22.50'))
    assert_true(info.get('crm_eligible', False))

test("POS: silver tier 5% CRM discount applied", test_pos_checkout_tier_discount_applied)

def test_pos_manual_discount_preserved():
    from sales.views import _create_sale
    items = [{'product': test_product_a, 'quantity': 2, 'unit': 'strip', 'unit_price': Decimal('150.00')}]
    payments = [{'method': 'cash', 'amount': Decimal('275.00')}]
    sale = _create_sale(test_admin, {
        'items': items, 'payments': payments, 'discount': Decimal('10.00'), 'customer': test_customer,
    })
    cleanup_sale_ids.append(sale.pk)
    assert_eq(sale.total_amount, Decimal('300.00'))
    # manual 10 + crm 5% of 300 = 15 -> total discount 25
    assert_eq(sale.discount, Decimal('25.00'))
    assert_eq(sale.payable_amount, Decimal('275.00'))
    info = getattr(sale, '_crm_discount_info', {})
    assert_eq(info.get('manual_discount'), '10.00')
    assert_eq(Decimal(info.get('crm_discount', '0')), Decimal('15.00'))

test("POS: manual discount preserved with CRM discount", test_pos_manual_discount_preserved)

def test_pos_stock_deducted():
    from sales.views import _create_sale
    test_product_a.refresh_from_db()
    initial_stock = test_product_a.stock_quantity
    items = [{'product': test_product_a, 'quantity': 1, 'unit': 'strip', 'unit_price': Decimal('150.00')}]
    payments = [{'method': 'cash', 'amount': Decimal('150.00')}]
    sale = _create_sale(test_admin, {
        'items': items, 'payments': payments, 'discount': Decimal('0'), 'customer': None,
    })
    cleanup_sale_ids.append(sale.pk)
    test_product_a.refresh_from_db()
    expected = initial_stock - 10
    assert_eq(test_product_a.stock_quantity, expected)

test("POS: stock deducted correctly", test_pos_stock_deducted)

def test_pos_payment_mismatch():
    from sales.views import _create_sale
    from django.core.exceptions import ValidationError
    items = [{'product': test_product_a, 'quantity': 1, 'unit': 'strip', 'unit_price': Decimal('150.00')}]
    payments = [{'method': 'cash', 'amount': Decimal('100.00')}]
    try:
        _create_sale(test_admin, {
            'items': items, 'payments': payments, 'discount': Decimal('0'), 'customer': None,
        })
        raise AssertionError("Should have raised ValidationError")
    except ValidationError:
        pass

test("POS: payment mismatch raises error", test_pos_payment_mismatch)


# ═══════════════════════════════════════════════════════════════
# TEST GROUP 6: Encoding / Corrupted Text
# ═══════════════════════════════════════════════════════════════
print("\n--- Encoding Verification Tests ---")

def test_sales_jsx_no_mojibake():
    sales_jsx_path = os.path.join(
        os.path.dirname(BASE_DIR), 'Frontend', 'src', 'pos', 'Sales.jsx'
    )
    if not os.path.exists(sales_jsx_path):
        print("  SKIP  Sales.jsx not found (encoding test)")
        return
    with open(sales_jsx_path, 'r', encoding='utf-8') as f:
        content = f.read()
    corrupted_patterns = ['\u03b1\u00ba\u2502', '\u251c\u00f9', '\u0393\u00f6\u00c7', '\u0393\u00c7\u00f6', '\u2556']
    for pattern in corrupted_patterns:
        if pattern in content:
            raise AssertionError(f"Corrupted pattern still found: {repr(pattern)}")

test("Sales.jsx: no mojibake patterns", test_sales_jsx_no_mojibake)

def test_sales_jsx_has_correct_currency():
    sales_jsx_path = os.path.join(
        os.path.dirname(BASE_DIR), 'Frontend', 'src', 'pos', 'Sales.jsx'
    )
    if not os.path.exists(sales_jsx_path):
        return
    with open(sales_jsx_path, 'r', encoding='utf-8') as f:
        content = f.read()
    assert_in('\u09f3', content, "Bengali Taka sign not found in Sales.jsx")

test("Sales.jsx: uses correct Bengali Taka sign (U+09F3)", test_sales_jsx_has_correct_currency)


# ═══════════════════════════════════════════════════════════════
# CLEANUP
# ═══════════════════════════════════════════════════════════════
print("\n--- Cleanup ---")

for sid in cleanup_sale_ids:
    SalePayment.objects.filter(sale_id=sid).delete()
    SaleItem.objects.filter(sale_id=sid).delete()
    Sale.objects.filter(pk=sid).delete()

Reminder.objects.filter(pk__in=cleanup_reminder_ids).delete()

for cid in cleanup_customer_ids:
    Customer.objects.filter(pk=cid).delete()

for pid in cleanup_product_ids:
    InventoryProduct.objects.filter(pk=pid).delete()

test_supplier.delete()

for uid in cleanup_user_ids:
    User.objects.filter(pk=uid).delete()

print("  Test data cleaned up.")


# ── Verify baseline unchanged ──
print("\n--- Baseline Verification ---")
with connection.cursor() as cur:
    cur.execute("SELECT COUNT(*) FROM sales_sale")
    final_sales = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM sales_saleitem")
    final_sale_items = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM sales_salepayment")
    final_sale_payments = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM customers_customer")
    final_customers = cur.fetchone()[0]

assert_eq(final_sales, baseline_sales, f"Sales count changed: {baseline_sales} -> {final_sales}")
assert_eq(final_sale_items, baseline_sale_items, f"Sale items count changed: {baseline_sale_items} -> {final_sale_items}")
assert_eq(final_sale_payments, baseline_sale_payments, f"Sale payments count changed: {baseline_sale_payments} -> {final_sale_payments}")
assert_eq(final_customers, baseline_customers, f"Customers count changed: {baseline_customers} -> {final_customers}")
print(f"  Baseline verified: Sales={final_sales}, Items={final_sale_items}, Payments={final_sale_payments}, Customers={final_customers}")


# ═══════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════
print(f"\n{'='*60}")
print(f"RESULTS: {passed} passed, {failed} failed, {passed+failed} total")
if errors:
    print(f"\nFailures:")
    for name, err in errors:
        print(f"  - {name}: {err}")
print(f"{'='*60}\n")

sys.exit(1 if failed else 0)
