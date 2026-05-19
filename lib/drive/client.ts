import { drive, drive_v3, auth } from '@googleapis/drive';

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

let cached: drive_v3.Drive | null = null;

export function getDrive(): drive_v3.Drive {
  if (cached) return cached;
  const jwt = new auth.JWT({
    email: requireEnv('GOOGLE_DRIVE_CLIENT_EMAIL'),
    key: requireEnv('GOOGLE_DRIVE_PRIVATE_KEY').replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });
  cached = drive({ version: 'v3', auth: jwt });
  return cached;
}

export function getFolderId(): string {
  return requireEnv('GOOGLE_DRIVE_FOLDER_ID');
}
