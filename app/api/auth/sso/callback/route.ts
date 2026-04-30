import { NextRequest, NextResponse } from 'next/server';
// TODO: Re-enable when SSO is ready for production
// import { cookies } from 'next/headers';
// import { getOrgSSOConfig, storePendingSSO } from '@/lib/firestore/sso-config';
// import { fetchOIDCDiscovery } from '@/lib/oidc/discovery';
// import { exchangeCodeForTokens, verifyIdToken } from '@/lib/oidc/tokens';
// import { adminAuth, adminDb } from '@/lib/firebase/admin';
// import { randomBytes } from 'crypto';
// import { getInvites, markInviteAccepted } from '@/lib/firestore/invites';
// import { createUser } from '@/lib/firestore/users';
// import { writeAuditLog } from '@/lib/audit/logger';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
// const REDIRECT_URI = `${APP_URL}/api/auth/sso/callback`;

export async function GET(_req: NextRequest) {
  // TODO: Re-enable when SSO is ready for production — remove this redirect and restore handler below
  return NextResponse.redirect(new URL('/login?sso_error=sso_disabled', APP_URL));

  // const url = _req.nextUrl;
  // const code = url.searchParams.get('code');
  // const state = url.searchParams.get('state');
  // const errorParam = url.searchParams.get('error');
  // if (errorParam) {
  //   return NextResponse.redirect(new URL(`/login?sso_error=${encodeURIComponent(errorParam)}`, APP_URL));
  // }
  // if (!code || !state) {
  //   return NextResponse.redirect(new URL('/login?sso_error=missing_params', APP_URL));
  // }
  // const cookieStore = cookies();
  // const savedState = cookieStore.get('sso_state')?.value;
  // const codeVerifier = cookieStore.get('sso_verifier')?.value;
  // const orgId = cookieStore.get('sso_org_id')?.value;
  // cookieStore.delete('sso_state');
  // cookieStore.delete('sso_verifier');
  // cookieStore.delete('sso_org_id');
  // if (!savedState || !codeVerifier || !orgId) {
  //   return NextResponse.redirect(new URL('/login?sso_error=session_expired', APP_URL));
  // }
  // if (state !== savedState) {
  //   return NextResponse.redirect(new URL('/login?sso_error=state_mismatch', APP_URL));
  // }
  // try {
  //   const ssoConfig = await getOrgSSOConfig(orgId);
  //   if (!ssoConfig?.enabled) {
  //     return NextResponse.redirect(new URL('/login?sso_error=sso_disabled', APP_URL));
  //   }
  //   const discovery = await fetchOIDCDiscovery(ssoConfig.issuerUrl);
  //   const tokenResponse = await exchangeCodeForTokens({
  //     tokenEndpoint: discovery.token_endpoint,
  //     code,
  //     codeVerifier,
  //     clientId: ssoConfig.clientId,
  //     clientSecret: ssoConfig.clientSecret,
  //     redirectUri: REDIRECT_URI,
  //   });
  //   const claims = await verifyIdToken({
  //     idToken: tokenResponse.id_token,
  //     jwksUri: discovery.jwks_uri,
  //     clientId: ssoConfig.clientId,
  //     issuer: discovery.issuer,
  //   });
  //   const { email } = claims;
  //   const orgDoc = await adminDb.collection('organizations').doc(orgId).get();
  //   const orgSlug = orgDoc.exists ? (orgDoc.data()?.subdomain as string) : null;
  //   if (!orgSlug) {
  //     return NextResponse.redirect(new URL('/login?sso_error=org_not_found', APP_URL));
  //   }
  //   let firebaseUser = await adminAuth.getUserByEmail(email).catch(() => null);
  //   if (!firebaseUser) {
  //     const pendingInvites = await getInvites(orgId);
  //     const matchedInvite = pendingInvites.find(
  //       (inv) => inv.email?.toLowerCase() === email.toLowerCase() && inv.status === 'pending',
  //     );
  //     if (!matchedInvite) {
  //       return NextResponse.redirect(new URL('/login?sso_error=no_account', APP_URL));
  //     }
  //     const newUser = await adminAuth.createUser({ email, displayName: matchedInvite.displayName, emailVerified: true });
  //     firebaseUser = newUser;
  //     await adminAuth.setCustomUserClaims(newUser.uid, { role: matchedInvite.role, organizationId: orgId });
  //     await createUser(newUser.uid, {
  //       organizationId: orgId, email, username: matchedInvite.username, displayName: matchedInvite.displayName,
  //       role: matchedInvite.role, status: 'active', permissions: matchedInvite.permissions ?? null,
  //       createdBy: matchedInvite.invitedBy, updatedBy: matchedInvite.invitedBy,
  //     });
  //     await markInviteAccepted(matchedInvite.id, newUser.uid);
  //     await writeAuditLog({
  //       organizationId: orgId, userId: newUser.uid, role: matchedInvite.role,
  //       action: 'SSO_INVITE_ACCEPTED', module: 'users', recordId: matchedInvite.id,
  //       newValue: { email, role: matchedInvite.role, provider: 'oidc' },
  //     });
  //   } else {
  //     const existingClaims = (await adminAuth.getUser(firebaseUser.uid)).customClaims;
  //     if (existingClaims?.organizationId !== orgId) {
  //       return NextResponse.redirect(new URL('/login?sso_error=wrong_org', APP_URL));
  //     }
  //   }
  //   const customToken = await adminAuth.createCustomToken(firebaseUser.uid);
  //   const nonce = randomBytes(24).toString('hex');
  //   await storePendingSSO(nonce, customToken, orgSlug);
  //   return NextResponse.redirect(new URL(`/auth/sso-complete?nonce=${nonce}`, APP_URL));
  // } catch (err) {
  //   console.error('[GET /api/auth/sso/callback]', err);
  //   return NextResponse.redirect(new URL('/login?sso_error=callback_failed', APP_URL));
  // }
}
