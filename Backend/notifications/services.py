from datetime import date, timedelta

from django.db.models import F, Q

from .models import Notification


def _make_dedup_key(notification_type, product_id, extra=''):
    parts = [notification_type, str(product_id)]
    if extra:
        parts.append(extra)
    return ':'.join(parts)


def _dedup_exists(dedup_key):
    """The notifications_notification.dedup_key column has a UNIQUE index in
    PostgreSQL, so a key can only ever exist once. Return True if it is already
    in use regardless of read status."""
    if not dedup_key:
        return False
    return Notification.objects.filter(dedup_key=dedup_key).exists()


def _generate_unique_dedup_key():
    import random
    import time
    return f'general:{int(time.time())}:{random.randint(0, 10**9)}'


def create_notification(notification_type, title, message, severity='info',
                        product=None, dedup_key=''):
    if not dedup_key:
        dedup_key = _generate_unique_dedup_key()
    if _dedup_exists(dedup_key):
        return None
    return Notification.objects.create(
        type=notification_type,
        title=title,
        message=message,
        severity=severity,
        product=product,
        dedup_key=dedup_key,
    )


def generate_low_stock_notifications():
    from inventory.models import InventoryProduct
    products = InventoryProduct.objects.filter(is_active=True).filter(
        stock_quantity__lt=F('reorder_level')
    )
    created = []
    for product in products:
        key = _make_dedup_key('low_stock', product.id)
        notif = create_notification(
            notification_type='low_stock',
            title=f'Low Stock: {product.name}',
            message=f'{product.name} stock is {product.stock_quantity} (reorder level: {product.reorder_level}).',
            severity='warning',
            product=product,
            dedup_key=key,
        )
        if notif:
            created.append(notif)
    return created


def generate_expiry_notifications():
    from inventory.models import InventoryProduct
    today = date.today()
    near_expiry_date = today + timedelta(days=30)

    expired = InventoryProduct.objects.filter(
        is_active=True, expiry_date__lt=today
    )
    created = []
    for product in expired:
        key = _make_dedup_key('expiry', product.id)
        notif = create_notification(
            notification_type='expiry',
            title=f'Expired: {product.name}',
            message=f'{product.name} expired on {product.expiry_date}.',
            severity='critical',
            product=product,
            dedup_key=key,
        )
        if notif:
            created.append(notif)

    near_expiry = InventoryProduct.objects.filter(
        is_active=True,
        expiry_date__gte=today,
        expiry_date__lte=near_expiry_date,
    )
    for product in near_expiry:
        key = _make_dedup_key('near_expiry', product.id)
        notif = create_notification(
            notification_type='near_expiry',
            title=f'Near Expiry: {product.name}',
            message=f'{product.name} expires on {product.expiry_date}.',
            severity='warning',
            product=product,
            dedup_key=key,
        )
        if notif:
            created.append(notif)

    return created
