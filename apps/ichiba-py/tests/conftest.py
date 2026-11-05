"""Shared pytest fixtures.

DB-marked integration tests (test_db_api.py) skip when no DATABASE_URL is
set, so `bun run check` stays green in CI with no Postgres service.

pytest-django always provisions a fresh <suffix> database, but the schema
is owned by apps/ichiba's drizzle SQL migrations (unmanaged Django models).
So after the test database is created we replay the same SQL files the TS
side runs via `bun run db:migrate` — one more reason the two backends stay
in sync: there is exactly one source of schema truth.
"""

import pathlib

import pytest
from django.db import connection

SQL_MIGRATIONS = (
    pathlib.Path(__file__).resolve().parents[2]
    / "ichiba"
    / "src"
    / "lib"
    / "db"
    / "migrations"
).glob("*.sql")


def _replay_migrations() -> None:
    statements = []
    for path in sorted(SQL_MIGRATIONS):
        # The migration files are simple DDL: no string literals containing
        # ';', so line-comment-stripped splitting is faithful to psql -f.
        lines = [
            line
            for line in path.read_text().splitlines()
            if not line.lstrip().startswith("--")
        ]
        code = "\n".join(lines)
        statements += [s.strip() for s in code.split(";") if s.strip()]
    with connection.cursor() as cursor:
        for statement in statements:
            try:
                cursor.execute(statement)
            except Exception as exc:  # noqa: BLE001
                # pg_trgm may need superuser; installed already on the real
                # database (or privileges lacking). Django never owns the
                # schema, so tolerate.
                if "pg_trgm" in statement:
                    # Installed already (or privileges lacking) on the real
                    # database; Django never owns the schema, so tolerate.
                    print(f"skipping {statement!r}: {exc}")  # noqa: T201
                else:
                    raise


@pytest.fixture(scope="session")
def django_db_setup(django_db_setup, django_db_blocker):  # noqa: PT004/PT005
    with django_db_blocker.unblock():
        _replay_migrations()
        _seed_catalog()
    return django_db_setup


def _seed_catalog() -> None:
    """Test database == TS `bun run db:seed` output, because
    generate_catalog() is byte-identical across languages for the same seed."""
    from ichibaapi.catalog import generate_catalog
    from ichibaapi.models import Product, Shop

    if Product.objects.exists():
        return
    shops, products = generate_catalog()
    Shop.objects.bulk_create([Shop(id=s["id"], name=s["name"]) for s in shops])
    Product.objects.bulk_create(
        [
            Product(
                id=p["id"],
                shop_id=p["shopId"],
                name=p["name"],
                price_yen=p["priceYen"],
                stock=p["stock"],
            )
            for p in products
        ]
    )
