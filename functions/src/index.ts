// ============================================================================
// DORMANT — DO NOT DEPLOY WITHOUT UPGRADING THE PROD FIREBASE PROJECT TO BLAZE.
// ============================================================================
// Cloud Functions v2, Secret Manager, and cross-project writes all require
// the Blaze (pay-as-you-go) plan. On Spark, deploy attempts will error.
//
// The functions/ directory is intentionally left in source — see
// .github/workflows/deploy-mirror-functions.yml for the deploy path, which
// requires an explicit confirmation input. The functions block has also been
// removed from firebase.json so `firebase deploy` (without --only) ignores
// this codebase entirely.
//
// To revive:
//   1. Upgrade prod to Blaze + enable Identity Platform + Secret Manager API.
//   2. Restore the "functions" block to firebase.json.
//   3. Run the deploy workflow with the confirmation input set.
//
// Mirror functions — when active they listen for prod writes and mirror to
// the dev project via the DEV_SERVICE_ACCOUNT_JSON secret. Soft-delete
// semantics: dev docs are never physically deleted; they get
// _mirrorState='deleted' instead.
//
// PII NOTE: This deployment intentionally does NOT scrub. Dev must have
// the same access controls as prod.

export {
  mirrorUsers,
  mirrorOrganizations,
  mirrorSubscriptions,
  mirrorAssets,
  mirrorInventoryItems,
  mirrorRequests,
  mirrorWarranties,
} from './firestore-mirror';

export { mirrorStorageFinalize, mirrorStorageDelete } from './storage-mirror';

export { mirrorAuthCreate } from './auth-mirror';
