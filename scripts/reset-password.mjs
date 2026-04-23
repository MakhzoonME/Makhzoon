// Reset a user's password. Usage: node scripts/reset-password.mjs <email> <newPassword>
import { readFileSync } from 'node:fs';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const envFile = readFileSync('.env.local', 'utf8');
for (const line of envFile.split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (!m) continue;
  let [, k, v] = m;
  if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
  if (!process.env[k]) process.env[k] = v;
}

if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}

const [email, password] = process.argv.slice(2);
if (!email || !password) {
  console.error('Usage: node scripts/reset-password.mjs <email> <newPassword>');
  process.exit(1);
}

const auth = getAuth();
const u = await auth.getUserByEmail(email);
await auth.updateUser(u.uid, { password, emailVerified: true });
console.log(`OK — ${u.email}  (uid=${u.uid})  password=${password}  emailVerified=true`);
process.exit(0);
