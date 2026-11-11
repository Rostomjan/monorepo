#!/usr/bin/env python3
"""Differential fuzzer for the ichiba backend twins (docs/BACKEND_TWINS.md).

Feeds the same seeded matrix of query shapes to two or more running
backends and asserts the responses are identical — status code and JSON
body, parsed (object key order is not part of the contract, values are).
Where `contract.py` checks each backend against the contract's anchors,
this checks twins against EACH OTHER, byte-semantics aside — the
strongest drift detector we have, because it needs no expectations list.

  python3 scripts/diff-twins.py http://localhost:3022 http://localhost:3021

Targets the service twins (ichiba-go :3022, ichiba-py :3021). The TS app
exposes /api/products only over RSC, so it is not a valid participant.

The matrix (deterministic for a given --seed):
- q metacharacters: LIKE wildcards, escapes, quotes, unicode, blanks,
  overlong input — the escaping/trigram path.
- sort vocabulary: valid, unknown, case-bent, empty — the 400 contract.
- page/perPage edges: absent, 0, 1, 61, negatives, huge, non-integers —
  the TS-exact clamp semantics (0 clamps to 1, 61 clamps to 60, non-
  integer is one shared 400 message).
- a seeded random sample of parameter combinations (typo-ish queries,
  sorts x pages) to catch interaction bugs single-var scans miss.

Pure stdlib. Exit 0 = all backends agreed on every case; 1 = drift.
"""

import argparse
import itertools
import json
import random
import sys
import urllib.error
import urllib.parse
import urllib.request

FAILS: list[str] = []
SHOWN = 0


def fetch(base: str, path: str) -> tuple[int, object]:
    url = f"{base}{path}"
    try:
        with urllib.request.urlopen(url, timeout=10) as res:
            return res.status, json.load(res)
    except urllib.error.HTTPError as exc:
        raw = exc.read()
        try:
            return exc.code, json.loads(raw)
        except (ValueError, UnicodeDecodeError):
            return exc.code, raw.decode("utf-8", "replace")
    except (urllib.error.URLError, TimeoutError) as exc:
        return -1, f"unreachable: {exc}"


def build_cases(seed: int) -> list[tuple[str, dict]]:
    """The query-shape matrix: (label, params). None values stay absent."""
    cases: list[tuple[str, dict]] = []

    def add(label: str, **params: object) -> None:
        cases.append((label, {k: v for k, v in params.items() if v is not None}))

    baseline = dict(q="backpack", sort="featured", page=1, perPage=12)

    # 1. q shapes (single-var scan): metacharacters, escapes, unicode,
    #    blanks, case, overlong strings.
    qs = [
        "", "backpack", "MATCHA", "Tea Pot", "  ", "%", "_", "\\", "%_",
        "a%", "%%", "50%_a\\b", "'\"", "漢字", "-1", "shop", "a" * 300,
        "%backpack%", "backpack_", r"back\\pack",
    ]
    for q in qs:
        add(f"q={q!r}", q=q, **{k: v for k, v in baseline.items() if k != "q"})

    # 2. sort vocabulary: valid, unknown, case-bent, empty.
    sorts = ["featured", "price-asc", "price-desc", "", "banana",
             "PRICE-ASC", "price_asc", "price-asc,price-desc"]
    for sort in sorts:
        add(f"sort={sort!r}", sort=sort, **{k: v for k, v in baseline.items() if k != "sort"})

    # 3. page / perPage edges: clamp semantics (0→1, 61→60), negatives,
    #    huge values, non-integers (one shared 400 message).
    for name in ("page", "perPage"):
        for value in (None, 0, 1, 2, -5, 60, 61, 9999, 2**31, "abc", "1.5", ""):
            params = dict(baseline)
            params[name] = value
            add(f"{name}={value!r}", **params)

    # 4. explicit cross edges: sort × page (unknown sorts against page
    #    edges), perPage edges × page edges.
    for sort, page in itertools.product(("banana", "price-desc"), (0, 1, 9999)):
        add(f"sort={sort!r},page={page!r}", q="backpack", sort=sort, page=page, perPage=12)
    for per, page in itertools.product((0, 1, 61), (0, 1)):
        add(f"perPage={per!r},page={page!r}", q="backpack", sort="featured", page=page, perPage=per)

    # 5. shopId: valid, last, unknown — counts ignore the shop filter.
    for shop in ("shop-1", "shop-40", "nope", ""):
        add(f"shopId={shop!r}", q="backpack", shopId=shop, sort="featured", page=1, perPage=12)

    # 6. seeded random combinations: interaction bugs the single-var scans
    #    above cannot see.
    rng = random.Random(seed)
    for _ in range(60):
        params = {
            "q": rng.choice(qs + ["tea", "knife set", "plush", "limited", "e%co"]),
            "sort": rng.choice(sorts),
            "page": rng.choice((None, 0, 1, 2, 3, 61, -5, 9999)),
            "perPage": rng.choice((None, 0, 1, 5, 12, 60, 61)),
            "shopId": rng.choice((None, "shop-1", "shop-40", "nope")),
        }
        # Unknown sorts must not dominate the sample: the 400 is already
        # covered single-var. Keep at most a few.
        label = ", ".join(f"{k}={v!r}" for k, v in params.items() if v is not None)
        add(label or "(all absent)", **params)

    # 7. static endpoints for completeness (both twins share one DB, so
    #    even data-bearing GETs must agree — e.g. guest orders).
    cases.append(("GET /api/shops", {}))
    cases.append(("GET /api/health", {}))
    cases.append(("GET /api/orders", {}))
    return cases


def render(value: object, limit: int = 220) -> str:
    text = json.dumps(value, sort_keys=True, ensure_ascii=False)
    return text if len(text) <= limit else text[:limit] + "…"


def compare(base_a: str, base_b: str, label: str, path: str) -> bool:
    status_a, body_a = fetch(base_a, path)
    status_b, body_b = fetch(base_b, path)
    if status_a == status_b and body_a == body_b:
        return True
    detail = (
        f"FAIL  {label}\n"
        f"       {base_a}: status={status_a} body={render(body_a)}\n"
        f"       {base_b}: status={status_b} body={render(body_b)}"
    )
    if len(FAILS) < 10:
        print(detail, file=sys.stderr)  # noqa: T201
    FAILS.append(label)
    return False


def main() -> int:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("bases", nargs="+", help="two or more backend base URLs, e.g. :3022 and :3021")
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()
    if len(args.bases) < 2:
        parser.error("need at least two backends to diff")
    bases = [base.rstrip("/") for base in args.bases]

    cases = build_cases(args.seed)
    mismatches = 0
    for label, params in cases:
        path = "/api/products?" + urllib.parse.urlencode(params, quote_via=urllib.parse.quote) \
            if params else "/api/products"
        if not compare(bases[0], bases[1], label, path):
            mismatches += 1

    print(f"\n{len(cases)} cases × {len(bases)} backends — "
          f"{mismatches} mismatch(es), {len(FAILS)} recorded")  # noqa: T201
    if FAILS:
        print("TWINS DIVERGED — first offenders listed above; same DB, same seed, "
              "different answers = a contract drift. See docs/BACKEND_TWINS.md.", file=sys.stderr)  # noqa: T201
        return 1
    print("All backends agreed on every case.")  # noqa: T201
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
