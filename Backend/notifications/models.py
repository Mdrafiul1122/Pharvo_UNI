from django.db import models
from django.conf import settings


class Notification(models.Model):
    TYPE_CHOICES = [
        ('low_stock', 'Low Stock'),
        ('expiry', 'Expiry'),
        ('near_expiry', 'Near Expiry'),
        ('general', 'General'),
    ]
    SEVERITY_CHOICES = [
        ('info', 'Info'),
        ('warning', 'Warning'),
        ('critical', 'Critical'),
    ]

    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    title = models.CharField(max_length=255)
    message = models.TextField()
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES, default='info')
    is_read = models.BooleanField(default=False)
    dedup_key = models.CharField(max_length=255, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    product = models.ForeignKey(
        'inventory.InventoryProduct',
        on_delete=models.DO_NOTHING,
        null=True,
        blank=True,
        related_name='notifications',
    )

    class Meta:
        managed = True
        db_table = 'notifications_notification'
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.severity}] {self.title}"
