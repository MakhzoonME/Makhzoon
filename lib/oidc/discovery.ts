import { OIDCDiscovery } from '@/types/sso.types';

const cache = new Map<string, { data: OIDCDiscovery; expiresAt: number }>();

export async function fetchOIDCDiscovery(issuerUrl: string): Promise<OIDCDiscovery> {
  const now = Date.now();
  const cached = cache.get(issuerUrl);
  if (cached && cached.expiresAt > now) return cached.data;

  const url = issuerUrl.replace(/\/$/, '') + '/.well-known/openid-configuration';
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`Failed to fetch OIDC discovery from ${url}: ${res.status}`);

  const data = (await res.json()) as OIDCDiscovery;
  if (!data.authorization_endpoint || !data.token_endpoint || !data.jwks_uri) {
    throw new Error('Invalid OIDC discovery document: missing required fields');
  }

  cache.set(issuerUrl, { data, expiresAt: now + 3600 * 1000 });
  return data;
}
