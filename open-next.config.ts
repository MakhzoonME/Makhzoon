import { defineCloudflareConfig } from '@opennextjs/cloudflare';

// Default OpenNext → Cloudflare Workers config. No R2/KV incremental cache
// configured (internal/staging scope); add `incrementalCache`/`tagCache`
// here later if ISR/on-demand revalidation needs durable storage.
export default defineCloudflareConfig();
