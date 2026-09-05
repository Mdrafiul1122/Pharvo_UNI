from rest_framework import serializers


class SalesReportSerializer(serializers.Serializer):
    total_sales = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_discount = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_payable = serializers.DecimalField(max_digits=14, decimal_places=2)
    sales_count = serializers.IntegerField()
    date_trend = serializers.ListField(child=serializers.DictField())


class PurchasesReportSerializer(serializers.Serializer):
    total_purchases = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_discount = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_payable = serializers.DecimalField(max_digits=14, decimal_places=2)
    purchase_count = serializers.IntegerField()
    date_trend = serializers.ListField(child=serializers.DictField())


class StockReportSerializer(serializers.Serializer):
    total_products = serializers.IntegerField()
    total_stock = serializers.IntegerField()
    low_stock = serializers.IntegerField()
    out_of_stock = serializers.IntegerField()
    expired = serializers.IntegerField()
    near_expiry = serializers.IntegerField()


class CustomerReportSerializer(serializers.Serializer):
    total_customers = serializers.IntegerField()
    membership_tiers = serializers.DictField()
    top_customers = serializers.ListField(child=serializers.DictField())
