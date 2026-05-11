import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { defineSecret } from 'firebase-functions/params';
import { mirrorUpsert, mirrorSoftDelete } from './lib/mirror-doc';

const DEV_SERVICE_ACCOUNT_JSON = defineSecret('DEV_SERVICE_ACCOUNT_JSON');

// Real-time mirror is top-level only. Sub-collections (e.g.
// assets/*/maintenance/*) are caught by the nightly clone — see
// .github/workflows/clone-prod-to-dev.yml. Add more triggers below
// only when real-time on a sub-collection is actually required.
const MIRRORED_COLLECTIONS = [
  'users',
  'organizations',
  'subscriptions',
  'assets',
  'inventoryItems',
  'requests',
  'warranties',
] as const;

const runtime = {
  region: 'us-central1',
  secrets: [DEV_SERVICE_ACCOUNT_JSON],
  memory: '256MiB' as const,
  timeoutSeconds: 60,
  retry: false,
};

function makeTrigger(collection: string) {
  return onDocumentWritten({ document: `${collection}/{id}`, ...runtime }, async (event) => {
    const id = event.params.id;
    const before = event.data?.before;
    const after = event.data?.after;

    if (after?.exists) {
      await mirrorUpsert(collection, id, after.data() ?? {});
    } else if (before?.exists) {
      await mirrorSoftDelete(collection, id);
    }
  });
}

export const mirrorUsers = makeTrigger('users');
export const mirrorOrganizations = makeTrigger('organizations');
export const mirrorSubscriptions = makeTrigger('subscriptions');
export const mirrorAssets = makeTrigger('assets');
export const mirrorInventoryItems = makeTrigger('inventoryItems');
export const mirrorRequests = makeTrigger('requests');
export const mirrorWarranties = makeTrigger('warranties');

// Compile-time assertion — keep the list and exports in sync.
const _ensureAllCovered: (typeof MIRRORED_COLLECTIONS)[number] =
  '' as (typeof MIRRORED_COLLECTIONS)[number];
void _ensureAllCovered;
