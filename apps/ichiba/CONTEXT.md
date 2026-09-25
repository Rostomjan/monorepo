# CONTEXT.md — Ichiba (bounded context)

Glossary only. No implementation details.

- **Shop** — a seller storefront. Has a name. Example: "Shop 3 Premium".
- **Product** — an item for sale. Belongs to exactly one Shop. Has a name, price (JPY), and stock.
- **Customer** — the buyer. Stage 1: a single mocked guest (no auth). The word `User` is reserved for the future Clerk identity.
- **Cart** — belongs to one Customer. May mix Products from multiple Shops. Holds CartLines (Product + quantity, 1–99).
- **Order** — belongs to one Customer *and* one Shop. Checkout splits a mixed Cart into one Order per Shop (each with its own items and total).
- **OrderItem** — a snapshot of a Product at purchase time (name + price + quantity). Price changes later must not rewrite history.
- **Checkout** — mock payment that always succeeds. Validates stock, creates Orders, clears the Cart.
