import { NextRequest, NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant';
import { BannaService } from '@/lib/modules/banna/services/banna.service';
import { updateCustomFieldSchema } from '@/lib/modules/banna/validators/schemas';

const service = new BannaService();

export async function GET(_req: NextRequest, { params }: { params: Promise<{ fieldId: string }> }) {
  try {
    const tenant = await resolveTenant();
    const { fieldId } = await params;
    const field = await service.getCustomField(tenant, fieldId);
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
    await service.deleteCustomField(tenant, fieldId);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[DELETE /api/banna/custom-fields/[fieldId]]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
