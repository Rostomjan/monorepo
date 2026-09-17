# Secrets Demo reads a dummy practice secret live

`/gcp/secrets` reads `LAB_PRACTICE_SECRET` (dummy value `practice-only-not-real`, v1) server-only via `SecretManagerServiceClient`, showing only a masked preview + length. Supersedes 0001 for this Demo only.

## Considered Options

- **Real credential as demo value**: rejected — dummy proves the IAM + SDK path with zero leak risk.
- **Client-side read**: rejected — secret access stays in a Server Action; browser sees masked output only.

## Consequences

- Adds `@google-cloud/secret-manager` dep. Needs `secretmanager.googleapis.com` + per-secret `secretAccessor` (granted to `lab-signer` SA and practice user). 1 secret / 1 version stays in free tier. Cleanup: `gcloud secrets versions destroy latest --secret=LAB_PRACTICE_SECRET` then `gcloud secrets delete LAB_PRACTICE_SECRET`.
