from django.conf import settings
from django.db import models


class AuditLog(models.Model):
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        models.DO_NOTHING,
        db_column='user_id',
        null=True,
        blank=True,
        related_name='audit_logs',
    )
    action = models.CharField(max_length=255)
    details = models.JSONField()
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    timestamp = models.DateTimeField()

    class Meta:
        managed = True
        db_table = 'audit_auditlog'
