import secrets
from decimal import Decimal, ROUND_HALF_UP

from django.core.exceptions import ValidationError
from django.db import connection, models, transaction
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from inventory.models import InventoryProduct
from purchases.models import Purchase, PurchaseItem
from purchases.serializers import PurchaseCreateSerializer, PurchaseSerializer
from sales.permissions import IsPosStaff

CENT = Decimal('0.01')
PURCHASE_ADVISORY_LOCK = 466002


def _money(value):
    return Decimal(value).quantize(CENT, rounding=ROUND_HALF_UP)


def _next_pk(cursor, db_table):
    cursor.execute("SELECT COALESCE(MAX(id), 0) + 1 FROM %s" % db_table)
    return cursor.fetchone()[0]


def _generate_invoice_number(when, prefix):
    head = prefix + when.strftime('%Y%m%d%H%M%S-')
    while True:
        candidate = head + secrets.token_hex(2).upper()
        if not Purchase.objects.filter(invoice_number=candidate).exists():
            return candidate


def _create_purchase(user, data):
    items = data['items']
    discount = _money(data.get('discount', 0))
    supplier = data['supplier']

    with transaction.atomic():
        cursor = connection.cursor()
        cursor.execute('SELECT pg_advisory_xact_lock(%s)', [PURCHASE_ADVISORY_LOCK])

        purchase_id = _next_pk(cursor, 'purchases_purchase')
        item_id = _next_pk(cursor, 'purchases_purchaseitem')

        now = timezone.now()
        purchase_date = timezone.localdate()

        prepared_items = []
        grand_total = Decimal('0')

        for item in items:
            product = InventoryProduct.objects.select_for_update().get(pk=item['product'].pk)
            qty = item['quantity']
            price = _money(item['unit_price'])
            subtotal = _money(qty * price)
            grand_total += subtotal
            prepared_items.append((product, item, qty, price, subtotal))

        total_amount = _money(grand_total)
        payable_amount = _money(total_amount - discount)
        if payable_amount < 0:
            raise ValidationError('Discount exceeds total amount.')

        invoice_number = _generate_invoice_number(now, 'PUR-')

        purchase = Purchase.objects.create(
            id=purchase_id,
            invoice_number=invoice_number,
            total_amount=total_amount,
            discount=discount,
            payable_amount=payable_amount,
            purchase_date=purchase_date,
            created_at=now,
            supplier=supplier,
            user=user,
        )

        for product, item, qty, price, subtotal in prepared_items:
            PurchaseItem.objects.create(
                id=item_id,
                purchase=purchase,
                product=product,
                quantity=qty,
                unit_price=price,
                subtotal=subtotal,
                expiry_date=item.get('expiry_date'),
                manufactured_date=item.get('manufactured_date'),
            )
            item_id += 1

        increments = {}
        for product, item, qty, price, subtotal in prepared_items:
            increments[product.pk] = increments.get(product.pk, 0) + qty

        for product_pk, qty in increments.items():
            InventoryProduct.objects.filter(pk=product_pk).update(
                stock_quantity=models.F('stock_quantity') + qty,
                updated_at=now,
            )

        return (
            Purchase.objects.select_related('supplier', 'user')
            .prefetch_related('items__product')
            .get(pk=purchase.pk)
        )


class PurchaseCreateView(APIView):
    permission_classes = [IsPosStaff]

    def post(self, request):
        serializer = PurchaseCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            purchase = _create_purchase(request.user, data)
        except ValidationError as exc:
            return Response({'detail': list(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(PurchaseSerializer(purchase).data, status=status.HTTP_201_CREATED)


class PurchaseListView(generics.ListAPIView):
    serializer_class = PurchaseSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            Purchase.objects.select_related('supplier', 'user')
            .prefetch_related('items__product')
            .order_by('-created_at')
        )