import { NextRequest, NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { uploadToDrive, type UploadKind } from '@/lib/drive/upload';

const ALLOWED_TYPES: Record<UploadKind, string[]> = {
  avatar: ['image/jpeg', 'image/png', 'image/webp'],
  receipt: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/heic',
    'image/heif',
    'image/bmp',
    'image/tiff',
    'image/avif',
  ],
};

const MAX_SIZES: Record<UploadKind, number> = {
  avatar: 5 * 1024 * 1024,
  receipt: 3 * 1024 * 1024,
};

function isUploadKind(v: unknown): v is UploadKind {
  return v === 'avatar' || v === 'receipt';
}

export async function POST(req: NextRequest) {
  const clientIp = getClientIp(req);
  const rateLimitResult = checkRateLimit(
    `upload:${clientIp}`,
    20,
    60 * 60 * 1000,
    { action: 'upload' },
  );
  if (rateLimitResult) return rateLimitResult;

  try {
    const tenant = await resolveTenant();
    const user = tenant.user;

    const form = await req.formData();
    const file = form.get('file');
    const type = form.get('type');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 });
    }
    if (!isUploadKind(type)) {
      return NextResponse.json({ error: 'Invalid upload type' }, { status: 400 });
    }
    if (!ALLOWED_TYPES[type].includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }
    if (file.size > MAX_SIZES[type]) {
      return NextResponse.json({ error: 'File too large' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const result = await uploadToDrive({
      kind: type,
      userId: user.uid,
      filename: file.name,
      contentType: file.type,
      buffer,
    });

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[POST /api/upload]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
