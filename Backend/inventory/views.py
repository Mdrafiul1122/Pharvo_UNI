from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from django.db.models import Q

from sales.permissions import IsPosStaff

from .models import DrugInteraction, InventoryProduct
from .serializers import DrugInteractionSerializer, InteractionCheckSerializer, ProductSerializer


class ProductListView(generics.ListCreateAPIView):
    queryset = InventoryProduct.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()

        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(brand__icontains=search)
                | Q(barcode__icontains=search)
            )

        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category_id=category)

        supplier = self.request.query_params.get('supplier')
        if supplier:
            queryset = queryset.filter(supplier_id=supplier)

        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            active = is_active.lower() in ('true', '1', 'yes')
            queryset = queryset.filter(is_active=active)

        return queryset


class ProductDetailView(generics.RetrieveUpdateAPIView):
    queryset = InventoryProduct.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated]


FLATTENED_DRUG_LOOKUP = None


def _load_drug_lookup():
    """Build a case-insensitive map from product name fragments to interaction drugs."""
    global FLATTENED_DRUG_LOOKUP
    if FLATTENED_DRUG_LOOKUP is not None:
        return FLATTENED_DRUG_LOOKUP
    interactions = DrugInteraction.objects.filter(is_active=True)
    lookup = {}
    for inter in interactions:
        for name in (inter.drug_a, inter.drug_b):
            key = name.strip().lower()
            if key not in lookup:
                lookup[key] = {'name': name, 'interactions': []}
            pair = (inter.drug_a, inter.drug_b)
            lookup[key]['interactions'].append({
                'id': inter.id,
                'drug_a': inter.drug_a,
                'drug_b': inter.drug_b,
                'interaction_level': inter.interaction_level,
                'description': inter.description,
                'pair_key': inter.pair_key,
            })
    FLATTENED_DRUG_LOOKUP = lookup
    return FLATTENED_DRUG_LOOKUP


def _match_product_to_drug(product_name):
    """Find the interaction-table drug name that matches a given product name."""
    lookup = _load_drug_lookup()
    name_lower = product_name.lower()
    hits = []
    for key, entry in lookup.items():
        if key in name_lower:
            hits.append((key, entry))
    return hits


class InteractionListView(generics.ListAPIView):
    queryset = DrugInteraction.objects.filter(is_active=True)
    serializer_class = DrugInteractionSerializer
    permission_classes = [IsPosStaff]


class InteractionCheckView(APIView):
    permission_classes = [IsPosStaff]

    def post(self, request):
        serializer = InteractionCheckSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        product_ids = serializer.validated_data['product_ids']

        # Validate products exist
        products = list(
            InventoryProduct.objects.filter(pk__in=product_ids).values('id', 'name')
        )
        found_ids = {p['id'] for p in products}
        missing = [pid for pid in product_ids if pid not in found_ids]
        if missing:
            return Response(
                {'detail': 'Invalid product(s): %s' % ', '.join(str(m) for m in missing)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(products) < 2:
            return Response({
                'interactions': [],
                'message': 'Two or more medicines are required for an interaction check.',
            })

        lookup = _load_drug_lookup()

        # Map each product to its matching interaction-table drug(s)
        product_drugs = []
        for p in products:
            drug_names = set()
            for key, entry in _match_product_to_drug(p['name']):
                drug_names.add(entry['name'])
            product_drugs.append({'product_id': p['id'], 'name': p['name'], 'drugs': drug_names})

        # Find interactions between distinct products
        results = []
        seen_pairs = set()
        for i in range(len(product_drugs)):
            for j in range(i + 1, len(product_drugs)):
                left = product_drugs[i]
                right = product_drugs[j]
                # Build a composite set of drug names for each product
                left_drugs = left['drugs'] or {left['name']}
                right_drugs = right['drugs'] or {right['name']}
                matched = []
                for a in left_drugs:
                    for b in right_drugs:
                        key = '||'.join(sorted([a.lower(), b.lower()]))
                        if key in seen_pairs:
                            continue
                        seen_pairs.add(key)
                        inter = DrugInteraction.objects.filter(
                            is_active=True,
                            pair_key=key,
                        ).first()
                        if inter:
                            matched.append({
                                'drug_a': inter.drug_a,
                                'drug_b': inter.drug_b,
                                'interaction_level': inter.interaction_level,
                                'description': inter.description,
                            })
                if matched:
                    results.append({
                        'product_a_id': left['product_id'],
                        'product_a_name': left['name'],
                        'product_b_id': right['product_id'],
                        'product_b_name': right['name'],
                        'interactions': matched,
                    })

        return Response({
            'interactions': results,
            'message': 'No interaction found.' if not results else (
                'Interaction(s) found between the selected products.'
            ),
        })
