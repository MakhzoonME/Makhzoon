import { getAccessToken, getFolderId } from './client';

export type UploadKind = 'avatar' | 'receipt';

export interface UploadResult {
  fileId: string;
  url: string;
  name: string;
}

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3';

export async function uploadToDrive(opts: {
  kind: UploadKind;
  userId: string;
  filename: string;
  contentType: string;
  buffer: ArrayBuffer;
}): Promise<UploadResult> {
  const token = await getAccessToken();
  const folderId = getFolderId();

  const safeName = opts.filename.replace(/[^\w.\-]+/g, '_');
  const stamped = `${opts.kind}-${opts.userId}-${Date.now()}-${safeName}`;

  // multipart/related upload: JSON metadata part + binary media part.
  const boundary = `mz${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  const metadata = JSON.stringify({ name: stamped, parents: [folderId] });
  const head =
    `--${boundary}\r\n` +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    `${metadata}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: ${opts.contentType}\r\n\r\n`;
  const body = new Blob([head, opts.buffer, `\r\n--${boundary}--`]);

  const createRes = await fetch(
    `${DRIVE_UPLOAD}/files?uploadType=multipart&fields=id,name`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    },
  );
  if (!createRes.ok) {
    throw new Error(`Drive upload failed: ${createRes.status} ${await createRes.text()}`);
  }
  const created = (await createRes.json()) as { id?: string; name?: string };
  const fileId = created.id;
  if (!fileId) throw new Error('Drive upload returned no file ID');

  const permRes = await fetch(`${DRIVE_API}/files/${fileId}/permissions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ role: 'reader', type: 'anyone' }),
  });
  if (!permRes.ok) {
    throw new Error(`Drive permission failed: ${permRes.status} ${await permRes.text()}`);
  }

  return {
    fileId,
    url: `https://lh3.googleusercontent.com/d/${fileId}`,
    name: created.name ?? stamped,
  };
}

export async function deleteFromDrive(fileId: string): Promise<void> {
  const token = await getAccessToken();
  const res = await fetch(`${DRIVE_API}/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  // 204 on success; 404 means it is already gone — tolerate both.
  if (!res.ok && res.status !== 404) {
    throw new Error(`Drive delete failed: ${res.status} ${await res.text()}`);
  }
}

export function extractDriveFileId(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}
