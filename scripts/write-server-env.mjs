/**
 * Writes server-side environment variables to .env.production.local so that
 * Next.js bakes them into the server bundle at build time.
 *
 * Amplify Hosting does not inject non-NEXT_PUBLIC_ env vars into the SSR
 * Lambda runtime — they are only available during the build phase. This script
 * runs in preBuild and captures the values before `next build` runs.
 */

import { writeFileSync } from 'fs';

const vars = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY',
  'FIREBASE_SERVICE_ACCOUNT_BASE64',
  'RESEND_API_KEY',
  'RESEND_FROM_EMAIL',
  'CRON_SECRET',
  'NEXT_PUBLIC_APP_ENV',
];

const lines = vars
  .filter((key) => process.env[key] !== undefined)
  .map((key) => {
    const value = process.env[key];
    // Wrap in double quotes and escape inner double quotes and backslashes
    const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return `${key}="${escaped}"`;
  });

writeFileSync('.env.production.local', lines.join('\n') + '\n');
console.log(`[write-server-env] wrote ${lines.length} vars to .env.production.local`);
lines.forEach((l) => console.log(' ', l.split('=')[0]));
