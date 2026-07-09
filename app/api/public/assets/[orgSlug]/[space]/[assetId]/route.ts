import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

/**
 * Public, unauthenticated read-only lookup for the QR "guest view".
 * Only exposes a minimal, non-sensitive subset of asset fields — no
 * costs, notes, documents, audit history, or internal identifiers.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orgSlug: string; space: string; assetId: string }> }
) {
  try {
    const limited = await checkRateLimit(`public-asset:ip:${getClientIp(_req)}`, 60, 60_000);
    if (limited) return limited;

    const { orgSlug, space, assetId } = await params;

    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('id, name')
      .eq('subdomain', orgSlug)
      .maybeSingle();
    if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { data: spaceRow } = await supabaseAdmin
      .from('spaces')
      .select('id, name')
      .eq('organization_id', org.id)
      .eq('slug', space)
      .maybeSingle();
    if (!spaceRow) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { data: asset } = await supabaseAdmin
      .from('assets')
      .select('id, name, category, status, serial_number, location')
      .eq('id', assetId)
      .eq('organization_id', org.id)
      .eq('space_id', spaceRow.id)
      .maybeSingle();
    if (!asset) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({
      id: asset.id,
      name: asset.name,
      category: asset.category,
      status: asset.status,
      serialNumber: asset.serial_number,
      location: asset.location,
      organizationName: org.name,
      spaceName: spaceRow.name,
    });
  } catch (err) {
    console.error('[GET /api/public/assets/[orgSlug]/[space]/[assetId]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
