import { NextRequest, NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant';
import { warrantySchema } from '@/lib/validations/warranty.schema';
import * as warrantiesService from '@/lib/modules/warranties/services/warranties.service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ warrantyId: string }> }) {
  try {
    const tenant = await resolveTenant();
    const { warrantyId } = await params;
    const warranty = await warrantiesService.getById(tenant, warrantyId);
    return NextResponse.json(warranty);
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[GET /api/warranties/[warrantyId]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ warrantyId: string }> }) {
  try {
    const tenant = await resolveTenant();
    const { warrantyId } = await params;

    const body = await req.json();
    const parsed = warrantySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    const data = parsed.data;
    await warrantiesService.update(tenant, warrantyId, {
      vendor: data.vendor,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      reminder: data.reminder,
      notes: data.notes || undefined,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[PUT /api/warranties/[warrantyId]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ warrantyId: string }> }) {
  try {
    const tenant = await resolveTenant();
    const { warrantyId } = await params;
    await warrantiesService.del(tenant, warrantyId);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[DELETE /api/warranties/[warrantyId]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
