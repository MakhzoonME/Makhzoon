import { NextRequest, NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant';
import { getSignedUrl, BUCKETS } from '@/lib/storage/upload';

const KNOWN_BUCKETS = new Set(Object.values(BUCKETS).map((b) => b.bucket));

/**
 * Returns a short-lived signed URL for a private storage object.
 * GET /api/storage/sign?bucket=warranty-documents&path=<orgId>/<file>
 */
export async function GET(req: NextRequest) {
  try {
    await resolveTenant(); // auth + tenant guard

    const bucket = req.nextUrl.searchParams.get('bucket');
    const path = req.nextUrl.searchParams.get('path');
    if (!bucket || !path) {
      return NextResponse.json({ error: 'Missing bucket or path' }, { status: 400 });
    }
    if (!KNOWN_BUCKETS.has(bucket)) {
      return NextResponse.json({ error: 'Unknown bucket' }, { status: 400 });
    }

    const url = await getSignedUrl(bucket, path, 60 * 10); // 10 minutes
    return NextResponse.json({ url });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[GET /api/storage/sign]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
