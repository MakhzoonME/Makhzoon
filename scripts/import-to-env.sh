#!/usr/bin/env bash
# ----------------------------------------------------------------------------
# Import a previously-exported Firestore snapshot into staging or dev.
#
# ⚠️  This DOES NOT scrub PII. For lower environments that should not contain
#     production PII, use `clone-firestore.ts` instead.
#
# Usage:
#   ./scripts/import-to-env.sh staging gs://makhzoon-backups/full-export-...
#   ./scripts/import-to-env.sh dev     gs://makhzoon-backups/full-export-...
#
# Required env:
#   FIREBASE_PROJECT_ID_STAGING  — staging project ID
#   FIREBASE_PROJECT_ID_DEV      — dev project ID
# ----------------------------------------------------------------------------
set -euo pipefail

TARGET_ENV="${1:?Usage: import-to-env.sh <staging|dev> <export-path>}"
EXPORT_PATH="${2:?Usage: import-to-env.sh <staging|dev> <export-path>}"

case "$TARGET_ENV" in
  staging) PROJECT="${FIREBASE_PROJECT_ID_STAGING:?Set FIREBASE_PROJECT_ID_STAGING}";;
  dev)     PROJECT="${FIREBASE_PROJECT_ID_DEV:?Set FIREBASE_PROJECT_ID_DEV}";;
  *) echo "Target must be staging or dev (got: $TARGET_ENV)"; exit 1;;
esac

echo "Importing $EXPORT_PATH → $PROJECT"
read -r -p "Confirm: import will OVERWRITE matching docs. Type 'yes' to continue: " ANSWER
if [ "$ANSWER" != "yes" ]; then
  echo "Aborted."
  exit 0
fi

gcloud config set project "$PROJECT"
gcloud firestore import "$EXPORT_PATH"
echo "Import complete."
