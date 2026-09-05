"""
Notifications — Test Suite

Tests all notification endpoints and helper services against the live
PostgreSQL database. Uses temporary records with rollback/cleanup protection.
Run with: python notifications/test_notifications.py
"""
import os
import sys
import json
import traceback
from datetime import date, timedelta
from decimal import Decimal

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from rest_framework.test import APIRequestFactory, force_authenticate

from accounts.models import User
from notifications.models import Notification
from notifications.services import (
    create_notification,
    generate_low_stock_notifications,
    generate_expiry_notifications,
)

factory = APIRequestFactory()
passed = 0
failed = 0
errors = []
BASELINE_COUNT = Notification.objects.count()
cleanup_users = []
cleanup_notifications = []
cleanup_products = []
_user_cache = {}


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


def anon():
    return type('Anon', (), {'is_authenticated': False, 'is_superuser': False})()


def _get_or_create(username, **kwargs):
    if username not in _user_cache:
        user, created = User.objects.get_or_create(username=username, defaults=kwargs)
        if created:
            user.set_password('testpass123')
            user.save()
            cleanup_users.append(user.id)
        _user_cache[username] = user
    return _user_cache[username]


def _staff(role=None):
    for r in (role or ['admin', 'pharmacist', 'staff']):
        u = User.objects.filter(role=r, is_active=True).first()
        if u:
            return u
    return _get_or_create('__test_notif_staff', role='staff', is_active=True)


def _admin():
    u = User.objects.filter(is_superuser=True).first()
    if u:
        return u
    return _get_or_create('__test_notif_admin', role='admin', is_active=True)


def _customer():
    u = User.objects.filter(role='customer', is_active=True).first()
    if u:
        return u
    return _get_or_create('__test_notif_customer', role='customer', is_active=True)


def _temp_notification(delete=True, **kwargs):
    import time
    defaults = dict(
        type='general',
        title='Temp Test Notification',
        message='Temporary notification created during tests.',
        severity='info',
        is_read=False,
        dedup_key='__test_notif_%s_%s' % (time.time(), kwargs.get('severity', 'info')),
        product=None,
    )
    defaults.update(kwargs)
    n = Notification.objects.create(**defaults)
    if delete:
        cleanup_notifications.append(n.id)
    return n


def _temp_product(**kwargs):
    import time
    from inventory.models import InventoryProduct
    from django.utils import timezone
    now = timezone.now()
    defaults = dict(
        name='__temp_notif_product_%s_%s' % (time.time(), abs(hash(str(kwargs))) % 100000),
        brand='test',
        barcode='__notif_barcode_%s_%s' % (time.time(), abs(hash(str(kwargs))) % 10**9),
        unit_price=Decimal('10.00'),
        cost_price=Decimal('5.00'),
        stock_quantity=100,
        reorder_level=10,
        expiry_date=None,
        is_active=True,
        description='',
        created_at=now,
        updated_at=now,
        is_sensitive=False,
    )
    defaults.update(kwargs)
    p = InventoryProduct.objects.create(**defaults)
    cleanup_products.append(p.id)
    return p


def call_list(user):
    from notifications.views import NotificationListView
    req = factory.get('/api/notifications/')
    force_authenticate(req, user=user) if user else setattr(req, 'user', anon())
    return NotificationListView.as_view()(req)


def call_retrieve(user, pk):
    from notifications.views import NotificationDetailView
    req = factory.get(f'/api/notifications/{pk}/')
    force_authenticate(req, user=user) if user else setattr(req, 'user', anon())
    return NotificationDetailView.as_view()(req, pk=pk)


def call_patch(user, pk, data):
    from notifications.views import NotificationDetailView
    req = factory.patch(f'/api/notifications/{pk}/', data=json.dumps(data), content_type='application/json')
    force_authenticate(req, user=user) if user else setattr(req, 'user', anon())
    return NotificationDetailView.as_view()(req, pk=pk)


def call_unread_count(user):
    from notifications.views import unread_count
    req = factory.get('/api/notifications/unread-count/')
    force_authenticate(req, user=user) if user else setattr(req, 'user', anon())
    return unread_count(req)


print("\n" + "=" * 60)
print("  NOTIFICATIONS — TEST SUITE")
print("=" * 60 + "\n")


# ── Model ──

def test_model_maps_to_table():
    assert Notification._meta.db_table == 'notifications_notification'

