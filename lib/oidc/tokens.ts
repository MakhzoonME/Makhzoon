import { jwtVerify, createRemoteJWKSet } from 'jose';

interface TokenResponse {
  id_token: string;
  access_token: string;
  token_type: string;
  expires_in?: number;
}

export async function exchangeCodeForTokens(params: {
  tokenEndpoint: string;
  code: string;
  codeVerifier: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: params.code,
    redirect_uri: params.redirectUri,
    client_id: params.clientId,
    client_secret: params.clientSecret,
    code_verifier: params.codeVerifier,
  });

  const res = await fetch(params.tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Token exchange failed: ${res.status} ${error}`);
  }

  return res.json();
}

export async function verifyIdToken(params: {
  idToken: string;
  jwksUri: string;
  clientId: string;
  issuer: string;
}): Promise<{ email: string; sub: string; email_verified: boolean }> {
  const JWKS = createRemoteJWKSet(new URL(params.jwksUri));

  const { payload } = await jwtVerify(params.idToken, JWKS, {
    issuer: params.issuer,
    audience: params.clientId,
  });

  const email = payload.email as string | undefined;
  if (!email) throw new Error('No email in id_token claims');

  return {
    email,
    sub: payload.sub ?? '',
    email_verified: (payload.email_verified as boolean) ?? false,
  };
}
