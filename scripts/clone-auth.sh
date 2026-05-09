#!/usr/bin/env bash
# ----------------------------------------------------------------------------
# Clone Firebase Auth users from one project to another.
#
# Why this exists: Firestore clones (clone-firestore.ts) only copy Firestore
# documents. Firebase Auth users live in a separate system, and without their
# auth records, customers cannot log in to the target environment even if
# their profile docs exist in Firestore.
#
# Usage:
#   ./scripts/clone-auth.sh <source-alias> <target-alias>
#
#   Aliases come from .firebaserc — typical values are:
#     legacy     office-asset-system
#     prod       makhzoon-prod
#     staging    makhzoon-staging
#     dev        makhzoon-dev
#
# Examples:
#   # One-time migration: legacy production into the new prod
#   ./scripts/clone-auth.sh legacy prod
#
#   # Seed staging from new prod
#   ./scripts/clone-auth.sh prod staging
#
# Requirements:
#   - `firebase login` already done locally
#   - The same Google account has Owner/Auth Admin role on both projects
#   - For passwords to migrate, you need the SOURCE project's password hash
#     parameters from Firebase Console > Authentication > Settings >
#     Password hash parameters tab. Have those ready before running.
#
# IMPORTANT:
#   - This OVERWRITES users in the target project that share the same UIDs.
#   - The export JSON contains password hashes. Delete it after import.
# ----------------------------------------------------------------------------
set -euo pipefail

SOURCE="${1:?Usage: clone-auth.sh <source-alias> <target-alias>}"
TARGET="${2:?Usage: clone-auth.sh <source-alias> <target-alias>}"

if [ "$SOURCE" = "$TARGET" ]; then
  echo "❌ Source and target cannot be the same alias"
  exit 1
fi

if [ "$TARGET" = "prod" ] || [ "$TARGET" = "legacy" ]; then
  echo "⚠️  Target is a production alias ($TARGET)."
  read -r -p "   Type 'yes' to overwrite production-class auth records: " ANSWER
  if [ "$ANSWER" != "yes" ]; then
    echo "Aborted."
    exit 0
  fi
fi

STAMP="$(date -u +%Y%m%d-%H%M%S)"
EXPORT_FILE="auth-export-${SOURCE}-${STAMP}.json"

echo ""
echo "📤 Exporting users from [$SOURCE] → $EXPORT_FILE"
firebase auth:export "$EXPORT_FILE" --project "$SOURCE"

if [ ! -s "$EXPORT_FILE" ]; then
  echo "❌ Export file is empty. Aborting."
  exit 1
fi

USER_COUNT=$(grep -o '"localId"' "$EXPORT_FILE" | wc -l | tr -d ' ')
echo "   Exported $USER_COUNT user(s)."
echo ""

# ----------------------------------------------------------------------------
# Hash parameters from the source project. Required so passwords work after
# import. Find them in: Firebase Console > Authentication > Settings >
# Password hash parameters (only visible to project Owners).
# ----------------------------------------------------------------------------
echo "📥 Importing into [$TARGET]"
echo ""
echo "   You need the SOURCE project's hash parameters."
echo "   Firebase Console → Authentication → Settings → Password hash parameters"
echo ""
read -r -p "   hash-algo (e.g. SCRYPT, STANDARD_SCRYPT, BCRYPT): " HASH_ALGO
read -r -p "   hash-key (base64-encoded signer key): " HASH_KEY
read -r -p "   salt-separator (base64): " SALT_SEP
read -r -p "   rounds (e.g. 8): " ROUNDS
read -r -p "   mem-cost (e.g. 14): " MEM_COST
echo ""

firebase auth:import "$EXPORT_FILE" \
  --project "$TARGET" \
  --hash-algo="$HASH_ALGO" \
  --hash-key="$HASH_KEY" \
  --salt-separator="$SALT_SEP" \
  --rounds="$ROUNDS" \
  --mem-cost="$MEM_COST"

echo ""
echo "✅ Auth users cloned."
echo ""
echo "🗑️  IMPORTANT — delete the export file when done; it contains password hashes:"
echo "    rm $EXPORT_FILE"
