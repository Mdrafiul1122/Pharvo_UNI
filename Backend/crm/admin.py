from django.contrib import admin

from crm.models import CrmPermission, Reminder


@admin.register(Reminder)
class ReminderAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'customer', 'product', 'reminder_time', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('title',)


@admin.register(CrmPermission)
class CrmPermissionAdmin(admin.ModelAdmin):
    list_display = ('id', 'customer_id', 'medicine_id', 'is_allowed', 'updated_at')
    list_filter = ('is_allowed',)
