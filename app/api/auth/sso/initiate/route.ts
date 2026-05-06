import { NextRequest, NextResponse } from 'next/server';
// TODO: Re-enable when SSO is ready for production
// import { getOrgSSOConfig } from '@/lib/firestore/sso-config';
// import { fetchOIDCDiscovery } from '@/lib/oidc/discovery';
// import { generateCodeVerifier, generateCodeChallenge, generateState } from '@/lib/oidc/pkce';
// import { cookies } from 'next/headers';

// const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
// const REDIRECT_URI = `${APP_URL}/api/auth/sso/callback`;
// const COOKIE_MAX_AGE = 10 * 60; // 10 minutes

export async function GET(_req: NextRequest) {
  // TODO: Re-enable when SSO is ready for production — remove this early return and restore handler below
  return NextResponse.json({ error: 'SSO is not enabled' }, { status: 503 });

  // try {
  //   const orgId = _req.nextUrl.searchParams.get('orgId');
  //   if (!orgId) {
  //     return NextResponse.json({ error: 'Missing orgId' }, { status: 400 });
  //   }
  //   const ssoConfig = await getOrgSSOConfig(orgId);
  //   if (!ssoConfig?.enabled) {
  //     return NextResponse.json({ error: 'SSO not enabled for this organization' }, { status: 400 });
  //   }
  //   const discovery = await fetchOIDCDiscovery(ssoConfig.issuerUrl);
  //   const codeVerifier = generateCodeVerifier();
  //   const codeChallenge = generateCodeChallenge(codeVerifier);
  //   const state = generateState();
  //   const cookieStore = cookies();
  //   cookieStore.set('sso_state', state, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: COOKIE_MAX_AGE, path: '/' });
  //   cookieStore.set('sso_verifier', codeVerifier, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: COOKIE_MAX_AGE, path: '/' });
  //   cookieStore.set('sso_org_id', orgId, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: COOKIE_MAX_AGE, path: '/' });
  //   const authUrl = new URL(discovery.authorization_endpoint);
  //   authUrl.searchParams.set('response_type', 'code');
  //   authUrl.searchParams.set('client_id', ssoConfig.clientId);
  //   authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  //   authUrl.searchParams.set('scope', 'openid email profile');
  //   authUrl.searchParams.set('state', state);
  //   authUrl.searchParams.set('code_challenge', codeChallenge);
  //   authUrl.searchParams.set('code_challenge_method', 'S256');
  //   return NextResponse.json({ authUrl: authUrl.toString() });
  // } catch (err) {
  //   console.error('[GET /api/auth/sso/initiate]', err);
  //   return NextResponse.json({ error: 'Failed to initiate SSO' }, { status: 500 });
  // }
}
