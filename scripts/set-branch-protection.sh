#!/usr/bin/env bash
# One-time (idempotent) setup for the PR gate. Requires gh with admin access.
#
#   gh secret set OPENCODE_API_KEY          # credential for the `opencode` provider
#   bash scripts/set-branch-protection.sh
#
# Enforces: PRs only for main/develop (admins included), linear history, no
# force-push/deletes, squash-only merges, auto-merge enabled, and the exact
# required status checks defined below. Job names must match workflows.
set -euo pipefail

REPO=$(gh repo view --json owner,name -q '.owner.login + "/" + .name')

echo "Repo: $REPO"
echo "Enabling squash-only merges + allow auto-merge..."
gh api -X PATCH "repos/$REPO" \
  -f allow_squash_merge=true \
  -f allow_merge_commit=false \
  -f allow_rebase_merge=false \
  -f allow_auto_merge=true \
  -f delete_branch_on_merge=true

# Required checks = only jobs that RUN ON EVERY PR. Exclusion rules:
# - Affected-selected jobs (Docker builds, Playwright x3, Ichiba e2e) MUST
#   NOT be required: they skip for diffs outside their tier, and a required
#   check that never reports blocks the merge forever. Tier selection is
#   defined in scripts/tier-select.ts; the merge gate treats skipped as
#   green for that tier.
# - Deploy jobs: push-only, never report on PRs - same blocking trap.
# - Merge gate: merges from inside itself; a required self-check deadlocks
#   its direct merge (the --auto fallback relies on it NOT being required).
# NOTE: keep context names in sync with job `name:` fields:
#   .github/workflows/factory.yml
# CAVEAT: with these review jobs required, a reviewer REQUEST_CHANGES only
# attaches labels (the review jobs themselves stay green), so a human can
# still merge after reading the review. Hard-blocking on reviewer verdicts
# would require GitHub review approvals instead of status checks.
CONTEXTS=$(cat <<'EOF'
Lint, Types, Unit tests, Build
Triage impact
Review - fast sweep
Review - intent (strong)
Changes
EOF
)

payload=$(jq -n --arg contexts "$CONTEXTS" '
  {
    required_status_checks: {
      strict: true,
      contexts: ($contexts | split("\n") | map(select(length > 0)))
    },
    required_pull_request_reviews: null,
    enforce_admins: true,
    required_linear_history: true,
    allow_force_pushes: false,
    allow_deletions: false,
    restrictions: null
  }')

BRANCHES="main develop"

for branch in $BRANCHES; do
  echo "Protecting branch: $branch"
  gh api -X PUT "repos/$REPO/branches/$branch/protection" --input - <<< "$payload" > /dev/null
  echo "  done"
done

echo "Branch protection set. All changes to $BRANCHES must now go through PRs."