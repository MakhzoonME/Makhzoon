import { NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/firebase/auth-helpers';
import { getReportsForOrg } from '@/lib/firestore/reports';

export async function GET() {
  const user = await verifySessionCookie();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!user.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 400 });

  const data = await getReportsForOrg(user.organizationId);
  return NextResponse.json(data);
}
