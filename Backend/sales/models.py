from django.conf import settings
from django.db import models


class Sale(models.Model):
    id = models.BigAutoField(primary_key=True)
    invoice_number = models.CharField(unique=True, max_length=50)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    discount = models.DecimalField(max_digits=12, decimal_places=2)
    payable_amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_method = models.CharField(max_length=10)
    sale_date = models.DateField()
    created_at = models.DateTimeField()
    customer = models.ForeignKey(
        'customers.Customer',
        models.DO_NOTHING,
        null=True,
        blank=True,
        db_column='customer_id',
        related_name='sales',
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        models.DO_NOTHING,
        db_column='user_id',
        related_name='sales',
    )

    class Meta:
        managed = True
        db_table = 'sales_sale'


class SaleItem(models.Model):
    id = models.BigAutoField(primary_key=True)
    quantity = models.IntegerField()
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2)
    product = models.ForeignKey(
        'inventory.InventoryProduct',
        models.DO_NOTHING,
        db_column='product_id',
        related_name='sale_items',
    )
    sale = models.ForeignKey(
        Sale,
        models.DO_NOTHING,
        db_column='sale_id',
        related_name='items',
    )
    unit = models.CharField(max_length=10)
    quantity_pcs = models.IntegerField()

    class Meta:
        managed = True
        db_table = 'sales_saleitem'


class SalePayment(models.Model):
    id = models.BigAutoField(primary_key=True)
    method = models.CharField(max_length=10)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    created_at = models.DateTimeField()
    sale = models.ForeignKey(
        Sale,
        models.DO_NOTHING,
        db_column='sale_id',
        related_name='payments',
    )

    class Meta:
        managed = True
        db_table = 'sales_salepayment'