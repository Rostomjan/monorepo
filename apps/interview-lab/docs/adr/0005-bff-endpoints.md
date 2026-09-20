# BFF Demos aggregate live GCP backends per screen

`/gcp/bff-dashboard` (summary + config Route Handlers) and `/gcp/bff-upload-ticket` (ticket Server Action) compose Storage, Firestore, and Secret Manager into frontend-shaped responses. Convention: 200 + `warnings[]` per-backend degradation, never raw SDK errors; secrets redacted server-side (reachability only).

## Considered Options

- **Three client fetches**: rejected — 3 round-trips, 3 loading states, secret values would need client access.
- **API gateway**: rejected — cross-cutting infra, not screen-specific shaping.

## Consequences

- No new deps (reuses storage/firestore/secret-manager). Same ADC rule: live locally and on Cloud Run, degraded `warnings[]` on Vercel. Ticket docs in `uploads` are practice data — delete after use.
