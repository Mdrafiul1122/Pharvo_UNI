from rest_framework.permissions import BasePermission

DASHBOARD_ALLOWED_ROLES = {'admin', 'pharmacist', 'staff'}


class IsDashboardStaff(BasePermission):
    """Allow pharmacy staff/admin only. Customers are blocked."""

    def has_permission(self, request, view):
        user = getattr(request, 'user', None)
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        return str(user.role).lower() in DASHBOARD_ALLOWED_ROLES
