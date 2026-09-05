"""
CRM Reminder Backend Test Suite

Runs against the real PostgreSQL database.
Creates temporary test data and cleans up afterward.
Database baseline MUST remain unchanged.
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from django.utils import timezone
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import User
from customers.models import Customer
from inventory.models import InventoryProduct
from crm.models import Reminder, CrmPermission


class CrmReminderApiTest(TestCase):
    """Test CRM Reminder CRUD endpoints."""

    databases = '__all__'

    @classmethod
    def setUpTestData(cls):
        cls.admin_user = User.objects.create_user(
            username='crm_test_admin',
            password='testpass123',
            role='admin',
            is_staff=True,
            is_active=True,
        )
        cls.staff_user = User.objects.create_user(
            username='crm_test_staff',
            password='testpass123',
            role='staff',
            is_active=True,
        )
        cls.customer_user = User.objects.create_user(
            username='crm_test_customer',
            password='testpass123',
            role='customer',
            is_active=True,
        )
        cls.customer = Customer.objects.create(
            name='CRM Test Customer',
            phone='+63912345678',
            email='crm_test@example.com',
            address='123 Test St',
            loyalty_points=0,
            created_at=timezone.now(),
            membership_tier='regular',
        )
        cls.product = InventoryProduct.objects.create(
            name='CRM Test Product',
            brand='TestBrand',
            barcode='CRM-TEST-001',
            unit_price=100.00,
            cost_price=80.00,
            stock_quantity=50,
            reorder_level=10,
            is_active=True,
            description='Test product for CRM',
            created_at=timezone.now(),
            updated_at=timezone.now(),
            is_sensitive=False,
        )

    def _create_reminder(self, **overrides):
        data = {
            'title': 'Take Medicine',
            'reminder_time': (timezone.now() + timezone.timedelta(hours=1)).isoformat(),
            'customer': self.customer.pk,
            'product': self.product.pk,
            'is_active': True,
        }
        data.update(overrides)
        return self.client.post('/api/crm/reminders/', data, format='json')

    def setUp(self):
        self.admin_client = APIClient()
        self.admin_client.force_authenticate(user=self.admin_user)
        self.staff_client = APIClient()
        self.staff_client.force_authenticate(user=self.staff_user)
        self.customer_client = APIClient()
        self.customer_client.force_authenticate(user=self.customer_user)
        self.unauth_client = APIClient()

    def tearDown(self):
        Reminder.objects.filter(
            title__startswith='CRM Test'
        ).delete()

    # --- List ---
    def test_list_reminders_admin(self):
        self._create_reminder(title='CRM Test List 1')
        self._create_reminder(title='CRM Test List 2')
        resp = self.admin_client.get('/api/crm/reminders/')
        self.assertEqual(resp.status_code, 200)
        self.assertIsInstance(resp.data, list)
        titles = [r['title'] for r in resp.data]
        self.assertIn('CRM Test List 1', titles)
        self.assertIn('CRM Test List 2', titles)

    def test_list_reminders_staff(self):
        self._create_reminder(title='CRM Test Staff List')
        resp = self.staff_client.get('/api/crm/reminders/')
        self.assertEqual(resp.status_code, 200)

    # --- Create ---
    def test_create_reminder(self):
        resp = self._create_reminder(title='CRM Test Create')
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data['title'], 'CRM Test Create')
        self.assertTrue(resp.data['is_active'])
        self.assertEqual(resp.data['customer']['id'], self.customer.pk)
        self.assertEqual(resp.data['product']['id'], self.product.pk)
        self.assertIn('id', resp.data)
        self.assertIn('created_at', resp.data)
        self.assertIn('updated_at', resp.data)

    # --- Retrieve ---
    def test_retrieve_reminder(self):
        create_resp = self._create_reminder(title='CRM Test Retrieve')
        rid = create_resp.data['id']
        resp = self.admin_client.get(f'/api/crm/reminders/{rid}/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['id'], rid)
        self.assertEqual(resp.data['title'], 'CRM Test Retrieve')

    # --- Update (PUT) ---
    def test_update_reminder(self):
        create_resp = self._create_reminder(title='CRM Test Update Before')
        rid = create_resp.data['id']
        data = {
            'title': 'CRM Test Update After',
            'reminder_time': (timezone.now() + timezone.timedelta(hours=2)).isoformat(),
            'customer': self.customer.pk,
            'product': self.product.pk,
            'is_active': True,
        }
        resp = self.admin_client.put(f'/api/crm/reminders/{rid}/', data, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['title'], 'CRM Test Update After')

    # --- Partial Update (PATCH) ---
    def test_partial_update_reminder(self):
        create_resp = self._create_reminder(title='CRM Test Patch Before')
        rid = create_resp.data['id']
        resp = self.admin_client.patch(
            f'/api/crm/reminders/{rid}/',
            {'title': 'CRM Test Patch After'},
            format='json',
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['title'], 'CRM Test Patch After')

    # --- Deactivate ---
    def test_deactivate_reminder(self):
        create_resp = self._create_reminder(title='CRM Test Deactivate', is_active=True)
        rid = create_resp.data['id']
        resp = self.admin_client.patch(
            f'/api/crm/reminders/{rid}/',
            {'is_active': False},
            format='json',
        )
        self.assertEqual(resp.status_code, 200)
        self.assertFalse(resp.data['is_active'])

    # --- Delete ---
    def test_delete_reminder(self):
        create_resp = self._create_reminder(title='CRM Test Delete')
        rid = create_resp.data['id']
        resp = self.admin_client.delete(f'/api/crm/reminders/{rid}/')
        self.assertEqual(resp.status_code, 204)
        self.assertFalse(Reminder.objects.filter(pk=rid).exists())

    # --- Customer-specific endpoint ---
    def test_customer_reminders(self):
        other_customer = Customer.objects.create(
            name='CRM Test Other',
            phone='+63999999999',
            email='other_test@example.com',
            address='456 Other St',
            loyalty_points=0,
            created_at=timezone.now(),
            membership_tier='regular',
        )
        self._create_reminder(title='CRM Test Cust1', customer=self.customer.pk)
        self._create_reminder(title='CRM Test Cust2', customer=other_customer.pk)
        resp = self.admin_client.get(f'/api/crm/customers/{self.customer.pk}/reminders/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data), 1)
        self.assertEqual(resp.data[0]['title'], 'CRM Test Cust1')

    # --- Validation: invalid customer ---
    def test_invalid_customer(self):
        data = {
            'title': 'CRM Test Bad Customer',
            'reminder_time': (timezone.now() + timezone.timedelta(hours=1)).isoformat(),
            'customer': 999999,
            'product': self.product.pk,
            'is_active': True,
        }
        resp = self.client.post('/api/crm/reminders/', data, format='json')
        self.assertEqual(resp.status_code, 400)

    # --- Validation: invalid product ---
    def test_invalid_product(self):
        data = {
            'title': 'CRM Test Bad Product',
            'reminder_time': (timezone.now() + timezone.timedelta(hours=1)).isoformat(),
            'customer': self.customer.pk,
            'product': 999999,
            'is_active': True,
        }
        resp = self.client.post('/api/crm/reminders/', data, format='json')
        self.assertEqual(resp.status_code, 400)

    # --- Validation: empty title ---
    def test_empty_title(self):
        data = {
            'title': '',
            'reminder_time': (timezone.now() + timezone.timedelta(hours=1)).isoformat(),
            'customer': self.customer.pk,
            'product': self.product.pk,
            'is_active': True,
        }
        resp = self.client.post('/api/crm/reminders/', data, format='json')
        self.assertEqual(resp.status_code, 400)

    # --- Validation: missing fields ---
    def test_missing_required_fields(self):
        resp = self.client.post('/api/crm/reminders/', {}, format='json')
        self.assertEqual(resp.status_code, 400)

    # --- Unauthorized access ---
    def test_unauthenticated_list(self):
        resp = self.unauth_client.get('/api/crm/reminders/')
        self.assertEqual(resp.status_code, 401)

    def test_unauthenticated_create(self):
        data = {
            'title': 'CRM Test Unauth',
            'reminder_time': (timezone.now() + timezone.timedelta(hours=1)).isoformat(),
            'customer': self.customer.pk,
            'product': self.product.pk,
            'is_active': True,
        }
        resp = self.unauth_client.post('/api/crm/reminders/', data, format='json')
        self.assertEqual(resp.status_code, 401)

    # --- Customer role blocked ---
    def test_customer_role_blocked_list(self):
        resp = self.customer_client.get('/api/crm/reminders/')
        self.assertEqual(resp.status_code, 403)

    def test_customer_role_blocked_create(self):
        data = {
            'title': 'CRM Test CustBlock',
            'reminder_time': (timezone.now() + timezone.timedelta(hours=1)).isoformat(),
            'customer': self.customer.pk,
            'product': self.product.pk,
            'is_active': True,
        }
        resp = self.customer_client.post('/api/crm/reminders/', data, format='json')
        self.assertEqual(resp.status_code, 403)

    # --- Retrieve non-existent ---
    def test_retrieve_nonexistent(self):
        resp = self.admin_client.get('/api/crm/reminders/999999/')
        self.assertEqual(resp.status_code, 404)

    # --- Response structure ---
    def test_reminder_response_fields(self):
        resp = self._create_reminder(title='CRM Test Fields')
        self.assertEqual(resp.status_code, 201)
        expected_fields = {'id', 'title', 'reminder_time', 'customer', 'product', 'is_active', 'created_at', 'updated_at'}
        self.assertEqual(set(resp.data.keys()), expected_fields)


class CrmPermissionModelTest(TestCase):
    """Test CrmPermission model mapping."""

    databases = '__all__'

    def test_model_maps_to_table(self):
        self.assertEqual(CrmPermission._meta.db_table, 'crm_crmpermission')

    def test_model_fields(self):
        field_names = [f.name for f in CrmPermission._meta.get_fields()]
        self.assertIn('customer_id', field_names)
        self.assertIn('medicine_id', field_names)
        self.assertIn('is_allowed', field_names)
        self.assertIn('updated_by', field_names)
        self.assertIn('notes', field_names)


class ReminderModelTest(TestCase):
    """Test Reminder model mapping."""

    databases = '__all__'

    def test_model_maps_to_table(self):
        self.assertEqual(Reminder._meta.db_table, 'crm_reminder')

    def test_model_managed_false(self):
        self.assertFalse(Reminder._meta.managed)

    def test_model_fields(self):
        field_names = [f.name for f in Reminder._meta.get_fields()]
        self.assertIn('customer', field_names)
        self.assertIn('product', field_names)
        self.assertIn('title', field_names)
        self.assertIn('reminder_time', field_names)
        self.assertIn('is_active', field_names)
