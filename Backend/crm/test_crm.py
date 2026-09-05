"""
CRM Reminder Backend Test Suite

Runs directly against the real PostgreSQL database.
Creates temporary test data and cleans up afterward.
Database baseline MUST remain unchanged.
"""
import os
import sys
import json
import traceback

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from django.utils import timezone
from django.contrib.auth import get_user_model
from django.test import RequestFactory
from rest_framework.test import APIRequestFactory, force_authenticate

from accounts.models import User
from customers.models import Customer
from inventory.models import InventoryProduct
from crm.models import Reminder, CrmPermission
from crm.serializers import ReminderSerializer, ReminderCreateSerializer
from crm.permissions import IsCrmStaff
from crm.views import ReminderListCreateView, ReminderDetailView, CustomerReminderListView

factory = APIRequestFactory()

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

def assert_in(val, collection, msg=""):
    if val not in collection:
        raise AssertionError(f"Expected {val!r} in {collection!r}. {msg}")


# ── Setup ──
print("\n=== CRM REMINDER BACKEND TESTS ===\n")

# Create test data
admin_user = User.objects.create_user(
    username='crm_test_admin_99', password='testpass123', role='admin', is_staff=True, is_active=True
)
staff_user = User.objects.create_user(
    username='crm_test_staff_99', password='testpass123', role='staff', is_active=True
)
customer_user = User.objects.create_user(
    username='crm_test_custuser_99', password='testpass123', role='customer', is_active=True
)
customer = Customer.objects.create(
    name='CRM Test Customer', phone='+63912345001', email='crmtest001@example.com',
    address='123 Test St', loyalty_points=0, created_at=timezone.now(), membership_tier='regular',
)
product = InventoryProduct.objects.create(
    name='CRM Test Product', brand='TestBrand', barcode='CRM-TEST-999',
    unit_price=100.00, cost_price=80.00, stock_quantity=50, reorder_level=10,
    is_active=True, description='Test product', created_at=timezone.now(),
    updated_at=timezone.now(), is_sensitive=False,
)

created_reminder_ids = []

def make_reminder(**overrides):
    data = {
        'title': 'Test Reminder',
        'reminder_time': (timezone.now() + timezone.timedelta(hours=1)).isoformat(),
        'customer': customer.pk,
        'product': product.pk,
        'is_active': True,
    }
    data.update(overrides)
    r = Reminder.objects.create(
        title=data['title'],
        reminder_time=data['reminder_time'],
        customer_id=data['customer'],
        product_id=data['product'],
        is_active=data['is_active'],
        created_at=timezone.now(),
        updated_at=timezone.now(),
    )
    created_reminder_ids.append(r.pk)
    return r


# ── Model Tests ──
print("--- Model Tests ---")

test("Reminder maps to crm_reminder", lambda: assert_eq(Reminder._meta.db_table, 'crm_reminder'))
test("Reminder managed=False", lambda: assert_true(not Reminder._meta.managed))
test("Reminder has customer FK", lambda: assert_in('customer', [f.name for f in Reminder._meta.get_fields()]))
test("Reminder has product FK", lambda: assert_in('product', [f.name for f in Reminder._meta.get_fields()]))
test("Reminder fields correct", lambda: assert_eq(
    sorted([f.name for f in Reminder._meta.get_fields()]),
    sorted(['id', 'title', 'reminder_time', 'is_active', 'created_at', 'updated_at', 'customer', 'product'])
))
test("CrmPermission maps to crm_crmpermission", lambda: assert_eq(CrmPermission._meta.db_table, 'crm_crmpermission'))
test("CrmPermission managed=False", lambda: assert_true(not CrmPermission._meta.managed))
test("CrmPermission has customer_id", lambda: assert_in('customer_id', [f.name for f in CrmPermission._meta.get_fields()]))
test("CrmPermission has medicine_id", lambda: assert_in('medicine_id', [f.name for f in CrmPermission._meta.get_fields()]))
test("CrmPermission has is_allowed", lambda: assert_in('is_allowed', [f.name for f in CrmPermission._meta.get_fields()]))
test("CrmPermission has notes", lambda: assert_in('notes', [f.name for f in CrmPermission._meta.get_fields()]))


