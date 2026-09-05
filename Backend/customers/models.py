from django.db import models


class Customer(models.Model):
    id = models.BigAutoField(primary_key=True)
    name = models.CharField(max_length=255)
    phone = models.CharField(unique=True, max_length=20)
    email = models.CharField(max_length=254)
    address = models.TextField()
    loyalty_points = models.IntegerField()
    created_at = models.DateTimeField()
    date_of_birth = models.DateField(null=True, blank=True)
    member_since = models.DateField(null=True, blank=True)
    membership_tier = models.CharField(max_length=20)
    notes = models.TextField(blank=True, default='')

    class Meta:
        managed = True
        db_table = 'customers_customer'
