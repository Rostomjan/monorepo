# Storage Demo is live (free, practice-only)

`/gcp/storage` mints real v4 PUT URLs and proves live write+delete against `project-734f5ad8-8534-4188-a0a-gcp-demo` (EUROPE-WEST1). Supersedes the zero-deps stance of 0001 for this Demo only; `/gcp/run`, `/gcp/secrets`, `/gcp/databases` stay local-first.

## Considered Options

- **Stay local-only**: rejected — user provided a project and wanted one live proof.
- **SA key file**: rejected — org policy `iam.disableServiceAccountKeyCreation` blocks keys.
- **Chosen**: user ADC + `lab-signer` SA impersonation for v4 signing; bucket-level `objectUser` for the user; CORS limited to `http://localhost:3003`; images only, ≤ 1 MB, 10-min expiry, probe writes then deletes (zero retained bytes).

## Consequences

- Adds `@google-cloud/storage` dep. Live needs `GCS_BUCKET` + impersonated ADC; without them the Demo falls back to local shape. Go-live for other Demos follows the same pattern per-Demo.
