"""
Audit — Test Suite

Runs against the live PostgreSQL database. Creates temporary users and audit
records, cleans them up afterward, and verifies the pre-existing audit_auditlog
rows and total count remain unchanged.

Run with: python audit/tests.py
"""
import os
import sys
import traceback

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import User
from audit.models import AuditLog
from audit.serializers import AuditLogSerializer
from audit.services import create_audit_log

passed = 0
failed = 0
errors = []

BASELINE_COUNT = AuditLog.objects.count()
BASELINE_SNAPSHOT = list(
    AuditLog.objects.order_by('id').values_list('id', 'action', 'details')
)

cleanup_users = []
cleanup_logs = []
_user_cache = {}


def run_test(name, fn):
    global passed, failed
    try:
        fn()
        passed += 1
        print(f"  PASS  {name}")
    except Exception as e:
        failed += 1
        errors.append((name, str(e), traceback.format_exc()))
        print(f"  FAIL  {name}: {e}")


def _get_or_create(username, **kwargs):
    if username not in _user_cache:
        user, created = User.objects.get_or_create(username=username, defaults=kwargs)
        if created:
            user.set_password('testpass123')
            user.save()
            cleanup_users.append(user.id)
        _user_cache[username] = user
    return _user_cache[username]


def _user(role):
    return _get_or_create(f'__test_audit_{role}', role=role, is_active=True)


def _client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


def _admin():
    return _user('admin')


def _staff():
    return _user('staff')


def _pharmacist():
    return _user('pharmacist')


def _customer():
    return _user('customer')


def _temp_log(action='test_action', user=None, **extra):
    defaults = dict(details={'module': 'test'})
    defaults.update(extra)
    log = create_audit_log(action=action, details=defaults.get('details'), user=user)
    if log:
        cleanup_logs.append(log.id)
    return log


print("\n" + "=" * 60)
print("  AUDIT — TEST SUITE")
print("=" * 60 + "\n")


# ── Model mapping ──

def test_model_maps_to_table():
    assert AuditLog._meta.db_table == 'audit_auditlog'


def test_model_managed_false():
    assert AuditLog._meta.managed is False


def test_model_fields():
    names = [f.name for f in AuditLog._meta.get_fields()]
    for f in ['id', 'user', 'action', 'details', 'ip_address', 'timestamp']:
        assert f in names, f'missing field {f}'


run_test("AuditLog maps to audit_auditlog", test_model_maps_to_table)
run_test("AuditLog is managed=False", test_model_managed_false)
run_test("AuditLog has exact existing columns", test_model_fields)


# ── Serializer ──

def test_serializer_fields():
    log = _temp_log(action='serializer_login', user=_user('pharmacist'))
    data = AuditLogSerializer(log).data
    for f in ['id', 'action', 'details', 'ip_address', 'timestamp', 'user', 'user_id']:
        assert f in data, f'missing field {f}'
    assert data['action'] == 'serializer_login'
    assert data['user']['id'] == _user('pharmacist').id


run_test("AuditLogSerializer exposes read-only fields", test_serializer_fields)


# ── API helpers ──

def call_list(user):
    from audit.views import AuditLogListView
    import json
    from rest_framework.test import APIRequestFactory, force_authenticate
    factory = APIRequestFactory()
    req = factory.get('/api/audit/')
    force_authenticate(req, user=user) if user else setattr(req, 'user', type('Anon', (), {'is_authenticated': False, 'is_superuser': False})())
    resp = AuditLogListView.as_view()(req)
    resp.render()
    return resp.status_code, json.loads(resp.content)


def call_retrieve(user, pk):
    from audit.views import AuditLogDetailView
    import json
    from rest_framework.test import APIRequestFactory, force_authenticate
    factory = APIRequestFactory()
    req = factory.get(f'/api/audit/{pk}/')
    force_authenticate(req, user=user) if user else setattr(req, 'user', type('Anon', (), {'is_authenticated': False, 'is_superuser': False})())
    resp = AuditLogDetailView.as_view()(req, pk=pk)
    resp.render()
    return resp.status_code, json.loads(resp.content)


def anon_req():
    return None


# ── GET list ──

def test_list_admin():
    _temp_log(action='test_list_admin', user=_user('staff'))
    code, data = call_list(_user('admin'))
    assert code == 200
    actions = [r['action'] for r in data]
    assert 'test_list_admin' in actions


def test_list_staff():
    _temp_log(action='test_list_staff', user=_user('staff'))
    code, data = call_list(_user('staff'))
    assert code == 200


def test_list_pharmacist():
    _temp_log(action='test_list_pharmacist', user=_user('staff'))
    code, data = call_list(_user('pharmacist'))
    assert code == 200


run_test("GET /api/audit/ admin allowed", test_list_admin)
run_test("GET /api/audit/ staff allowed", test_list_staff)
run_test("GET /api/audit/ pharmacist allowed", test_list_pharmacist)


# ── GET retrieve ──

def test_retrieve():
    log = _temp_log(action='test_retrieve', user=_user('staff'))
    code, data = call_retrieve(_user('admin'), log.id)
    assert code == 200
    assert data['id'] == log.id
    assert data['action'] == 'test_retrieve'


def test_retrieve_invalid_id():
    code, _ = call_retrieve(_user('admin'), 999999999)
    assert code == 404


run_test("GET /api/audit/<id>/ admin allowed", test_retrieve)
run_test("GET /api/audit/<invalid id>/ returns 404", test_retrieve_invalid_id)


# ── Permissions ──

def test_permission_customer_denied_list():
    _temp_log(action='test_perm_customer_list', user=_user('staff'))
    code, _ = call_list(_user('customer'))
    assert code == 403