# ── Serializer Tests ──
print("\n--- Serializer Tests ---")

def test_serializer_valid():
    data = {
        'title': 'Serializer Test',
        'reminder_time': (timezone.now() + timezone.timedelta(hours=1)).isoformat(),
        'customer': customer.pk,
        'product': product.pk,
        'is_active': True,
    }
    s = ReminderCreateSerializer(data=data)
    assert_true(s.is_valid(), s.errors)

test("ReminderCreateSerializer valid", test_serializer_valid)

def test_serializer_empty_title():
    data = {
        'title': '',
        'reminder_time': (timezone.now() + timezone.timedelta(hours=1)).isoformat(),
        'customer': customer.pk,
        'product': product.pk,
        'is_active': True,
    }
    s = ReminderCreateSerializer(data=data)
    assert_true(not s.is_valid())
    assert_in('title', s.errors)

test("ReminderCreateSerializer rejects empty title", test_serializer_empty_title)

def test_serializer_invalid_customer():
    data = {
        'title': 'No Customer',
        'reminder_time': (timezone.now() + timezone.timedelta(hours=1)).isoformat(),
        'customer': 999999,
        'product': product.pk,
        'is_active': True,
    }
    s = ReminderCreateSerializer(data=data)
    assert_true(not s.is_valid())
    assert_in('customer', s.errors)

test("ReminderCreateSerializer rejects invalid customer", test_serializer_invalid_customer)

def test_serializer_invalid_product():
    data = {
        'title': 'No Product',
        'reminder_time': (timezone.now() + timezone.timedelta(hours=1)).isoformat(),
        'customer': customer.pk,
        'product': 999999,
        'is_active': True,
    }
    s = ReminderCreateSerializer(data=data)
    assert_true(not s.is_valid())
    assert_in('product', s.errors)

test("ReminderCreateSerializer rejects invalid product", test_serializer_invalid_product)

def test_serializer_missing_fields():
    s = ReminderCreateSerializer(data={})
    assert_true(not s.is_valid())
    assert_in('title', s.errors)
    assert_in('reminder_time', s.errors)
    assert_in('customer', s.errors)
    assert_in('product', s.errors)

test("ReminderCreateSerializer rejects empty data", test_serializer_missing_fields)

def test_read_serializer_fields():
    r = make_reminder(title='Serializer Fields Test')
    s = ReminderSerializer(r)
    data = s.data
    assert_in('id', data)
    assert_in('title', data)
    assert_in('reminder_time', data)
    assert_in('customer', data)
    assert_in('product', data)
    assert_in('is_active', data)
    assert_in('created_at', data)
    assert_in('updated_at', data)
    assert_in('name', data['customer'])
    assert_in('name', data['product'])

test("ReminderSerializer output fields", test_read_serializer_fields)


# ── Permission Tests ──
print("\n--- Permission Tests ---")

perm = IsCrmStaff()

def test_admin_has_permission():
    req = factory.get('/')
    req.user = admin_user
    assert_true(perm.has_permission(req, None))

test("IsCrmStaff allows admin", test_admin_has_permission)

def test_staff_has_permission():
    req = factory.get('/')
    req.user = staff_user
    assert_true(perm.has_permission(req, None))

test("IsCrmStaff allows staff", test_staff_has_permission)

def test_customer_blocked():
    req = factory.get('/')
    req.user = customer_user
    assert_true(not perm.has_permission(req, None))

test("IsCrmStaff blocks customer", test_customer_blocked)

def test_unauthenticated_blocked():
    from rest_framework.test import APIRequestFactory
    req = factory.get('/')
    # Simulate no user
    class Anon:
        is_authenticated = False
    req.user = Anon()
    assert_true(not perm.has_permission(req, None))

test("IsCrmStaff blocks unauthenticated", test_unauthenticated_blocked)


# ── View / API Tests ──
print("\n--- View / API Tests ---")

