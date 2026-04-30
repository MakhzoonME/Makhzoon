import { NextRequest, NextResponse } from 'next/server';
// TODO: Re-enable when SSO is ready for production
// import { getOrgSSOConfigByDomain } from '@/lib/firestore/sso-config';
// import { adminDb } from '@/lib/firebase/admin';

export async function GET(_req: NextRequest) {
  // TODO: Re-enable when SSO is ready for production — replace this with the real lookup below
  return NextResponse.json({ ssoEnabled: false, ssoEnforced: false, orgId: null, orgSlug: null });

  // try {
  //   const domain = _req.nextUrl.searchParams.get('domain');
  //   if (!domain || !domain.includes('.')) {
  //     return NextResponse.json({ ssoEnabled: false, ssoEnforced: false });
  //   }
  //   const ssoConfig = await getOrgSSOConfigByDomain(domain);
  //   if (!ssoConfig?.enabled) {
  //     return NextResponse.json({ ssoEnabled: false, ssoEnforced: false });
  //   }
  //   const orgDoc = await adminDb.collection('organizations').doc(ssoConfig.organizationId).get();
  //   const orgSlug = orgDoc.exists ? (orgDoc.data()?.subdomain as string) : undefined;
  //   return NextResponse.json({
  //     ssoEnabled: true,
  //     ssoEnforced: ssoConfig.enforced,
  //     orgId: ssoConfig.organizationId,
  //     orgSlug,
  //   });
  // } catch (err) {
  //   console.error('[GET /api/auth/sso/check]', err);
  //   return NextResponse.json({ ssoEnabled: false, ssoEnforced: false });
  // }
}
