const RESERVED = new Set(['', 'www', 'app', 'admin', 'api', 'static']);

function splitHost(host: string): { hostname: string; port: string } {
  const idx = host.indexOf(':');
  return idx === -1
    ? { hostname: host, port: '' }
    : { hostname: host.slice(0, idx), port: host.slice(idx) };
}

export function currentSubdomain(host: string): string | null {
  const { hostname } = splitHost(host);
  const lower = hostname.toLowerCase();
  if (lower === 'localhost' || /^\d{1,3}(\.\d{1,3}){3}$/.test(lower)) return null;
  const parts = lower.split('.');
  if (parts.length === 2 && parts[1] === 'localhost') {
    return RESERVED.has(parts[0]) ? null : parts[0];
  }
  if (parts.length >= 3) {
    return RESERVED.has(parts[0]) ? null : parts[0];
  }
  return null;
}

export function rootHost(host: string): string {
  const { hostname, port } = splitHost(host);
  const lower = hostname.toLowerCase();
  if (lower === 'localhost') return hostname + port;
  const parts = lower.split('.');
  if (parts.length >= 2 && parts[parts.length - 1] === 'localhost') return 'localhost' + port;
  if (parts.length >= 3) return parts.slice(-2).join('.') + port;
  return hostname + port;
}

export function buildTenantUrl(subdomain: string, pathname = '/dashboard'): string {
  if (typeof window === 'undefined') return pathname;
  const root = rootHost(window.location.host);
  return `${window.location.protocol}//${subdomain}.${root}${pathname}`;
}

export function buildRootUrl(pathname = '/super-admin'): string {
  if (typeof window === 'undefined') return pathname;
  const root = rootHost(window.location.host);
  return `${window.location.protocol}//${root}${pathname}`;
}
