"""Free-tier rate limiter — Python port of apps/ichiba/src/lib/rate-limit.ts.

Same Upstash Redis REST pipeline (INCR + EXPIRE NX), same env names, same
fail-open default. Stdlib urllib keeps the dep tree at zero (TS used fetch).
"""

import json
import os
import urllib.request

RATE_LIMIT = 100  # req/min per IP — mirrors the nginx `write_zone` budget
WINDOW_SECONDS = 60


def _env(*names: str) -> str | None:
    for name in names:
        value = os.environ.get(name)
        if value:
            return value
    return None


def client_ip(headers: dict[str, str] | None) -> str:
    """Same header chain as TS: x-forwarded-for first hop → x-real-ip → anon."""
    merged = {k.lower(): v for k, v in (headers or dict(os.environ)).items()}
    f4 = merged.get("x-forwarded-for")
    if f4:
        return f4.split(",")[0].strip()
    return merged.get("x-real-ip") or "anon"


def check_write_rate_limit(ip: str | None = None, limit: int = RATE_LIMIT) -> bool:
    """True = allowed. Unset env (local dev, CI) no-ops open — same as TS."""
    url = _env("UPSTASH_REDIS_REST_URL", "KV_REST_API_URL")
    token = _env("UPSTASH_REDIS_REST_TOKEN", "KV_REST_API_TOKEN")
    if not url or not token:
        return True
    ip = ip or "anon"
    key = f"ichiba:rl:write:{ip}"
    try:
        req = urllib.request.Request(
            f"{url}/pipeline",
            method="POST",
            data=json.dumps([["INCR", key], ["EXPIRE", key, str(WINDOW_SECONDS), "NX"]]).encode(),
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=5) as res:
            if res.status != 200:
                return True
            data = json.load(res)
        return (data[0].get("result") or 0) <= limit
    except Exception:
        # Fail open — a dead limiter must not take checkout down with it.
        return True
