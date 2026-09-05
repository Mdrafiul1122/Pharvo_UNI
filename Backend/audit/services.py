from django.utils import timezone

from audit.models import AuditLog


def create_audit_log(action, details=None, user=None, ip_address=None,
                     timestamp=None, dedup_key=None):
    """Create a single audit log row using only existing DB columns.

    Safe against:
      - nullable fields (user, ip_address, timestamp are optional)
      - accidental duplicate creation when a dedup_key is provided (the key is
        stored inside the jsonb details and checked before insert)
      - GET-triggered logging (this helper only creates when explicitly called)
    """
    if not action:
        return None

    details = dict(details) if details else {}

    if dedup_key:
        if _dedup_exists(dedup_key):
            return None
        details['_dedup_key'] = dedup_key

    return AuditLog.objects.create(
        action=action,
        details=details,
        user=user if user and getattr(user, 'pk', None) else None,
        ip_address=ip_address or None,
        timestamp=timestamp or timezone.now(),
    )


def _dedup_exists(dedup_key):
    from django.db.models import Q
    return AuditLog.objects.filter(
        details__contains={'_dedup_key': dedup_key}
    ).exists()
