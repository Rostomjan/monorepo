"""Unmanaged ORM models mapping the *existing* Postgres tables.

The schema is owned by apps/ichiba (drizzle) — src/lib/db/migrations/*.sql —
so both backends share one database. Django runs with `managed = False`:
no Django migrations, no drift conflicts, ORM is a read/write *lens* over a
schema it does not own. The learning contrast with the TS side: drizzle's
schema-first TS types are compile-time only — Django's models are runtime
objects (validation, defaults, lookups) at the cost of this dual-ownership
problem, which you'd solve differently if Django owned the schema.
"""

from django.db import models


class Shop(models.Model):
    id = models.CharField(primary_key=True, max_length=64)
    name = models.CharField(max_length=256)

    class Meta:
        managed = False
        db_table = "shops"


class Product(models.Model):
    id = models.CharField(primary_key=True, max_length=64)
    shop = models.ForeignKey(Shop, db_column="shop_id", on_delete=models.DO_NOTHING)
    name = models.CharField(max_length=256)
    price_yen = models.IntegerField()
    stock = models.IntegerField()

    class Meta:
        managed = False
        db_table = "products"


class Order(models.Model):
    id = models.CharField(primary_key=True, max_length=128)
    user_id = models.CharField(max_length=128)
    shop_id = models.CharField(max_length=64)
    shop_name = models.CharField(max_length=256)
    total_yen = models.IntegerField()
    # TS stores ISO-8601 text (created_at TEXT); keep the same column type —
    # string ordering == chronological ordering for fixed-format ISO.
    created_at = models.CharField(max_length=32)

    class Meta:
        managed = False
        db_table = "orders"


class OrderItem(models.Model):
    # Composite primary key exactly like the SQL table (order_id + product_id).
    pk = models.CompositePrimaryKey("order_id", "product_id")
    order = models.ForeignKey(Order, db_column="order_id", on_delete=models.DO_NOTHING)
    product_id = models.CharField(max_length=64)
    # Immutable snapshot at purchase time (Ichiba rule): name/price copied,
    # not re-fetched. Price changes never rewrite history.
    name = models.CharField(max_length=256)
    price_yen = models.IntegerField()
    qty = models.IntegerField()

    class Meta:
        managed = False
        db_table = "order_items"
        constraints = [
            models.UniqueConstraint(fields=["order", "product_id"], name="order_items_uniqueness"),
        ]
