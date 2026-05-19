// Cloudflare Cron Worker — invokes the Next.js cron API routes on schedule.
// Replaces Vercel cron (vercel.json). Each route authorizes via
// `Authorization: Bearer <CRON_SECRET>` (see app/api/cron/*).

interface Env {
  APP_URL: string;
  CRON_SECRET: string;
}

// Minimal local declaration — avoids pulling @cloudflare/workers-types into
// the app's tsconfig just for one usage. Matches the runtime contract.
interface ScheduledController {
  cron: string;
  scheduledTime: number;
  noRetry(): void;
}

// cron expression → endpoint path. Must match workers/cron/wrangler.toml.
const SCHEDULE: Record<string, string> = {
  '0 9 * * 1': '/api/cron/warranty-alerts',
  '0 1 * * *': '/api/cron/subscription-status',
};

export default {
  async scheduled(event: { cron: string }, env: Env): Promise<void> {
    const path = SCHEDULE[event.cron];
    if (!path) {
      console.error(`[cron] no endpoint mapped for cron "${event.cron}"`);
      return;
    }
    const base = (env.APP_URL ?? '').replace(/\/$/, '');
    if (!base || !env.CRON_SECRET) {
      console.error('[cron] APP_URL or CRON_SECRET not configured');
      return;
    }
    const res = await fetch(`${base}${path}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${env.CRON_SECRET}` },
    });
    const body = await res.text();
    if (!res.ok) {
      console.error(`[cron] ${path} → ${res.status}: ${body.slice(0, 500)}`);
    } else {
      console.log(`[cron] ${path} → ${res.status}`);
    }
  },
};
