export interface NavItemConfig {
  href: string;
  label: string;
  adminOnly?: boolean;
  featureKey?: string;
}

export const ORG_NAV_ITEMS: NavItemConfig[] = [
  { href: '/dashboard',    label: 'Dashboard',    featureKey: 'dashboard' },
  { href: '/assets',       label: 'Assets',        featureKey: 'assets' },
  { href: '/inventory',    label: 'Inventory',     featureKey: 'inventory' },
  { href: '/warranties',   label: 'Warranties',    featureKey: 'warranties' },
  { href: '/requests',     label: 'Requests',      featureKey: 'requests' },
  { href: '/reports',      label: 'Reports',       adminOnly: true, featureKey: 'reports' },
  { href: '/users',        label: 'Users',         adminOnly: true },
  { href: '/subscription', label: 'Subscription',  adminOnly: true },
  { href: '/support',      label: 'Support',       featureKey: 'support' },
  { href: '/audit-logs',   label: 'Audit Logs',    adminOnly: true, featureKey: 'auditLogs' },
];

export function getFirstAccessiblePath(opts: {
  role: string;
  features: Record<string, boolean>;
}): string {
  const isAdmin = opts.role === 'admin' || opts.role === 'super_admin' || opts.role === 'org_owner';
  for (const item of ORG_NAV_ITEMS) {
    if (item.adminOnly && !isAdmin) continue;
    if (item.featureKey && opts.features[item.featureKey] === false) continue;
    return item.href;
  }
  return '/dashboard';
}
