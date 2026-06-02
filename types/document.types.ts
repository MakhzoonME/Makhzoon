/**
 * Reference to a file stored in a Supabase Storage bucket. Persisted as JSONB
 * on entities that carry attachments (assets, inventory items, warranties,
 * purchases). For public buckets `url` is a stable public URL; for private
 * buckets the app re-signs `bucket`+`path` on read.
 */
export interface DocumentRef {
  bucket: string;
  path: string;
  name: string;
  contentType: string;
  url?: string;
  public: boolean;
}
