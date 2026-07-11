import { NextRequest, NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant';
import { requireFeature } from '@/lib/permissions/require-feature';
import { requirePermission } from '@/lib/permissions/require';
import { getAssetById } from '@/lib/db/assets';
import { getAssetNotes, createAssetNote } from '@/lib/db/asset-notes';
import { auditLog } from '@/lib/platform/audit';
import { assetNoteSchema } from '@/lib/validations/asset-note.schema';

export async function GET(_req: NextRequest, props: { params: Promise<{ assetId: string }> }) {
  const params = await props.params;
  try {
    const tenant = await resolveTenant();
    requireFeature(tenant, 'assets');
    const user = tenant.user;

    const asset = await getAssetById(params.assetId);
    if (!asset || asset.organizationId !== user.organizationId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const notes = await getAssetNotes(user.organizationId, params.assetId);
    return NextResponse.json(notes);
  } catch (err) {
    console.error('[GET /api/assets/[assetId]/notes]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, props: { params: Promise<{ assetId: string }> }) {
  const params = await props.params;
  try {
    const tenant = await resolveTenant();
    requireFeature(tenant, 'assets');
    const user = tenant.user;
    requirePermission(user, 'assets', 'notes');

    const asset = await getAssetById(params.assetId);
    if (!asset || asset.organizationId !== user.organizationId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await req.json();
    const parsed = assetNoteSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    const id = await createAssetNote({
      organizationId: user.organizationId,
      spaceId: tenant.spaceId,
      assetId: params.assetId,
      text: parsed.data.text,
      createdBy: user.uid,
      createdByEmail: user.email,
    });

    auditLog.queue({
      tenant,
      action: 'ASSET_NOTE_ADDED',
      module: 'assets',
      recordId: params.assetId,
      newValue: { noteId: id, text: parsed.data.text },
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/assets/[assetId]/notes]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
