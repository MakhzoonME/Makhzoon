import { NextRequest, NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant';
import { requireFeature } from '@/lib/permissions/require-feature';
import { rateLimitTenant } from '@/lib/rate-limit';
import { BannaValuesService } from '@/lib/modules/banna/services/banna-values.service';
import type { CustomFieldRecordType, UpsertCustomFieldValueInput } from '@/types/banna.types';
import { z } from 'zod';

const service = new BannaValuesService();

const saveValuesSchema = z.object({
  recordType: z.enum(['assets', 'inventory', 'requests']),
  recordId: z.string().min(1).max(128),
  values: z.array(z.object({
    fieldId: z.string().min(1),
    value: z.unknown(),
  }).passthrough()),
});
const VALID_RECORD_TYPES = new Set<CustomFieldRecordType>(['assets', 'inventory', 'requests']);

export async function GET(req: NextRequest) {
  try {
    const tenant = await resolveTenant();
    requireFeature(tenant, 'banna');
    const limited = await rateLimitTenant(tenant, 'banna', 60, 60_000);
    if (limited) return limited;

    const { searchParams } = new URL(req.url);
    const recordType = searchParams.get('recordType') as CustomFieldRecordType;
    const recordId   = searchParams.get('recordId') ?? '';

    if (!VALID_RECORD_TYPES.has(recordType) || !recordId)
      return NextResponse.json({ error: 'recordType and recordId are required' }, { status: 400 });

    const fields = await service.getValues(tenant, recordType, recordId);
    return NextResponse.json({ items: fields });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[GET /api/banna/values]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const tenant = await resolveTenant();
    requireFeature(tenant, 'banna');
    const limited = await rateLimitTenant(tenant, 'banna', 30, 60_000);
    if (limited) return limited;

    const parsed = saveValuesSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success)
      return NextResponse.json({ error: 'recordType and recordId are required', details: parsed.error.flatten() }, { status: 400 });
    const body = parsed.data as {
      recordType: CustomFieldRecordType;
      recordId: string;
      values: UpsertCustomFieldValueInput[];
    };
    if (!Array.isArray(body.values))
      return NextResponse.json({ error: 'values must be an array' }, { status: 400 });

    await service.saveValues(tenant, body.recordType, body.recordId, body.values);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[PUT /api/banna/values]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
