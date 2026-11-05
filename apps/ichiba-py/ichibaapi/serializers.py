"""DRF serializers — the Python counterpart of the TS interfaces
(Shop / Product / Order in apps/ichiba/src/lib/*.ts).

They serialize *dicts* shaped like the Python `TypedDict`s (catalog.py /
orders.py), not model instances — so the CamelCase field names map straight
onto dict keys with no source plumbing. Keeping the serialization layer
explicit is the point: TS gets API casing "for free" because drizzle row
types are invisible inside the same process; here SQL snake_case ends and
contract camelCase begins, and serializers are the visible seam.
"""

from rest_framework import serializers

from ichibaapi.catalog import Product, Shop  # noqa: TC001
from ichibaapi.orders import OrderItemPayload, OrderPayload  # noqa: TC001


class ShopSerializer(serializers.Serializer):
    """models.Shop mapping → {id, name}."""

    id = serializers.CharField()
    name = serializers.CharField()

    def create(self, validated_data: dict[str, str]) -> Shop:
        return {"id": validated_data["id"], "name": validated_data["name"]}


class ProductSerializer(serializers.Serializer):
    """models.Product row → TS interface Product."""

    id = serializers.CharField()
    shopId = serializers.CharField()
    name = serializers.CharField()
    priceYen = serializers.IntegerField()
    stock = serializers.IntegerField()

    def create(self, validated_data: dict[str, object]) -> Product:
        return validated_data  # type: ignore[return-value]


class OrderItemSerializer(serializers.Serializer):
    """models.OrderItem row → TS interface OrderItem."""

    productId = serializers.CharField()
    name = serializers.CharField()
    priceYen = serializers.IntegerField()
    qty = serializers.IntegerField()

    def create(self, validated_data: dict[str, object]) -> OrderItemPayload:
        return validated_data  # type: ignore[return-value]


class OrderSerializer(serializers.Serializer):
    """OrderPayload dict → TS interface Order."""

    id = serializers.CharField()
    userId = serializers.CharField()
    shopId = serializers.CharField()
    shopName = serializers.CharField()
    items = OrderItemSerializer(many=True)
    totalYen = serializers.IntegerField()
    createdAt = serializers.CharField()

    def create(self, validated_data: dict[str, object]) -> OrderPayload:
        return validated_data  # type: ignore[return-value]
