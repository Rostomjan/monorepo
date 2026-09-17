# Databases Demo: Firestore live, Cloud SQL code-only

`/gcp/databases` probes Firestore live (write+read+delete one tiny doc in `lab_probes`, zero retained) and keeps Cloud SQL as snippet only.

## Considered Options

- **Provision Cloud SQL too**: rejected — smallest Postgres (~db-f1-micro) bills from creation; wrong for free practice.
- **Firestore live**: chosen — native mode, europe-west1 (same region as bucket), free quota covers practice 100x over.

## Consequences

- Adds `@google-cloud/firestore` dep. Needs `firestore.googleapis.com` + `datastore.user` (granted to `lab-signer` SA and practice user). No ADC on Vercel → probe fails gracefully there, same as Storage. Cleanup if ever needed: delete `lab_probes` docs (probe self-deletes) or `gcloud firestore databases delete`.