def test_permission_anonymous_denied_list():
    code, _ = call_list(anon_req())
    assert code == 401


def test_permission_customer_denied_retrieve():
    log = _temp_log(action='test_perm_customer_detail', user=_user('staff'))
    code, _ = call_retrieve(_user('customer'), log.id)
    assert code == 403


def test_permission_anonymous_denied_retrieve():
    log = _temp_log(action='test_perm_anon_detail', user=_user('staff'))
    code, _ = call_retrieve(anon_req(), log.id)
    assert code == 401


run_test("customer denied GET list (403)", test_permission_customer_denied_list)
run_test("anonymous denied GET list (401)", test_permission_anonymous_denied_list)
run_test("customer denied GET retrieve (403)", test_permission_customer_denied_retrieve)
run_test("anonymous denied GET retrieve (401)", test_permission_anonymous_denied_retrieve)


# ── Filtering ──

def test_filter_by_action():
    _temp_log(action='test_filter_special', user=_user('staff'))
    _temp_log(action='test_filter_other', user=_user('staff'))
    from audit.views import AuditLogListView
    import json
    from rest_framework.test import APIRequestFactory, force_authenticate
    factory = APIRequestFactory()
    req = factory.get('/api/audit/?action=filter_special')
    force_authenticate(req, user=_user('admin'))
    resp = AuditLogListView.as_view()(req)
    resp.render()
    actions = [r['action'] for r in json.loads(resp.content)]
    assert 'test_filter_special' in actions
    assert 'test_filter_other' not in actions


def test_filter_by_user():
    a = _user('staff')
    b = _get_or_create('__test_audit_filter_b', role='staff', is_active=True)
    _temp_log(action='test_filter_user_a', user=a)
    _temp_log(action='test_filter_user_b', user=b)
    from audit.views import AuditLogListView
    import json
    from rest_framework.test import APIRequestFactory, force_authenticate
    factory = APIRequestFactory()
    req = factory.get(f'/api/audit/?user={a.id}')
    force_authenticate(req, user=_user('admin'))
    resp = AuditLogListView.as_view()(req)
    resp.render()
    actions = [r['action'] for r in json.loads(resp.content)]
    assert 'test_filter_user_a' in actions
    assert 'test_filter_user_b' not in actions


run_test("filter by action", test_filter_by_action)
run_test("filter by user", test_filter_by_user)


# ── Audit creation helper ──

def test_create_audit_log_basic():
    u = _user('staff')
    log = create_audit_log(action='service_basic', details={'a': 1}, user=u)
    cleanup_logs.append(log.id)
    assert log.action == 'service_basic'
    assert log.details == {'a': 1}
    assert log.user_id == u.id


def test_create_audit_log_nullable():
    log = create_audit_log(action='service_nullable')
    cleanup_logs.append(log.id)
    assert log.user_id is None
    assert log.ip_address is None
    assert log.timestamp is not None


def test_create_audit_log_empty_action():
    assert create_audit_log(action='') is None


def test_create_audit_log_dedup():
    log1 = create_audit_log(action='service_dedup', details={'x': 1}, dedup_key='__test_dedup_key')
    cleanup_logs.append(log1.id)
    assert log1 is not None
    log2 = create_audit_log(action='service_dedup2', details={'x': 2}, dedup_key='__test_dedup_key')
    assert log2 is None


run_test("create_audit_log basic", test_create_audit_log_basic)
run_test("create_audit_log nullable fields", test_create_audit_log_nullable)
run_test("create_audit_log rejects empty action", test_create_audit_log_empty_action)
run_test("create_audit_log dedup prevents duplicates", test_create_audit_log_dedup)


# ── GET does not create logs / no unintended DB changes ──

def test_get_does_not_create_logs():
    before = AuditLog.objects.count()
    for _ in range(3):
        call_list(_user('admin'))
    after = AuditLog.objects.count()
    assert after == before, "GET requests created audit logs"


def test_no_unintended_db_changes():
    non_test_ids = AuditLog.objects.exclude(id__in=cleanup_logs).values_list('id', flat=True)
    snapshot = list(
        AuditLog.objects.filter(id__in=non_test_ids).order_by('id').values_list('id', 'action', 'details')
    )
    _temp_log(action='test_unchanged', user=_user('staff'))
    call_list(_user('admin'))
    non_test_ids = AuditLog.objects.exclude(id__in=cleanup_logs).values_list('id', flat=True)
    now_rows = list(
        AuditLog.objects.filter(id__in=non_test_ids).order_by('id').values_list('id', 'action', 'details')
    )
    assert snapshot == now_rows, "pre-existing audit rows changed"


run_test("GET endpoints do not create audit logs", test_get_does_not_create_logs)
run_test("no unintended DB changes during tests", test_no_unintended_db_changes)


# ── Cleanup ──
AuditLog.objects.filter(id__in=cleanup_logs).delete()
User.objects.filter(id__in=cleanup_users).delete()

final_count = AuditLog.objects.count()
final_snapshot = list(
    AuditLog.objects.order_by('id').values_list('id', 'action', 'details')
)
print(f"\n  Temp audit records cleaned up. Remaining audit rows: {final_count}")

if final_count != BASELINE_COUNT:
    failed += 1
    errors.append(("Cleanup", "Audit count differs from baseline",
                   f"baseline={BASELINE_COUNT} final={final_count}"))
    print(f"  FAIL  Cleanup: count {final_count} != baseline {BASELINE_COUNT}")
elif final_snapshot != BASELINE_SNAPSHOT:
    failed += 1
    errors.append(("Cleanup", "Existing audit rows changed",
                   f"baseline snapshot != final snapshot"))
    print("  FAIL  Cleanup: existing audit rows changed")
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
