import { NextRequest, NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant';
import { getAssetById } from '@/lib/db/assets';
import { generateAssetQRDataUrl, assetUrl } from '@/lib/qr';

export async function GET(req: NextRequest, props: { params: Promise<{ assetId: string }> }) {
  const params = await props.params;
  try {
    const tenant = await resolveTenant();
    const user = tenant.user;

    const asset = await getAssetById(params.assetId);
    if (!asset || asset.organizationId !== user.organizationId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const origin = req.nextUrl.origin;
    const [dataUrl, url] = await Promise.all([
      generateAssetQRDataUrl(params.assetId, origin),
      Promise.resolve(assetUrl(params.assetId, origin)),
    ]);

    return NextResponse.json({ dataUrl, url });
  } catch (err) {
    console.error('[GET /api/assets/[assetId]/qr]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
