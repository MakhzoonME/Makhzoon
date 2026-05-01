import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/firebase/auth-helpers';
import { checkoutSchema } from '@/lib/validations/asset-checkout.schema';
import * as assetsService from '@/lib/services/assets.service';

export async function GET(_req: NextRequest, { params }: { params: { assetId: string } }) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const checkouts = await assetsService.getAssetCheckouts(user, params.assetId);
    return NextResponse.json(checkouts);
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (message === 'Asset not found') return NextResponse.json({ error: 'Not found' }, { status: 404 });
    console.error('[GET /api/assets/[assetId]/checkout]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { assetId: string } }) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    const result = await assetsService.createAssetCheckout(user, params.assetId, parsed.data);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (message === 'Asset not found') return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (message === 'Retired assets cannot be checked out')
      return NextResponse.json({ error: message }, { status: 400 });
    if (message === 'Asset is already checked out. Return it first.')
      return NextResponse.json({ error: message }, { status: 409 });
    if (message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('[POST /api/assets/[assetId]/checkout]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
