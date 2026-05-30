import { NextRequest, NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant';
import { requirePermission } from '@/lib/permissions/require';
import { checkoutSchema } from '@/lib/validations/asset-checkout.schema';
import * as assetsService from '@/lib/services/assets.service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ assetId: string }> }) {
  try {
    const { assetId } = await params;
    const tenant = await resolveTenant();
    const user = tenant.user;

    const checkouts = await assetsService.getAssetCheckouts(user, assetId);
    return NextResponse.json(checkouts);
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (message === 'Asset not found') return NextResponse.json({ error: 'Not found' }, { status: 404 });
    console.error('[GET /api/assets/[assetId]/checkout]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ assetId: string }> }) {
  try {
    const { assetId } = await params;
    const tenant = await resolveTenant();
    const user = tenant.user;
    requirePermission(user, 'assets', 'checkout');

    const body = await req.json();
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    const result = await assetsService.createAssetCheckout(user, assetId, parsed.data, tenant.spaceId);
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