run_test("Notification maps to notifications_notification", test_model_maps_to_table)


def test_model_managed_false():
    assert not Notification._meta.managed

run_test("Notification managed=False", test_model_managed_false)


def test_model_fields_match_db():
    fields = {f.name for f in Notification._meta.get_fields()}
    for f in ['id', 'type', 'title', 'message', 'severity', 'is_read',
              'dedup_key', 'created_at', 'product']:
        assert f in fields, f"Missing field: {f}"

run_test("Notification has all DB columns", test_model_fields_match_db)


# ── Serializer ──

def test_serializer_fields():
    from notifications.serializers import NotificationSerializer
    n = _temp_notification()
    s = NotificationSerializer(n)
    data = s.data
    for f in ['id', 'type', 'title', 'message', 'severity', 'is_read',
              'dedup_key', 'created_at', 'product', 'product_name']:
        assert f in data, f"Missing field {f} in serializer output"

run_test("Serializer returns all relevant fields", test_serializer_fields)


# ── List ──

def test_list_returns_200():
    resp = call_list(_staff())
    assert resp.status_code == 200
    assert isinstance(resp.data, list)

run_test("GET /notifications/ returns 200 with list", test_list_returns_200)


def test_list_contains_created():
    n = _temp_notification()
    resp = call_list(_staff())
    ids = [x['id'] for x in resp.data]
    assert n.id in ids, f"Created notification {n.id} not in list"

run_test("List contains created notification", test_list_contains_created)


def test_list_fields():
    n = _temp_notification()
    resp = call_list(_staff())
    entry = next(x for x in resp.data if x['id'] == n.id)
    for f in ['id', 'type', 'title', 'message', 'severity', 'is_read',
              'dedup_key', 'created_at', 'product', 'product_name']:
        assert f in entry, f"Missing field {f} in list entry"

run_test("List response has all notification fields", test_list_fields)


# ── Retrieve ──

def test_retrieve_returns_200():
    n = _temp_notification()
    resp = call_retrieve(_staff(), n.id)
    assert resp.status_code == 200
    assert resp.data['id'] == n.id
    assert resp.data['title'] == n.title

run_test("GET /notifications/<id>/ returns 200", test_retrieve_returns_200)


def test_retrieve_invalid_id():
    from rest_framework import status as st
    MAX = 2**31 + 9
    resp = call_retrieve(_staff(), MAX)
    assert resp.status_code in (404, 400), f"Expected 404/400, got {resp.status_code}"

run_test("Invalid notification ID returns 404/400", test_retrieve_invalid_id)


# ── Unread count ──

def test_unread_count_real():
    n = _temp_notification(is_read=False)
    resp = call_unread_count(_staff())
    assert resp.status_code == 200
    db_count = Notification.objects.filter(is_read=False).count()
    assert resp.data['unread_count'] == db_count, \
        f"API={resp.data['unread_count']} DB={db_count}"

run_test("Unread count matches PostgreSQL", test_unread_count_real)


# ── Mark as read / PATCH ──

def test_patch_mark_read():
    n = _temp_notification(is_read=False)
    resp = call_patch(_staff(), n.id, {'is_read': True})
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    assert resp.data['is_read'] is True
    n.refresh_from_db()
    assert n.is_read is True, "DB is_read not updated"

run_test("PATCH marks notification as read in DB", test_patch_mark_read)


def test_patch_edit_title():
    n = _temp_notification()
    resp = call_patch(_staff(), n.id, {'title': 'Updated Title'})
    assert resp.status_code == 200
    n.refresh_from_db()
    assert n.title == 'Updated Title'

run_test("PATCH can update editable fields", test_patch_edit_title)


# ── Permissions ──

def test_unauthenticated_denied_list():
    resp = call_list(None)
    assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"

run_test("Unauthenticated denied list (401)", test_unauthenticated_denied_list)


def test_unauthenticated_denied_detail():
    n = _temp_notification()
    resp = call_retrieve(None, n.id)
    assert resp.status_code == 401

run_test("Unauthenticated denied retrieve (401)", test_unauthenticated_denied_detail)


def test_unauthenticated_denied_unread():
    resp = call_unread_count(None)
    assert resp.status_code == 401

run_test("Unauthenticated denied unread-count (401)", test_unauthenticated_denied_unread)


