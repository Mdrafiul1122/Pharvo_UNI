"""
Drug Interaction — Test Suite

Tests the interaction-check endpoint against the live PostgreSQL DB.
Uses existing interaction records (no new records added).
Database baseline must remain unchanged.
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

from django.test import RequestFactory
from rest_framework.test import APIRequestFactory, force_authenticate

from accounts.models import User
from inventory.models import DrugInteraction, InventoryProduct
from inventory.views import InteractionCheckView, InteractionListView

factory = APIRequestFactory()
passed = 0
failed = 0
errors = []
cleanup_users = []
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


def call_check(user, data):
    req = factory.post('/api/interactions/check/', data=json.dumps(data), content_type='application/json')
    if user:
        force_authenticate(req, user=user)
    else:
        class Anon:
            is_authenticated = False
        req.user = Anon()
    return InteractionCheckView.as_view()(req)


def call_list(user):
    req = factory.get('/api/interactions/')
    if user:
        force_authenticate(req, user=user)
    else:
        class Anon:
            is_authenticated = False
        req.user = Anon()
    return InteractionListView.as_view()(req)


def _get_or_create(username, **kwargs):
    if username not in _user_cache:
        user, created = User.objects.get_or_create(username=username, defaults=kwargs)
        if created:
            user.set_password('testpass123')
            user.save()
            cleanup_users.append(user.id)
        _user_cache[username] = user
    return _user_cache[username]


def _staff():
    for role in ['admin', 'pharmacist', 'staff']:
        u = User.objects.filter(role=role, is_active=True).first()
        if u:
            return u
    return _get_or_create('__test_di_staff', role='staff', is_active=True)


def _customer():
    u = User.objects.filter(role='customer', is_active=True).first()
    if u:
        return u
    return _get_or_create('__test_di_customer', role='customer', is_active=True)


# Find known product IDs that map to interaction drugs
def _product_id(fragment):
    p = InventoryProduct.objects.filter(name__icontains=fragment).first()
    if not p:
        raise AssertionError(f"No product matching '{fragment}' found in DB")
    return p.id, p.name


print("\n" + "=" * 60)
print("  DRUG INTERACTION — TEST SUITE")
print("=" * 60 + "\n")


# ── Model/Serializer Tests ──

def test_model_maps_to_table():
    assert DrugInteraction._meta.db_table == 'inventory_druginteraction'

run_test("DrugInteraction maps to inventory_druginteraction", test_model_maps_to_table)


def test_model_managed_false():
    assert not DrugInteraction._meta.managed

run_test("DrugInteraction managed=False", test_model_managed_false)


def test_model_fields():
    fields = [f.name for f in DrugInteraction._meta.get_fields()]
    for f in ['id', 'drug_a', 'drug_b', 'interaction_level', 'description', 'is_active', 'pair_key', 'created_at', 'updated_at']:
        assert f in fields, f"Missing field: {f}"

run_test("DrugInteraction has all DB columns", test_model_fields)


def test_model_has_no_fk():
    fks = [f for f in DrugInteraction._meta.get_fields() if getattr(f, 'many_to_one', False) or getattr(f, 'one_to_one', False)]
    assert len(fks) == 0, f"Unexpected FKs: {fks}"

run_test("DrugInteraction has no invented FK relationships", test_model_has_no_fk)


# ── Endpoint Tests ──

def test_list_interactions_200():
    resp = call_list(_staff())
    assert resp.status_code == 200
    assert isinstance(resp.data, list)
    assert len(resp.data) > 0, "No interaction records in DB"

run_test("GET /interactions/ returns 200 + records", test_list_interactions_200)


def test_list_interaction_fields():
    resp = call_list(_staff())
    first = resp.data[0]
    for f in ['id', 'drug_a', 'drug_b', 'interaction_level', 'description', 'is_active']:
        assert f in first, f"Missing field {f} in response"

run_test("GET /interactions/ returns correct fields", test_list_interaction_fields)


# Valid interaction found: Warfarin(51) + Aspirin(12) -> high_risk
def test_valid_interaction_found():
    warfarin_id, _ = _product_id('Warfarin')
    aspirin_id, _ = _product_id('Aspirin')
    resp = call_check(_staff(), {'product_ids': [warfarin_id, aspirin_id]})
    assert resp.status_code == 200
    data = resp.data
    assert len(data['interactions']) == 1, f"Expected 1 interaction, got {len(data['interactions'])}"
    inter = data['interactions'][0]['interactions'][0]
    assert inter['interaction_level'] == 'high_risk', f"Expected high_risk, got {inter['interaction_level']}"
    assert 'Warfarin' in inter['drug_a'] or 'Warfarin' in inter['drug_b']
    assert 'Aspirin' in inter['drug_a'] or 'Aspirin' in inter['drug_b']

run_test("Valid interaction (Warfarin + Aspirin) found -> high_risk", test_valid_interaction_found)


def test_known_high_risk_in_db():
    # Verify the high-risk record exists in DB
    hr = DrugInteraction.objects.filter(interaction_level='high_risk', is_active=True)
    assert hr.count() > 0, "No high_risk interaction records in DB"
    # Warfarin+Aspirin should be high_risk
    wa = DrugInteraction.objects.filter(
        is_active=True,
        drug_a__iexact='Warfarin',
        drug_b__iexact='Aspirin',
    )
    assert wa.exists() or DrugInteraction.objects.filter(
        is_active=True,
        drug_a__iexact='Aspirin',
        drug_b__iexact='Warfarin',
    ).exists(), "Warfarin+Aspirin high_risk record expected in DB"

run_test("Known high-risk interaction present in DB", test_known_high_risk_in_db)


def test_no_matching_interaction():
    # Two products with no known interaction (e.g. Aspirin + Simvastatin -> no record)
    aspirin_id, _ = _product_id('Aspirin')
    simvastatin_id, _ = _product_id('Simvastatin')
    resp = call_check(_staff(), {'product_ids': [aspirin_id, simvastatin_id]})
    assert resp.status_code == 200
    data = resp.data
    assert data['interactions'] == [], f"Expected no interactions, got {data['interactions']}"
    assert 'No interaction' in data['message']

run_test("No matching interaction (Aspirin + Simvastatin)", test_no_matching_interaction)


def test_single_medicine():
    warfarin_id, _ = _product_id('Warfarin')
    resp = call_check(_staff(), {'product_ids': [warfarin_id]})
    assert resp.status_code == 200
    data = resp.data
    assert data['interactions'] == []
    assert 'Two or more' in data['message']

run_test("Single medicine -> no interactions", test_single_medicine)


def test_empty_input():
    resp = call_check(_staff(), {'product_ids': []})
    assert resp.status_code == 400

run_test("Empty product_ids -> 400", test_empty_input)


def test_missing_key():
    resp = call_check(_staff(), {})
    assert resp.status_code == 400

run_test("Missing product_ids key -> 400", test_missing_key)


def test_invalid_product():
    max_id = (InventoryProduct.objects.order_by('-id').first().id if InventoryProduct.objects.exists() else 0)
    resp = call_check(_staff(), {'product_ids': [999999, max_id + 1]})
    assert resp.status_code == 400
    assert 'Invalid product' in str(resp.data)

run_test("Invalid product IDs -> 400", test_invalid_product)


def test_duplicate_product():
    warfarin_id, _ = _product_id('Warfarin')
    resp = call_check(_staff(), {'product_ids': [warfarin_id, warfarin_id]})
    assert resp.status_code == 400
    assert 'Duplicate' in str(resp.data)

run_test("Duplicate product input -> 400", test_duplicate_product)


def test_response_structure():
    warfarin_id, warfarin_name = _product_id('Warfarin')
    aspirin_id, aspirin_name = _product_id('Aspirin')
    resp = call_check(_staff(), {'product_ids': [warfarin_id, aspirin_id]})
    data = resp.data
    assert 'interactions' in data
    assert 'message' in data
    inter_block = data['interactions'][0]
    for f in ['product_a_id', 'product_a_name', 'product_b_id', 'product_b_name', 'interactions']:
        assert f in inter_block, f"Missing field {f}"
    nested = inter_block['interactions'][0]
    for f in ['drug_a', 'drug_b', 'interaction_level', 'description']:
        assert f in nested

run_test("Response structure correct", test_response_structure)


# ── Permissions ──

def test_customer_denied_check():
    resp = call_check(_customer(), {'product_ids': [12, 51]})
    assert resp.status_code == 403

run_test("Customer role denied check", test_customer_denied_check)


def test_customer_denied_list():
    resp = call_list(_customer())
    assert resp.status_code == 403

run_test("Customer role denied list", test_customer_denied_list)


def test_unauthenticated_denied_check():
    resp = call_check(None, {'product_ids': [12, 51]})
    assert resp.status_code == 401

run_test("Unauthenticated denied check", test_unauthenticated_denied_check)


def test_unauthenticated_denied_list():
    resp = call_list(None)
    assert resp.status_code == 401

run_test("Unauthenticated denied list", test_unauthenticated_denied_list)


# ── DB Unchanged ──

def test_db_unchanged():
    from django.db import connection
    cursor = connection.cursor()
    cursor.execute("SELECT COUNT(*) FROM inventory_druginteraction")
    count = cursor.fetchone()[0]
    assert count == 15, f"Expected 15 interaction records, got {count}"

run_test("DB interaction count unchanged (15)", test_db_unchanged)


# ── Cleanup ──
User.objects.filter(id__in=cleanup_users).delete()
print("\n  Temp users cleaned up.")

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
