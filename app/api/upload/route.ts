import { NextRequest, NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { getUploadPresignedUrl, getPublicUrl } from '@/lib/s3';
import { randomBytes } from 'crypto';

const ALLOWED_TYPES: Record<string, string[]> = {
  avatar: ['image/jpeg', 'image/png', 'image/webp'],
  receipt: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif', 'image/bmp', 'image/tiff', 'image/avif'],
};

const MAX_SIZES: Record<string, number> = {
  avatar: 5 * 1024 * 1024,
  receipt: 3 * 1024 * 1024,
};

export async function POST(req: NextRequest) {
  if (!process.env.APP_AWS_REGION || !process.env.APP_AWS_ACCESS_KEY_ID || !process.env.APP_AWS_SECRET_ACCESS_KEY || !process.env.APP_AWS_S3_BUCKET_NAME) {
    console.error('[POST /api/upload] Missing S3 environment variables: APP_AWS_REGION, APP_AWS_ACCESS_KEY_ID, APP_AWS_SECRET_ACCESS_KEY, APP_AWS_S3_BUCKET_NAME');
    return NextResponse.json({ error: 'File upload is not configured on this server' }, { status: 503 });
  }

  const clientIp = getClientIp(req);
  const rateLimitResult = checkRateLimit(`upload:${clientIp}`, 20, 60 * 60 * 1000, { action: 'upload' });
  if (rateLimitResult) return rateLimitResult;

  try {
    const tenant = await resolveTenant();
    const user = tenant.user;

    const { type, contentType, size } = await req.json();

    if (!type || !ALLOWED_TYPES[type]) {
      return NextResponse.json({ error: 'Invalid upload type' }, { status: 400 });
    }
    if (!ALLOWED_TYPES[type].includes(contentType)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }
    if (!size || size > MAX_SIZES[type]) {
      return NextResponse.json({ error: 'File too large' }, { status: 400 });
    }

    const ext = contentType.split('/')[1];
    const key = `${type}s/${user.uid}/${randomBytes(8).toString('hex')}.${ext}`;

    const uploadUrl = await getUploadPresignedUrl(key, contentType);
    const publicUrl = getPublicUrl(key);

    return NextResponse.json({ uploadUrl, publicUrl });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[POST /api/upload]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
