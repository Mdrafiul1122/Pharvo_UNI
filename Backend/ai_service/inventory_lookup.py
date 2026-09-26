from django.db.models import Q
from django.utils import timezone

from inventory.models import InventoryProduct


def find_available_medicines(candidate_generics, limit_per_generic=10):
    today = timezone.localdate()

    results = []

    for generic in candidate_generics:
        products = (
            InventoryProduct.objects
            .filter(
                Q(name__icontains=generic)
                | Q(brand__icontains=generic)
                | Q(description__icontains=generic),
                is_active=True,
                stock_quantity__gt=0,
            )
            .filter(
                Q(expiry_date__isnull=True)
                | Q(expiry_date__gte=today)
            )
            .select_related("supplier")
            .order_by("expiry_date", "name")[:limit_per_generic]
        )

        matches = []

        for product in products:
            matches.append({
                "product_id": product.id,
                "product_name": product.name,
                "brand_name": product.brand,
                "supplier": (
                    product.supplier.name
                    if product.supplier
                    else None
                ),
                "current_stock": product.stock_quantity,
                "reorder_level": product.reorder_level,
                "expiry_date": (
                    product.expiry_date.isoformat()
                    if product.expiry_date
                    else None
                ),
                "unit_price": str(product.unit_price),
                "strip_price": (
                    str(product.strip_price)
                    if product.strip_price is not None
                    else None
                ),
                "box_price": (
                    str(product.box_price)
                    if product.box_price is not None
                    else None
                ),
            })

        results.append({
            "candidate_generic": generic,
            "available_medicines": matches,
        })

    return results
