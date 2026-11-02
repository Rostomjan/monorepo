"""Django settings for ichiba-py.

Deliberately minimal API-service settings — no admin, sessions, templates,
or auth middleware. The TS counterpart (apps/ichiba) embeds its backend in
Next.js; here the "framework" is the process, which is one of the
widths you can compare (see docs/DUAL_BACKEND.md).

Database: DATABASE_URL or POSTGRES_URL (same names the TS db client accepts).
When unset, DATABASES stays empty — the process boots and /api/health
degrades to 503 instead of crashing (mirrors the TS "lazy connect" rule).
"""

import os
from pathlib import Path
from urllib.parse import unquote, urlsplit

BASE_DIR = Path(__file__).resolve().parent.parent

# Env-driven, like the TS app. Never ship a real key.
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "dev-only-insecure-secret")
DEBUG = os.environ.get("DJANGO_DEBUG", "") == "1"
ALLOWED_HOSTS = os.environ.get("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")

# nosurf: this is a pure JSON API behind server/server or trusted callers;
# the nginx/cloud LB handles origin checks. Keep middlewares to the minimum
# the API needs (contrast: Next.js gives you these "for free" invisibly).
MIDDLEWARE = ["django.middleware.common.CommonMiddleware"]

INSTALLED_APPS = [
    # Required by DRF wiring (AnonymousUser comes from contrib.auth).
    "django.contrib.contenttypes",
    "django.contrib.auth",
    # TrigramSimilarity + related Postgres lookups.
    "django.contrib.postgres",
    "rest_framework",
    "ichibaapi",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {"context_processors": []},
    }
]

WSGI_APPLICATION = "config.wsgi.application"

TIME_ZONE = "Asia/Tokyo"
USE_I18N = False
USE_TZ = True

REST_FRAMEWORK = {
    # No auth/permissions/throttling beyond what the routes do themselves —
    # same stance as the TS routes (Clerk identity is resolved per-route).
    "DEFAULT_AUTHENTICATION_CLASSES": [],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.AllowAny"],
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "DEFAULT_PARSER_CLASSES": ["rest_framework.parsers.JSONParser"],
}

DATABASES: dict[str, dict[str, object]] = {}
_database_url = os.environ.get("DATABASE_URL") or os.environ.get("POSTGRES_URL")
if _database_url:
    _parts = urlsplit(_database_url)
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": unquote(_parts.path.lstrip("/")),
            "USER": unquote(_parts.username or ""),
            "PASSWORD": unquote(_parts.password or ""),
            "HOST": _parts.hostname or "",
            "PORT": _parts.port or 5432,
        },
    }
else:
    # mirrors the TS db client's lazy-connect error, minus the throw: the
    # service still boots, health checks report the missing config at 503.
    pass

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
