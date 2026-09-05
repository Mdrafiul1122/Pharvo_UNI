from django.conf import settings
from django.db import models


class Reminder(models.Model):
    id = models.BigAutoField(primary_key=True)
    title = models.CharField(max_length=255)
    reminder_time = models.DateTimeField()
    is_active = models.BooleanField()
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    customer = models.ForeignKey(
        'customers.Customer',
        models.DO_NOTHING,
        db_column='customer_id',
        related_name='reminders',
    )
    product = models.ForeignKey(
        'inventory.InventoryProduct',
        models.DO_NOTHING,
        db_column='product_id',
        related_name='reminders',
    )

    class Meta:
        managed = True
        db_table = 'crm_reminder'


class CrmPermission(models.Model):
    id = models.AutoField(primary_key=True)
    customer_id = models.IntegerField()
    medicine_id = models.IntegerField()
    is_allowed = models.BooleanField(default=False)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        models.DO_NOTHING,
        db_column='updated_by_id',
        null=True,
        blank=True,
        related_name='crm_permissions',
    )
    updated_at = models.DateTimeField()
    notes = models.TextField(blank=True, null=True, default='')

    class Meta:
        managed = True
        db_table = 'crm_crmpermission'
