"""
Customer Serializer Validation Tests

Verifies the Add/Edit Customer form contract:
  - `loyalty_points` defaults to 0 on create instead of "This field is required."
  - `email` and `membership_tier` accept empty/blank values (optional fields)
  - `name`, `phone`, `address` remain required
  - a full-replace update without `loyalty_points` preserves existing points

Runs against the live PostgreSQL database. Creates temporary test data
and cleans up afterward. Database baseline MUST remain unchanged.
"""
import os
import sys
from datetime import date

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from django.db import connection

from customers.models import Customer
from customers.serializers import CustomerSerializer

EXACT_PAYLOAD = {
    'name': 'Sumon',
    'phone': '01258935734',
    'email': '',
    'address': 'Mirpur,Dhaka',
    'date_of_birth': '2002-12-20',
    'membership_tier': 'silver',
    'notes': '',
}

passed = 0
failed = 0
errors = []


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


print("\n=== CUSTOMER SERIALIZER VALIDATION TESTS ===\n")

print("--- Baseline ---")
with connection.cursor() as cur:
    cur.execute("SELECT COUNT(*) FROM customers_customer")
    baseline_customers = cur.fetchone()[0]
print(f"  Customers: {baseline_customers}")

print("\n--- Cleaning up leftover test data ---")
Customer.objects.filter(phone__in=['01258935734']).delete()

# Sync the ORM auto-increment sequence to the table's current max id so
# serializer-created fixtures do not collide with existing rows.
with connection.cursor() as cur:
    cur.execute(
        "SELECT setval('customers_customer_id_seq', "
        "(SELECT COALESCE(MAX(id), 1) FROM customers_customer))"
    )


def test_exact_payload_valid():
    s = CustomerSerializer(data=EXACT_PAYLOAD)
    assert_true(s.is_valid(), f"errors={s.errors}")
    assert_true('loyalty_points' not in s.errors, f"loyalty_points errored: {s.errors.get('loyalty_points')}")
    assert_true('email' not in s.errors, f"email errored: {s.errors.get('email')}")
    assert_true('membership_tier' not in s.errors, f"membership_tier errored: {s.errors.get('membership_tier')}")


def test_exact_payload_creates_with_defaults():
    s = CustomerSerializer(data=EXACT_PAYLOAD)
    s.is_valid(raise_exception=True)
    customer = s.save()
    try:
        assert_eq(customer.phone, '01258935734')
        assert_eq(customer.name, 'Sumon')
        assert_eq(customer.email, '')
        assert_eq(customer.address, 'Mirpur,Dhaka')
        assert_eq(customer.date_of_birth, date(2002, 12, 20))
        assert_eq(customer.membership_tier, 'silver')
        assert_eq(customer.loyalty_points, 0)
        assert_true(customer.pk is not None, "customer was not persisted")
    finally:
        customer.delete()


def test_membership_tier_defaults_to_regular_when_omitted():
    payload = {k: v for k, v in EXACT_PAYLOAD.items() if k != 'membership_tier'}
    s = CustomerSerializer(data=payload)
    s.is_valid(raise_exception=True)
    customer = s.save()
    try:
        assert_eq(customer.membership_tier, 'regular')
    finally:
        customer.delete()


def test_blank_membership_tier_means_non_member():
    payload = {**EXACT_PAYLOAD, 'membership_tier': '', 'phone': '01258935734'}
    s = CustomerSerializer(data=payload)
    s.is_valid(raise_exception=True)
    customer = s.save()
    try:
        assert_eq(customer.membership_tier, '')
    finally:
        customer.delete()


def test_missing_loyalty_points_allowed():
    payload = {k: v for k, v in EXACT_PAYLOAD.items() if k != 'loyalty_points'}
    s = CustomerSerializer(data=payload)
    assert_true(s.is_valid(), f"errors={s.errors}")


def test_name_still_required():
    payload = {**EXACT_PAYLOAD, 'name': ''}
    s = CustomerSerializer(data=payload)
    assert_true(not s.is_valid(), "empty name should be rejected")
    assert_true('name' in s.errors, f"expected a name error, got {s.errors}")


def test_phone_still_required():
    payload = {k: v for k, v in EXACT_PAYLOAD.items() if k != 'phone'}
    s = CustomerSerializer(data=payload)
    assert_true(not s.is_valid(), "missing phone should be rejected")
    assert_true('phone' in s.errors, f"expected a phone error, got {s.errors}")


def test_address_still_required():
    payload = {**EXACT_PAYLOAD, 'address': ''}
    s = CustomerSerializer(data=payload)
    assert_true(not s.is_valid(), "empty address should be rejected")
    assert_true('address' in s.errors, f"expected an address error, got {s.errors}")


def test_email_blank_allowed_on_create():
    payload = {**EXACT_PAYLOAD, 'email': ''}
    s = CustomerSerializer(data=payload)
    assert_true(s.is_valid(), f"blank email should be allowed, errors={s.errors}")


def test_update_without_loyalty_points_preserves_points():
    s = CustomerSerializer(data=EXACT_PAYLOAD)
    s.is_valid(raise_exception=True)
    created = s.save()
    try:
        created.loyalty_points = 7
        created.save()
        update_data = {k: v for k, v in EXACT_PAYLOAD.items() if k != 'loyalty_points'}
        update_data['notes'] = 'updated'
        s = CustomerSerializer(instance=created, data=update_data)
        assert_true(s.is_valid(), f"update errors={s.errors}")
        s.save()
        created.refresh_from_db()
        assert_eq(created.loyalty_points, 7, "full-replace update must not wipe earned points")
        assert_eq(created.notes, 'updated')
    finally:
        created.delete()


print("\n--- Running tests ---")
test("exact form payload is valid", test_exact_payload_valid)
test("exact form payload creates customer with defaults", test_exact_payload_creates_with_defaults)
test("membership_tier omitted -> create defaults to 'regular'", test_membership_tier_defaults_to_regular_when_omitted)
test("blank membership_tier accepted (Non-member)", test_blank_membership_tier_means_non_member)
test("missing loyalty_points no longer errors", test_missing_loyalty_points_allowed)
test("name stays required", test_name_still_required)
test("phone stays required", test_phone_still_required)
test("address stays required", test_address_still_required)
test("blank email is allowed on create", test_email_blank_allowed_on_create)
test("update without loyalty_points preserves points", test_update_without_loyalty_points_preserves_points)

print("\n--- Baseline check ---")
with connection.cursor() as cur:
    cur.execute("SELECT COUNT(*) FROM customers_customer")
    final_customers = cur.fetchone()[0]
print(f"  Customers: {final_customers} (baseline {baseline_customers})")
assert_eq(final_customers, baseline_customers, "database baseline must remain unchanged")

print(f"\nRESULT: {passed} passed, {failed} failed")
if errors:
    for name, e in errors:
        print(f"  {name}: {e}")
    sys.exit(1)