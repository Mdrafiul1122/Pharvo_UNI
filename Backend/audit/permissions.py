from rest_framework.permissions import BasePermission

AUDIT_ALLOWED_ROLES = {'admin', 'pharmacist', 'staff'}


class IsAuditStaff(BasePermission):
    """Allow pharmacy staff/admin only. Customers and anonymous users are denied."""

    def has_permission(self, request, view):
        user = getattr(request, 'user', None)
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        return str(user.role).lower() in AUDIT_ALLOWED_ROLES
