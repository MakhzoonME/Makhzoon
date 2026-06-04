import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: __dirname,
  },
  // NOTE: no `env` block — Next.js `env` inlines values into the CLIENT
  // bundle. RESEND_API_KEY / CRON_SECRET are server-only secrets read via
  // process.env at runtime (lib/email/resend.ts, app/api/cron/*); Cloudflare
  // provides them as Worker runtime vars/secrets. Inlining them would leak
  // them to the browser.
  async redirects() {
    return [];
  },
  async headers() {
    const isDev = process.env.NODE_ENV !== 'production';
    const evalSrc = isDev ? " 'unsafe-eval'" : '';
    const upgradeInsecure = isDev ? '' : ' upgrade-insecure-requests;';
    return [
      {
        source: '/api/(.*)',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: process.env.NEXT_PUBLIC_APP_URL || 'https://app.makhzoon.me' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, PATCH, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
          { key: 'Access-Control-Max-Age', value: '86400' },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: `default-src 'self'; script-src 'self' 'unsafe-inline'${evalSrc} https://www.googletagmanager.com https://www.clarity.ms https://scripts.clarity.ms https://eu-assets.i.posthog.com https://t.contentsquare.net https://*.heap-api.com https://cdn.lr-ingest.io https://cdn.logrocket.io https://cdn.lr-in.com https://cdn.logr-in.com https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://www.googletagmanager.com https://*.google-analytics.com https://*.analytics.google.com https://*.clarity.ms https://eu.i.posthog.com https://eu-assets.i.posthog.com https://*.contentsquare.net https://*.csq1.net https://*.heap-api.com https://heapanalytics.com https://*.logrocket.io https://*.lr-ingest.io https://*.lr-in.com https://*.logr-in.com https://cloudflareinsights.com; frame-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self';${upgradeInsecure}`,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
