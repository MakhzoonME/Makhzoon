// Mirror functions — deployed to the PROD Firebase project.
// They listen for prod writes and mirror to the dev project via the
// DEV_SERVICE_ACCOUNT_JSON secret. Soft-delete semantics: dev docs are
// never physically deleted; they get _mirrorState='deleted' instead.
//
// PII NOTE: This deployment intentionally does NOT scrub. Dev must have
// the same access controls as prod. See ADR / CLAUDE.md.

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
