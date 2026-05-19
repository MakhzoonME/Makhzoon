import { SignJWT, importPKCS8 } from 'jose';

// Google Drive auth without the googleapis/@googleapis SDK — a service-account
// JWT is signed with `jose` and exchanged for an OAuth access token via fetch.
// Keeps the OpenNext worker bundle small enough for the Cloudflare free tier.

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

const SCOPE = 'https://www.googleapis.com/auth/drive.file';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }

  const clientEmail = requireEnv('GOOGLE_DRIVE_CLIENT_EMAIL');
  const privateKeyPem = requireEnv('GOOGLE_DRIVE_PRIVATE_KEY').replace(/\\n/g, '\n');
  const key = await importPKCS8(privateKeyPem, 'RS256');

  const assertion = await new SignJWT({ scope: SCOPE })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(clientEmail)
    .setAudience(TOKEN_URL)
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(key);

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  if (!res.ok) {
    throw new Error(`Google token exchange failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return data.access_token;
}

export function getFolderId(): string {
  return requireEnv('GOOGLE_DRIVE_FOLDER_ID');
}
