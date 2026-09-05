"""
CRM Discount Service

Determines whether a customer qualifies for an automatic CRM discount
at POS checkout based on:
  1. CRM Reminder records (customer-medicine recommendations)
  2. Purchase history via SaleItem (eligible amount > 100 BDT threshold)

CRM recommendations are stored in the crm_reminder table. An active
reminder (is_active=True) linking a customer to a product means that
product is "recommended" for that customer.

The automatic discount percentage is derived from the customer's CRM
membership tier (customers_customer.membership_tier) via
CRM_TIER_DISCOUNT_RATES. It is not hardcoded into the calculation.
"""

from decimal import Decimal, ROUND_HALF_UP

CENT = Decimal('0.01')

# ---------------------------------------------------------------------------
# CONFIGURATION
# ---------------------------------------------------------------------------
# Minimum eligible amount (in BDT) a customer must have spent on a medicine
# before they qualify for a CRM discount on that medicine.
# 100 BDT exactly = NOT eligible. 101 BDT or more = eligible.
ELIGIBLE_AMOUNT_THRESHOLD = Decimal('100.00')

# CRM auto-discount percentage per membership tier (Customer.membership_tier).
# These tiers mirror the existing CRM tier system:
#   membership_tier  ->  CRM tier  ->  auto discount
#   'bronze'         ->  Basic      ->  0%
#   'silver'         ->  Regular    ->  5%
#   'gold'           ->  Premium    ->  10%
#   anything else    ->  Basic      ->  0%   (same fallback as the CRM UI)
# The discount percentage is not hardcoded in the calculation; it is looked
# up from the customer's tier via CRM_TIER_DISCOUNT_RATES. Values are Decimal
# fractions (0.05 == 5%).
CRM_TIER_DISCOUNT_RATES = {
    'bronze': Decimal('0'),      # Basic tier: no automatic discount
    'silver': Decimal('0.05'),   # Regular tier: 5%
    'gold': Decimal('0.10'),     # Premium tier: 10%
}
DEFAULT_CRM_DISCOUNT_RATE = Decimal('0')


def _tier_discount_rate(customer):
    """Return the CRM auto-discount rate for the customer's membership tier.

    Returns a Decimal fraction (0.05 == 5%). Unknown tiers, or a missing
    customer, fall back to a 0% rate (no automatic discount), matching the
    CRM UI's fallback to the Basic tier.
    """
    if customer is None:
        return DEFAULT_CRM_DISCOUNT_RATE
    tier = (customer.membership_tier or '').strip().lower()
    return CRM_TIER_DISCOUNT_RATES.get(tier, DEFAULT_CRM_DISCOUNT_RATE)


def _money(value):
    return Decimal(str(value)).quantize(CENT, rounding=ROUND_HALF_UP)


def _customer_has_crm_recommendation(customer_id, product_id):
    """Check if the customer has an active CRM recommendation for this product.

    A CRM recommendation is an active Reminder record linking this customer
    to this product. The crm_reminder table is the CRM recommendation source.
    """
    from crm.models import Reminder
    return Reminder.objects.filter(
        customer_id=customer_id,
        product_id=product_id,
        is_active=True,
    ).exists()


def _customer_eligible_amount(customer_id, product_id):
    """Calculate total amount the customer has previously spent on this product.

    Uses SaleItem subtotal aggregated across all sales for this customer
    and product combination. Only counts sales where the customer is linked.
    """
    from django.db.models import Sum
    from sales.models import SaleItem

    result = SaleItem.objects.filter(
        sale__customer_id=customer_id,
        product_id=product_id,
    ).aggregate(total=Sum('subtotal'))
    return _money(result['total'] or 0)


def calculate_crm_discount(customer, items):
    """Calculate automatic CRM discount for a POS checkout.

    Args:
        customer: Customer instance or None
        items: list of dicts, each with at least:
            - 'product': InventoryProduct instance (with .pk)
            - 'quantity': int
            - 'unit_price': Decimal

    Returns:
        dict with keys:
            - 'crm_discount': Decimal (total automatic CRM discount)
            - 'breakdown': list of per-item CRM discount info (for response)
            - 'eligible': bool (whether any item qualified)
            - 'rate': str (decimal fraction rate applied, e.g. '0.05' for 5%)

    Eligibility per item:
        1. Customer must not be None
        2. Active CRM Reminder must exist for this customer+product
        3. Customer's total previous spending on this product must be > 100 BDT
        4. If eligible, discount = item_subtotal * tier_discount_rate

    No discount is applied if:
        - No customer selected
        - No active CRM Reminder for this customer+product
        - Previous spending <= 100 BDT
        - The customer's tier discount rate is 0
    """
    if customer is None:
        return {
            'crm_discount': Decimal('0'),
            'breakdown': [],
            'eligible': False,
            'rate': str(DEFAULT_CRM_DISCOUNT_RATE),
        }

    rate = _tier_discount_rate(customer)
    total_crm_discount = Decimal('0')
    breakdown = []

    for item in items:
        product = item['product']
        quantity = item['quantity']
        unit_price = _money(item['unit_price'])
        item_subtotal = _money(quantity * unit_price)

        has_recommendation = _customer_has_crm_recommendation(customer.pk, product.pk)
        eligible_amount = _customer_eligible_amount(customer.pk, product.pk)

        item_discount = Decimal('0')
        is_item_eligible = False

        if has_recommendation and eligible_amount > ELIGIBLE_AMOUNT_THRESHOLD:
            is_item_eligible = True
            if rate > 0:
                item_discount = _money(item_subtotal * rate)
                total_crm_discount += item_discount

        breakdown.append({
            'product_id': product.pk,
            'product_name': product.name,
            'has_crm_recommendation': has_recommendation,
            'eligible_amount': str(eligible_amount),
            'is_eligible': is_item_eligible,
            'item_subtotal': str(item_subtotal),
            'item_discount': str(item_discount),
        })

    return {
        'crm_discount': _money(total_crm_discount),
        'breakdown': breakdown,
        'eligible': any(b['is_eligible'] for b in breakdown),
        'rate': str(rate),
    }
