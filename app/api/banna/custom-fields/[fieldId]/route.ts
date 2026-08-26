import { NextRequest, NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant';
import { requireFeature } from '@/lib/permissions/require-feature';
import { BannaService } from '@/lib/modules/banna/services/banna.service';
import { updateCustomFieldSchema } from '@/lib/modules/banna/validators/schemas';
import type { TenantContext } from '@/lib/platform/tenancy/types';

const service = new BannaService();

// Customer custom fields ship ahead of the rest of Banna (which isn't released
// — no org has the 'banna' feature flag yet) and ride on the 'pos' feature
// instead. The collection route branches on the request's module filter; here
// we only have the field id, so we look up the field first and gate on its
// actual module. See app/api/banna/custom-fields/route.ts.
function featureForModule(module: string): 'pos' | 'banna' {
  return module === 'customers' ? 'pos' : 'banna';
}

async function loadAndGate(tenant: TenantContext, fieldId: string) {
  const field = await service.getCustomField(tenant, fieldId);
  requireFeature(tenant, featureForModule(field.module));
  return field;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ fieldId: string }> }) {
  try {
    const tenant = await resolveTenant();
    const { fieldId } = await params;
    const field = await loadAndGate(tenant, fieldId);
    return NextResponse.json(field);
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[GET /api/banna/custom-fields/[fieldId]]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ fieldId: string }> }) {
  try {
    const tenant = await resolveTenant();
    const { fieldId } = await params;
    await loadAndGate(tenant, fieldId);
    const parsed = updateCustomFieldSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    return NextResponse.json(await service.updateCustomField(tenant, fieldId, parsed.data));
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[PATCH /api/banna/custom-fields/[fieldId]]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ fieldId: string }> }) {
  try {
    const tenant = await resolveTenant();
    const { fieldId } = await params;
    await loadAndGate(tenant, fieldId);
    await service.deleteCustomField(tenant, fieldId);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[DELETE /api/banna/custom-fields/[fieldId]]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
