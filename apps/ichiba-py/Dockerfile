FROM python:3.12-slim

# uv is the Python toolchain (equivalent of bun): single binary, frozen
# uv.lock install. Docs: https://docs.astral.sh/uv/
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

WORKDIR /app/apps/ichiba-py

# Dependency layer first: pyproject + lock cache the venv between builds.
COPY apps/ichiba-py/pyproject.toml apps/ichiba-py/uv.lock ./
RUN uv sync --frozen --no-dev

COPY apps/ichiba-py/manage.py ./
COPY apps/ichiba-py/config ./config
COPY apps/ichiba-py/ichibaapi ./ichibaapi

ENV PORT=3021
EXPOSE 3021
# Production server: gunicorn (Django's runserver is dev-only, same rule as
# next dev vs next start). Binds to $PORT (docker-compose pins 3021; hosts
# like Render inject their own PORT and expect the service to honor it).
CMD ["sh", "-c", "uv run gunicorn --bind 0.0.0.0:${PORT:-3021} config.wsgi:application"]