def api_call(view_cls, method, user, url_kwargs=None, data=None, pk=None):
    """Make an API call and return response."""
    url = '/api/crm/reminders/'
    if pk:
        url = f'/api/crm/reminders/{pk}/'

    kwargs = {}
    if url_kwargs:
        url = f'/api/crm/customers/{url_kwargs["customer_id"]}/reminders/'

    if method == 'GET':
        req = factory.get(url)
    elif method == 'POST':
        req = factory.post(url, data=json.dumps(data), content_type='application/json')
    elif method == 'PUT':
        req = factory.put(url, data=json.dumps(data), content_type='application/json')
    elif method == 'PATCH':
        req = factory.patch(url, data=json.dumps(data), content_type='application/json')
    elif method == 'DELETE':
        req = factory.delete(url)

    if user:
        force_authenticate(req, user=user)

    if url_kwargs:
        view = CustomerReminderListView.as_view()
        return view(req, **url_kwargs)
    elif pk and method in ('GET', 'PUT', 'PATCH', 'DELETE'):
        view = ReminderDetailView.as_view()
        return view(req, pk=pk)
    else:
        view = ReminderListCreateView.as_view()
        return view(req)


# List
def test_list_admin():
    r = make_reminder(title='View List Admin')
    resp = api_call(ReminderListCreateView, 'GET', admin_user)
    assert_eq(resp.status_code, 200)
    assert_true(isinstance(resp.data, list))
    titles = [item['title'] for item in resp.data]
    assert_in('View List Admin', titles)

test("GET /reminders/ as admin", test_list_admin)

def test_list_staff():
    r = make_reminder(title='View List Staff')
    resp = api_call(ReminderListCreateView, 'GET', staff_user)
    assert_eq(resp.status_code, 200)

test("GET /reminders/ as staff", test_list_staff)

# Create
def test_create_reminder():
    data = {
        'title': 'View Create Test',
        'reminder_time': (timezone.now() + timezone.timedelta(hours=1)).isoformat(),
        'customer': customer.pk,
        'product': product.pk,
        'is_active': True,
    }
    resp = api_call(ReminderListCreateView, 'POST', admin_user, data=data)
    assert_eq(resp.status_code, 201)
    assert_eq(resp.data['title'], 'View Create Test')
    assert_true(resp.data['is_active'])
    created_reminder_ids.append(resp.data['id'])

test("POST /reminders/ as admin", test_create_reminder)

def test_create_staff():
    data = {
        'title': 'View Create Staff',
        'reminder_time': (timezone.now() + timezone.timedelta(hours=2)).isoformat(),
        'customer': customer.pk,
        'product': product.pk,
        'is_active': True,
    }
    resp = api_call(ReminderListCreateView, 'POST', staff_user, data=data)
    assert_eq(resp.status_code, 201)
    created_reminder_ids.append(resp.data['id'])

test("POST /reminders/ as staff", test_create_staff)

# Retrieve
def test_retrieve():
    r = make_reminder(title='View Retrieve Test')
    resp = api_call(ReminderDetailView, 'GET', admin_user, pk=r.pk)
    assert_eq(resp.status_code, 200)
    assert_eq(resp.data['title'], 'View Retrieve Test')
    assert_eq(resp.data['id'], r.pk)

test("GET /reminders/<id>/ as admin", test_retrieve)

# Update (PUT)
def test_update():
    r = make_reminder(title='View Update Before')
    data = {
        'title': 'View Update After',
        'reminder_time': (timezone.now() + timezone.timedelta(hours=3)).isoformat(),
        'customer': customer.pk,
        'product': product.pk,
        'is_active': True,
    }
    resp = api_call(ReminderDetailView, 'PUT', admin_user, pk=r.pk, data=data)
    assert_eq(resp.status_code, 200)
    assert_eq(resp.data['title'], 'View Update After')

test("PUT /reminders/<id>/ as admin", test_update)

# Partial Update (PATCH)
def test_partial_update():
    r = make_reminder(title='View Patch Before')
    resp = api_call(ReminderDetailView, 'PATCH', admin_user, pk=r.pk, data={'title': 'View Patch After'})
    assert_eq(resp.status_code, 200)
    assert_eq(resp.data['title'], 'View Patch After')

test("PATCH /reminders/<id>/ as admin", test_partial_update)

# Deactivate
def test_deactivate():
    r = make_reminder(title='View Deactivate Test', is_active=True)
    resp = api_call(ReminderDetailView, 'PATCH', admin_user, pk=r.pk, data={'is_active': False})
    assert_eq(resp.status_code, 200)
    assert_true(not resp.data['is_active'])

