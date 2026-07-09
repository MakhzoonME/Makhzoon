import { NextRequest, NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant';
import { rateLimitTenant } from '@/lib/rate-limit';
import { BannaValuesService } from '@/lib/modules/banna/services/banna-values.service';
import type { CustomFieldRecordType, UpsertCustomFieldValueInput } from '@/types/banna.types';

const service = new BannaValuesService();

const VALID_RECORD_TYPES = new Set<CustomFieldRecordType>(['assets', 'inventory', 'requests']);

export async function GET(req: NextRequest) {
  try {
    const tenant = await resolveTenant();
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
    const limited = await rateLimitTenant(tenant, 'banna', 30, 60_000);
    if (limited) return limited;

    const body = await req.json() as {
      recordType: CustomFieldRecordType;
      recordId: string;
      values: UpsertCustomFieldValueInput[];
    };

    if (!VALID_RECORD_TYPES.has(body.recordType) || !body.recordId)
      return NextResponse.json({ error: 'recordType and recordId are required' }, { status: 400 });
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
