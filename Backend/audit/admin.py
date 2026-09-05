from django.contrib import admin

from audit.models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('id', 'action', 'user', 'timestamp', 'ip_address')
    list_filter = ('action',)
    readonly_fields = ('id', 'user', 'action', 'details', 'ip_address', 'timestamp')
    search_fields = ('action',)
