import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Image/document uploads live in dedicated Supabase Storage buckets — one per
// content type. We previously used a Google Drive service account, but service
// accounts have no Drive storage quota (403 storageQuotaExceeded), so all
// uploads failed. Supabase Storage is native to the stack.
//
// Public buckets (avatars, receipt-logos) serve stable public URLs for <img>.
// Private buckets (financial/legal docs) are read via short-lived signed URLs;
// persist the returned `bucket` + `path`, then re-sign on read with getSignedUrl.

export type UploadKind =
  | 'avatar'
  | 'logo'
  | 'asset-receipt'
  | 'inventory-receipt'
  | 'warranty-document'
  | 'purchase-invoice';

interface BucketDef {
  bucket: string;
  /** Public buckets serve open URLs; private buckets require signed URLs. */
  isPublic: boolean;
}

export const BUCKETS: Record<UploadKind, BucketDef> = {
  'avatar':            { bucket: 'avatars',            isPublic: true },
  'logo':              { bucket: 'receipt-logos',      isPublic: true },
  'asset-receipt':     { bucket: 'asset-receipts',     isPublic: false },
  'inventory-receipt': { bucket: 'inventory-receipts', isPublic: false },
  'warranty-document': { bucket: 'warranty-documents', isPublic: false },
  'purchase-invoice':  { bucket: 'purchase-invoices',  isPublic: false },
};

export interface UploadResult {
  bucket: string;
  /** Object path inside the bucket. Persist this for private buckets. */
  path: string;
  /** Public URL (public buckets) or 1h signed URL (private buckets). */
  url: string;
  name: string;
  /** True for public buckets — url is stable; false → re-sign on read. */
  public: boolean;
}

export async function uploadToStorage(opts: {
  kind: UploadKind;
  /** Path prefix for tenant/owner scoping (user id, org id, or entity id). */
  ownerId: string;
  filename: string;
  contentType: string;
  buffer: ArrayBuffer;
}): Promise<UploadResult> {
  const def = BUCKETS[opts.kind];
  const safeName = opts.filename.replace(/[^\w.\-]+/g, '_');
  const path = `${opts.ownerId}/${Date.now()}-${safeName}`;

  const { error } = await supabaseAdmin.storage
    .from(def.bucket)
    .upload(path, opts.buffer, { contentType: opts.contentType, upsert: false });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  let url: string;
  if (def.isPublic) {
    url = supabaseAdmin.storage.from(def.bucket).getPublicUrl(path).data.publicUrl;
  } else {
    url = await getSignedUrl(def.bucket, path, 60 * 60);
  }
  return { bucket: def.bucket, path, url, name: safeName, public: def.isPublic };
}

/** Re-sign a private object for reading. Store bucket+path, sign on demand. */
export async function getSignedUrl(bucket: string, path: string, expiresIn = 3600): Promise<string> {
  const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) throw new Error(`Signed URL failed: ${error.message}`);
  return data.signedUrl;
}

/** Accepts a bucket-relative path or a full public URL for that bucket. */
export function extractStoragePath(bucket: string, pathOrUrl: string | null | undefined): string | null {
  if (!pathOrUrl) return null;
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = pathOrUrl.indexOf(marker);
  if (idx !== -1) return decodeURIComponent(pathOrUrl.slice(idx + marker.length));
  return pathOrUrl.startsWith('http') ? null : pathOrUrl;
}

export async function deleteFromStorage(bucket: string, pathOrUrl: string | null | undefined): Promise<void> {
  const path = extractStoragePath(bucket, pathOrUrl);
  if (!path) return;
  const { error } = await supabaseAdmin.storage.from(bucket).remove([path]);
  // Tolerate "not found" — the object may already be gone.
  if (error && !/not.?found/i.test(error.message)) {
    throw new Error(`Storage delete failed: ${error.message}`);
  }
}
