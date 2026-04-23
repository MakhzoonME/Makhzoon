import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/firebase/auth-helpers';
import { getOrganizationBySubdomain } from '@/lib/firestore/organizations';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ subdomain: string }> }) {
  const user = await verifySessionCookie();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { subdomain } = await params;
  const org = await getOrganizationBySubdomain(subdomain);
  if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ id: org.id, name: org.name, subdomain: org.subdomain });
}