test("PATCH /reminders/<id>/ deactivate", test_deactivate)

# Delete
def test_delete():
    r = make_reminder(title='View Delete Test')
    rid = r.pk
    resp = api_call(ReminderDetailView, 'DELETE', admin_user, pk=rid)
    assert_eq(resp.status_code, 204)
    assert_true(not Reminder.objects.filter(pk=rid).exists())

test("DELETE /reminders/<id>/ as admin", test_delete)

# Customer-specific
def test_customer_reminders():
    other_cust = Customer.objects.create(
        name='Other Test', phone='+63912345010', email='other010@example.com',
        address='456 Other', loyalty_points=0, created_at=timezone.now(), membership_tier='regular',
    )
    special_cust = Customer.objects.create(
        name='Special Test', phone='+63912345011', email='special011@example.com',
        address='789 Special', loyalty_points=0, created_at=timezone.now(), membership_tier='regular',
    )
    rids = []
    try:
        r1 = make_reminder(title='View Cust1', customer=special_cust.pk)
        rids.append(r1.pk)
        r2 = make_reminder(title='View Cust2', customer=other_cust.pk)
        rids.append(r2.pk)
        resp = api_call(CustomerReminderListView, 'GET', admin_user, url_kwargs={'customer_id': special_cust.pk})
        assert_eq(resp.status_code, 200)
        assert_eq(len(resp.data), 1)
        assert_eq(resp.data[0]['title'], 'View Cust1')
    finally:
        Reminder.objects.filter(pk__in=rids).delete()
        other_cust.delete()
        special_cust.delete()

test("GET /customers/<id>/reminders/", test_customer_reminders)

# Unauthenticated
def test_unauthenticated_list():
    resp = api_call(ReminderListCreateView, 'GET', None)
    assert_eq(resp.status_code, 401)

test("GET /reminders/ unauthenticated", test_unauthenticated_list)

def test_unauthenticated_create():
    data = {
        'title': 'Unauth Test',
        'reminder_time': (timezone.now() + timezone.timedelta(hours=1)).isoformat(),
        'customer': customer.pk,
        'product': product.pk,
        'is_active': True,
    }
    resp = api_call(ReminderListCreateView, 'POST', None, data=data)
    assert_eq(resp.status_code, 401)

test("POST /reminders/ unauthenticated", test_unauthenticated_create)

# Customer role blocked
def test_customer_blocked_list():
    resp = api_call(ReminderListCreateView, 'GET', customer_user)
    assert_eq(resp.status_code, 403)

test("GET /reminders/ customer role blocked", test_customer_blocked_list)

def test_customer_blocked_create():
    data = {
        'title': 'Customer Blocked',
        'reminder_time': (timezone.now() + timezone.timedelta(hours=1)).isoformat(),
        'customer': customer.pk,
        'product': product.pk,
        'is_active': True,
    }
    resp = api_call(ReminderListCreateView, 'POST', customer_user, data=data)
    assert_eq(resp.status_code, 403)

test("POST /reminders/ customer role blocked", test_customer_blocked_create)

# 404
def test_not_found():
    resp = api_call(ReminderDetailView, 'GET', admin_user, pk=999999)
    assert_eq(resp.status_code, 404)

test("GET /reminders/999999/ not found", test_not_found)


# ── Cleanup ──
print("\n--- Cleanup ---")
Reminder.objects.filter(pk__in=created_reminder_ids).delete()
# Also clean up any test reminders
Reminder.objects.filter(
    title__startswith='View '
).delete()
Reminder.objects.filter(
    title__startswith='Serializer '
).delete()
print("  Cleanup complete.")

# Also clean up test users and data
admin_user.delete()
staff_user.delete()
customer_user.delete()
customer.delete()
product.delete()
print("  Test data cleaned up.")


# ── Summary ──
print(f"\n{'='*50}")
print(f"RESULTS: {passed} passed, {failed} failed, {passed+failed} total")
if errors:
    print(f"\nFailures:")
    for name, err in errors:
        print(f"  - {name}: {err}")
print(f"{'='*50}\n")

sys.exit(1 if failed else 0)
