from rest_framework.permissions import BasePermission

CRM_ALLOWED_ROLES = {'admin', 'pharmacist', 'staff'}


class IsCrmStaff(BasePermission):
    """Allow pharmacy staff/admin only. Customers (role='customer') are blocked."""

    def has_permission(self, request, view):
        user = getattr(request, 'user', None)
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        return str(user.role).lower() in CRM_ALLOWED_ROLES