def test_customer_denied_list():
    resp = call_list(_customer())
    assert resp.status_code == 403, f"Expected 403, got {resp.status_code}"

run_test("Customer denied list (403)", test_customer_denied_list)


def test_customer_denied_retrieve():
    n = _temp_notification()
    resp = call_retrieve(_customer(), n.id)
    assert resp.status_code == 403

run_test("Customer denied retrieve (403)", test_customer_denied_retrieve)


def test_customer_denied_patch():
    n = _temp_notification()
    resp = call_patch(_customer(), n.id, {'is_read': True})
    assert resp.status_code == 403

run_test("Customer denied patch (403)", test_customer_denied_patch)


def test_customer_denied_unread():
    resp = call_unread_count(_customer())
    assert resp.status_code == 403

run_test("Customer denied unread-count (403)", test_customer_denied_unread)


def test_admin_allowed():
    resp = call_list(_admin())
    assert resp.status_code == 200, f"Expected 200 for admin, got {resp.status_code}"

run_test("Admin allowed list (200)", test_admin_allowed)


def test_staff_allowed():
    resp = call_list(_staff('staff'))
    assert resp.status_code == 200, f"Expected 200 for staff, got {resp.status_code}"

run_test("Staff allowed list (200)", test_staff_allowed)


def test_pharmacist_allowed():
    resp = call_list(_staff('pharmacist'))
    assert resp.status_code == 200, f"Expected 200 for pharmacist, got {resp.status_code}"

run_test("Pharmacist allowed list (200)", test_pharmacist_allowed)


# ── Service: create_notification ──

def test_create_notification():
    n = create_notification('general', 'Title', 'Message', severity='info')
    assert n is not None
    assert n.type == 'general'
    assert n.title == 'Title'
    assert n.message == 'Message'
    assert not n.is_read
    cleanup_notifications.append(n.id)

run_test("create_notification creates record", test_create_notification)


def test_create_with_product():
    p = _temp_product()
    n = create_notification('general', 'T', 'M', product=p,
                            dedup_key='__test_dup_p')
    assert n is not None
    assert n.product_id == p.id
    cleanup_notifications.append(n.id)

run_test("create_notification links product", test_create_with_product)


# ── Duplicate prevention ──

def test_duplicate_prevention():
    key = '__test_unique_dup_%s' % abs(hash(str(date.today())))
    n1 = create_notification('general', 'T1', 'M1', dedup_key=key)
    cleanup_notifications.append(n1.id)
    n2 = create_notification('general', 'T2', 'M2', dedup_key=key)
    assert n2 is None, "Duplicate active notification created"
    count = Notification.objects.filter(dedup_key=key, is_read=False).count()
    assert count == 1, f"Expected 1 active dedup record, got {count}"

run_test("Duplicate active notification prevented", test_duplicate_prevention)


def test_duplicate_allowed_after_read():
    key = '__test_read_dup_%s' % abs(hash(str(date.today())))
    n1 = create_notification('general', 'T1', 'M1', dedup_key=key)
    cleanup_notifications.append(n1.id)
    n1.is_read = True
    n1.save()
    # dedup_key is UNIQUE in the DB, so a second row with the same key is
    # rejected regardless of read status. The service must return None rather
    # than raise an integrity error.
    assert Notification.objects.filter(dedup_key=key).count() == 1
    n2 = create_notification('general', 'T2', 'M2', dedup_key=key)
    assert n2 is None, "dedup_key is unique; second create should be skipped"
    assert Notification.objects.filter(dedup_key=key).count() == 1, \
        "DB unique constraint on dedup_key should prevent reuse"

run_test("dedup_key is DB-unique (no reuse, no crash)", test_duplicate_allowed_after_read)


def test_multiple_general_notifications_allowed():
    n1 = create_notification('general', 'A', 'B')
    n2 = create_notification('general', 'C', 'D')
    assert n1 is not None and n2 is not None, \
        "Multiple general notifications should be creatable"
    assert n1.dedup_key != n2.dedup_key, "dedup_keys must be unique"
    cleanup_notifications.extend(n.id for n in (n1, n2) if n)

run_test("Multiple general notifications can coexist", test_multiple_general_notifications_allowed)


# ── Low-stock notification generation ──

