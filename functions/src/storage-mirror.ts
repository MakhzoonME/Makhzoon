import { onObjectFinalized, onObjectDeleted } from 'firebase-functions/v2/storage';
import { defineSecret } from 'firebase-functions/params';
import { devStorage } from './lib/dev-admin';

const DEV_SERVICE_ACCOUNT_JSON = defineSecret('DEV_SERVICE_ACCOUNT_JSON');

const runtime = {
  region: 'us-central1',
  secrets: [DEV_SERVICE_ACCOUNT_JSON],
  memory: '512MiB' as const,
  timeoutSeconds: 300,
  retry: false,
};

// Cross-project copy via a streamed read → write. Cheaper than going through
// memory for large files but still incurs egress cost from prod's bucket.
export const mirrorStorageFinalize = onObjectFinalized(runtime, async (event) => {
  const { bucket: bucketName, name, contentType, metadata } = event.data;
  if (!name) return;

  const { getStorage } = await import('firebase-admin/storage');
  const { getApps, initializeApp } = await import('firebase-admin/app');
  const prodApp = getApps().find((a) => a.name === '[DEFAULT]') ?? initializeApp();
  const srcFile = getStorage(prodApp).bucket(bucketName).file(name);
  const dstFile = devStorage().bucket().file(name);

  await new Promise<void>((resolve, reject) => {
    srcFile
      .createReadStream()
      .pipe(dstFile.createWriteStream({ metadata: { contentType, metadata } }))
      .on('finish', () => resolve())
      .on('error', reject);
  });
});

// Mirror deletes too — storage deletes are usually intentional and rarely
// destructive in the way Firestore deletes can be. If you want soft-delete
// semantics on Storage as well, mark the dev object's metadata instead.
export const mirrorStorageDelete = onObjectDeleted(runtime, async (event) => {
  const { name } = event.data;
  if (!name) return;
  await devStorage().bucket().file(name).delete({ ignoreNotFound: true });
});
