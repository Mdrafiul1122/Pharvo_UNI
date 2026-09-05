from django.db import models


class InventoryCategory(models.Model):
    id = models.BigAutoField(primary_key=True)
    name = models.CharField(unique=True, max_length=255)
    description = models.TextField()

    class Meta:
        managed = True
        db_table = "inventory_category"


class InventorySupplier(models.Model):
    id = models.BigAutoField(primary_key=True)
    name = models.CharField(max_length=255)
    contact_person = models.CharField(max_length=255)
    phone = models.CharField(max_length=20)
    email = models.CharField(max_length=254)
    address = models.TextField()
    created_at = models.DateTimeField()
    is_active = models.BooleanField()

    class Meta:
        managed = True
        db_table = "inventory_supplier"


class DrugInteraction(models.Model):
    id = models.BigAutoField(primary_key=True)
    drug_a = models.CharField(max_length=255)
    drug_b = models.CharField(max_length=255)
    interaction_level = models.CharField(max_length=20)
    description = models.TextField()
    is_active = models.BooleanField()
    pair_key = models.CharField(unique=True, max_length=511)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()

    class Meta:
        managed = True
        db_table = "inventory_druginteraction"


class InventoryMedicineGroup(models.Model):
    id = models.BigAutoField(primary_key=True)
    name = models.CharField(unique=True, max_length=255)
    description = models.TextField()
    created_at = models.DateTimeField()

    class Meta:
        managed = True
        db_table = "inventory_medicinegroup"


class InventoryProduct(models.Model):
    id = models.BigAutoField(primary_key=True)
    name = models.CharField(max_length=255)
    brand = models.CharField(max_length=255)
    barcode = models.CharField(unique=True, max_length=100)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    cost_price = models.DecimalField(max_digits=10, decimal_places=2)
    stock_quantity = models.IntegerField()
    reorder_level = models.IntegerField()
    expiry_date = models.DateField(blank=True, null=True)
    is_active = models.BooleanField()
    description = models.TextField()
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    category = models.ForeignKey(
        InventoryCategory, models.DO_NOTHING, blank=True, null=True
    )
    supplier = models.ForeignKey(
        InventorySupplier, models.DO_NOTHING, blank=True, null=True
    )
    group = models.ForeignKey(
        InventoryMedicineGroup, models.DO_NOTHING, blank=True, null=True
    )
    is_sensitive = models.BooleanField()
    box_price = models.DecimalField(
        max_digits=10, decimal_places=2, blank=True, null=True
    )
    strip_price = models.DecimalField(
        max_digits=10, decimal_places=2, blank=True, null=True
    )
    pcs_per_box = models.IntegerField(blank=True, null=True)
    pcs_per_strip = models.IntegerField(blank=True, null=True)
    strips_per_box = models.IntegerField(blank=True, null=True)

    class Meta:
        managed = True
        db_table = "inventory_product"
