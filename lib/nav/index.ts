import type { MessageKey } from '@/locales/messages';

export interface NavItemConfig {
  href: string;
  label: string;
  labelKey: MessageKey;
  adminOnly?: boolean;
  featureKey?: string;
}

export const ORG_NAV_ITEMS: NavItemConfig[] = [
  { href: '/dashboard',    label: 'Dashboard',    labelKey: 'nav.dashboard',    featureKey: 'dashboard' },
  { href: '/assets',       label: 'Assets',        labelKey: 'nav.assets',       featureKey: 'assets' },
  { href: '/inventory',    label: 'Inventory',     labelKey: 'nav.inventory',    featureKey: 'inventory' },
  { href: '/warranties',   label: 'Warranties',    labelKey: 'nav.warranties',   featureKey: 'warranties' },
  { href: '/requests',     label: 'Requests',      labelKey: 'nav.requests',     featureKey: 'requests' },
  { href: '/reports',      label: 'Reports',       labelKey: 'nav.reports',      adminOnly: true, featureKey: 'reports' },
  { href: '/users',        label: 'Users',         labelKey: 'nav.users',        adminOnly: true },
  { href: '/subscription', label: 'Subscription',  labelKey: 'nav.subscription', adminOnly: true },
  { href: '/support',      label: 'Support',       labelKey: 'nav.support',      featureKey: 'support' },
  { href: '/audit-logs',   label: 'Audit Logs',    labelKey: 'nav.auditLogs',    adminOnly: true, featureKey: 'auditLogs' },
];

export function getFirstAccessiblePath(opts: {
  role: string;
  features: Record<string, boolean>;
  permissions?: Record<string, Record<string, boolean>> | null;
}): string {
  const isAdmin = opts.role === 'admin' || opts.role === 'super_admin' || opts.role === 'org_owner';
  for (const item of ORG_NAV_ITEMS) {
    if (item.adminOnly && !isAdmin) continue;
    if (item.featureKey && opts.features[item.featureKey] === false) continue;
    if (!isAdmin && item.featureKey && opts.permissions) {
      const mod = opts.permissions[item.featureKey];
      if (mod && mod['view'] === false) continue;
    }
    return item.href;
  }
  return '/dashboard';
}
