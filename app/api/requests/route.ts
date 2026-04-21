import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/firebase/auth-helpers';
import { getRequests, createRequest } from '@/lib/firestore/requests';
import { writeAuditLog } from '@/lib/audit/logger';
import { requestSchema } from '@/lib/validations/request.schema';

export async function GET(req: NextRequest) {
  const user = await verifySessionCookie();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const orgId = user.organizationId;
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') ?? undefined;
  const userId = user.role === 'staff' ? user.uid : undefined;

  const requests = await getRequests(orgId, { status, userId });
  return NextResponse.json(requests);
}

export async function POST(req: NextRequest) {
  const user = await verifySessionCookie();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const orgId = user.organizationId;
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 });

  const body = await req.json();
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const data = parsed.data;
  const id = await createRequest({
    organizationId: orgId,
    type: data.type,
    assetId: data.assetId || undefined,
    warrantyId: data.warrantyId || undefined,
    description: data.description,
    status: 'PENDING',
    createdBy: user.uid,
    updatedBy: user.uid,
  });

  await writeAuditLog({
    organizationId: orgId,
    userId: user.uid,
    role: user.role,
    action: 'REQUEST_SUBMITTED',
    module: 'requests',
    recordId: id,
    newValue: { type: data.type, description: data.description },
  });

  return NextResponse.json({ id }, { status: 201 });
}
