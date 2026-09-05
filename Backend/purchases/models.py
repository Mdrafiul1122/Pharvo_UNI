from django.conf import settings
from django.db import models


class Purchase(models.Model):
    id = models.BigAutoField(primary_key=True)
    invoice_number = models.CharField(unique=True, max_length=50)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    discount = models.DecimalField(max_digits=12, decimal_places=2)
    payable_amount = models.DecimalField(max_digits=12, decimal_places=2)
    purchase_date = models.DateField()
    created_at = models.DateTimeField()
    supplier = models.ForeignKey(
        'inventory.InventorySupplier',
        models.DO_NOTHING,
        db_column='supplier_id',
        related_name='purchases',
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        models.DO_NOTHING,
        db_column='user_id',
        related_name='purchases',
    )

    class Meta:
        managed = True
        db_table = 'purchases_purchase'


class PurchaseItem(models.Model):
    id = models.BigAutoField(primary_key=True)
    quantity = models.IntegerField()
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2)
    expiry_date = models.DateField(null=True, blank=True)
    manufactured_date = models.DateField(null=True, blank=True)
    product = models.ForeignKey(
        'inventory.InventoryProduct',
        models.DO_NOTHING,
        db_column='product_id',
        related_name='purchase_items',
    )
    purchase = models.ForeignKey(
        Purchase,
        models.DO_NOTHING,
        db_column='purchase_id',
        related_name='items',
    )

    class Meta:
        managed = True
        db_table = 'purchases_purchaseitem'