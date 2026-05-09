#!/usr/bin/env bash
# ----------------------------------------------------------------------------
# Full Firestore export from production to a GCS bucket.
#
# Use this for backups or as a source for `import-to-env.sh`. For PII-scrubbed
# clones to staging/dev prefer `clone-firestore.ts`.
#
# Required env:
#   FIREBASE_PROJECT_ID_PROD  — source project ID
#   EXPORT_BUCKET             — destination bucket (e.g. gs://makhzoon-backups)
# ----------------------------------------------------------------------------
set -euo pipefail

PROD_PROJECT="${FIREBASE_PROJECT_ID_PROD:?Set FIREBASE_PROJECT_ID_PROD}"
BUCKET="${EXPORT_BUCKET:?Set EXPORT_BUCKET (e.g. gs://makhzoon-backups)}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
DEST="$BUCKET/full-export-$STAMP"

echo "Exporting $PROD_PROJECT → $DEST"
gcloud config set project "$PROD_PROJECT"
gcloud firestore export "$DEST"
echo "Export complete: $DEST"
