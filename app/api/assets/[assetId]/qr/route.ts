import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/firebase/auth-helpers';
import { getAssetById } from '@/lib/firestore/assets';
import { generateAssetQRDataUrl, assetUrl } from '@/lib/qr';

export async function GET(req: NextRequest, { params }: { params: { assetId: string } }) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!user.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 400 });

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
