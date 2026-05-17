import { Readable } from 'stream';
import { getDrive, getFolderId } from './client';

export type UploadKind = 'avatar' | 'receipt';

export interface UploadResult {
  fileId: string;
  url: string;
  name: string;
}

export async function uploadToDrive(opts: {
  kind: UploadKind;
  userId: string;
  filename: string;
  contentType: string;
  buffer: Buffer;
}): Promise<UploadResult> {
  const drive = getDrive();
  const folderId = getFolderId();

  const safeName = opts.filename.replace(/[^\w.\-]+/g, '_');
  const stamped = `${opts.kind}-${opts.userId}-${Date.now()}-${safeName}`;

  const res = await drive.files.create({
    requestBody: {
      name: stamped,
      parents: [folderId],
    },
    media: {
      mimeType: opts.contentType,
      body: Readable.from(opts.buffer),
    },
    fields: 'id, name',
  });

  const fileId = res.data.id;
  if (!fileId) throw new Error('Drive upload returned no file ID');

  await drive.permissions.create({
    fileId,
    requestBody: { role: 'reader', type: 'anyone' },
  });

  return {
    fileId,
    url: `https://lh3.googleusercontent.com/d/${fileId}`,
    name: res.data.name ?? stamped,
  };
}

export async function deleteFromDrive(fileId: string): Promise<void> {
  const drive = getDrive();
  await drive.files.delete({ fileId });
}

export function extractDriveFileId(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}
