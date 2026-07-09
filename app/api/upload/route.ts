import { NextRequest, NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { uploadToStorage, type UploadKind } from '@/lib/storage/upload';
import { z } from 'zod';

const uploadTypeSchema = z.enum(['avatar', 'logo', 'asset-receipt', 'inventory-receipt', 'warranty-document', 'purchase-invoice']);

const IMG = ['image/jpeg', 'image/png', 'image/webp'];
const DOC = [...IMG, 'application/pdf'];

const ALLOWED_TYPES: Record<UploadKind, string[]> = {
  'avatar': IMG,
  'logo': [...IMG, 'image/svg+xml'],
  'asset-receipt': DOC,
  'inventory-receipt': DOC,
  'warranty-document': DOC,
  'purchase-invoice': DOC,
};

const MB = 1024 * 1024;
const MAX_SIZES: Record<UploadKind, number> = {
  'avatar': 5 * MB,
  'logo': 2 * MB,
  'asset-receipt': 10 * MB,
  'inventory-receipt': 10 * MB,
  'warranty-document': 10 * MB,
  'purchase-invoice': 10 * MB,
};

function isUploadKind(v: unknown): v is UploadKind {
  return uploadTypeSchema.safeParse(v).success;
}

export async function POST(req: NextRequest) {
  const clientIp = getClientIp(req);
  const rateLimitResult = await checkRateLimit(
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
    const result = await uploadToStorage({
      kind: type,
      ownerId: user.uid,
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
