# GCP lab is local-first, zero-deps v1

The `/gcp` Lab renders five Demos with mocked-local UI and copy-ready `gcloud` + Node SDK snippets, no `GOOGLE_APPLICATION_CREDENTIALS`, no `@google-cloud/*` deps, no billing. We add live credentials and deps only when a real project ID is provided.

## Considered Options

- **Live from day one**: real project + bucket + secrets. Rejected — billing risk, blocks learning without a project.
- **Emulators**: GCS/Secret Manager emulators locally. Rejected for v1 — extra setup, low interview value vs static flow + snippets.

## Consequences

- `bun run check` stays green with zero new deps; go-live means adding `@google-cloud/storage`, `secret-manager`, `firestore`/`pg` + env wiring.