def test_low_stock_generation():
    p = _temp_product(name='__temp_lowstock', stock_quantity=2, reorder_level=10)
    created = [n for n in generate_low_stock_notifications()
               if n and n.product_id == p.id]
    assert created, "Low-stock notification not generated"
    assert created[0].type == 'low_stock'
    assert created[0].product_id == p.id
    cleanup_notifications.append(created[0].id)

run_test("Low-stock notification generated", test_low_stock_generation)


def test_low_stock_dedup():
    p = _temp_product(name='__temp_lowstock2', stock_quantity=3, reorder_level=15)
    gen1 = [n for n in generate_low_stock_notifications() if n and n.product_id == p.id]
    assert gen1, "No low-stock notification"
    cleanup_notifications.append(gen1[0].id)
    gen2 = [n for n in generate_low_stock_notifications() if n and n.product_id == p.id]
    assert gen2 == [], f"Duplicate low-stock notification created: {gen2}"
    count = Notification.objects.filter(dedup_key__contains=str(p.id), is_read=False,
                                        type='low_stock').count()
    assert count == 1, f"Expected 1 low-stock notification, got {count}"

run_test("Low-stock generation is deduplicated", test_low_stock_dedup)


def test_no_low_stock_when_above_reorder():
    p = _temp_product(name='__temp_okstock', stock_quantity=100, reorder_level=10)
    generated = [n for n in generate_low_stock_notifications() if n and n.product_id == p.id]
    assert generated == [], "Should not generate low-stock for in-stock product"

run_test("No low-stock when stock above reorder level", test_no_low_stock_when_above_reorder)


# ── Expiry / near-expiry notification generation ──

def test_expired_generation():
    p = _temp_product(name='__temp_expired', expiry_date=date.today() - timedelta(days=5))
    created = [n for n in generate_expiry_notifications() if n and n.product_id == p.id]
    assert created, "Expired notification not generated"
    assert created[0].type == 'expiry'
    cleanup_notifications.append(created[0].id)

run_test("Expired product notification generated", test_expired_generation)


def test_near_expiry_generation():
    p = _temp_product(name='__temp_nearexp', expiry_date=date.today() + timedelta(days=10))
    created = [n for n in generate_expiry_notifications() if n and n.product_id == p.id]
    assert created, "Near-expiry notification not generated"
    assert created[0].type == 'near_expiry'
    cleanup_notifications.append(created[0].id)

run_test("Near-expiry product notification generated", test_near_expiry_generation)


def test_no_expiry_when_far_future():
    p = _temp_product(name='__temp_futureexp',
                      expiry_date=date.today() + timedelta(days=400))
    created = [n for n in generate_expiry_notifications() if n and n.product_id == p.id]
    assert created == [], "Should not generate notification for far-future expiry"

run_test("No notification for far-future expiry", test_no_expiry_when_far_future)


def test_no_notification_spam_on_get():
    from notifications.views import NotificationListView
    before = Notification.objects.count()
    _staff()
    for _ in range(3):
        req = factory.get('/api/notifications/')
        force_authenticate(req, user=_staff())
        NotificationListView.as_view()(req)
    after = Notification.objects.count()
    assert after == before, "GET requests created notifications"

run_test("GET endpoints do not create notifications", test_no_notification_spam_on_get)


# ── DB unchanged after tests is verified in the cleanup section below ──


# ── Cleanup ──
Notification.objects.filter(id__in=cleanup_notifications).delete()
from inventory.models import InventoryProduct
InventoryProduct.objects.filter(id__in=cleanup_products).delete()
User.objects.filter(id__in=cleanup_users).delete()

final_count = Notification.objects.count()
print(f"\n  Temp records cleaned up. Remaining notifications: {final_count}")
if final_count != BASELINE_COUNT:
    failed += 1
    errors.append(("Cleanup", "Notification count differs from baseline",
                   f"baseline={BASELINE_COUNT} final={final_count}"))
    print(f"  FAIL  Cleanup: count {final_count} != baseline {BASELINE_COUNT}")
else:
    print("  PASS  Database restored to baseline after tests")

print("\n" + "=" * 60)
print(f"  RESULTS: {passed} passed, {failed} failed, {passed + failed} total")
print("=" * 60)

if errors:
    print("\nFailed tests:")
    for name, err, tb in errors:
        print(f"\n--- {name} ---")
        print(err)
        print(tb)

print()
sys.exit(1 if failed else 0)
