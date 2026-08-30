import type { MessageKey } from '@/locales/messages';
import type { AddOnKey, HarakaModule } from '@/types/subscription.types';
import { VERTICAL_FEATURE_KEYS } from '@/lib/platform/verticals';

/**
 * Route scope:
 *  - 'space' → URL becomes /[locale]/[orgSlug]/[space]/{href}
 *  - 'org'   → URL becomes /[locale]/[orgSlug]/{href}
 * Defaults to 'space' when omitted (most entries are space-scoped).
 */
export type NavScope = 'space' | 'org';

export interface NavItemConfig {
  href: string;
  label: string;
  labelKey: MessageKey;
  adminOnly?: boolean;
  featureKey?: string;
  /**
   * ANY-OF feature gate for a page more than one vertical reaches (the report
   * template builder is bought by a Haraka retailer and a Zeyara clinic
   * alike). Wins over `featureKey` when set. See navFeatureAllowed().
   */
  featureKeys?: string[];
  /** Haraka sub-module (Orders/Services/Appointments/Retainers) this item requires be active on the subscription. */
  harakaModule?: HarakaModule;
  /** Independent add-on (Workers/Warranty Certs/…) this item requires be active on the subscription. */
  harakaAddOn?: AddOnKey;
  /** dot-separated permission key, e.g. 'settingsOrgInfo.view' — grants access to staff with that specific permission */
  permissionKey?: string;
  /** Module brand color (hex). Present only on named Makhzoon modules (Usool, Raseed, etc.) */
  moduleColor?: string;
  /** Module brand name (Arabic). Shown as a subtitle in expanded sidebar. */
  moduleName?: string;
  /** Route scope (default 'space'). Org-wide pages (settings, users…) set 'org'. */
  scope?: NavScope;
  /**
   * Optional sub-items rendered beneath this item in the sidebar (Purchases under Raseed, etc.).
   * The parent link remains independently clickable; children only appear when the sidebar is expanded.
   */
  children?: NavItemConfig[];
}

/** Visual section divider inside a group's sub-item list */
export interface NavSectionHeader {
  type: 'section-header';
  label: string;
  labelKey: MessageKey;
}

export interface NavGroupConfig {
  type: 'group';
  href: string;
  label: string;
  labelKey: MessageKey;
  adminOnly?: boolean;
  featureKey?: string;
  /** ANY-OF feature gate; see NavItemConfig.featureKeys. */
  featureKeys?: string[];
  /** dot-separated permission key gating the group root, e.g. 'usool.view'. */
  permissionKey?: string;
  moduleColor?: string;
  moduleName?: string;
  scope?: NavScope;
  items: (NavItemConfig | NavSectionHeader)[];
}

export interface NavSeparator { type: 'separator' }
export type NavEntry = NavItemConfig | NavGroupConfig | NavSeparator;

/**
 * Single place every nav filter (sidebar, mobile drawer, first-accessible-path)
 * asks "does the org's subscription unlock this entry?" — so an any-of gate
 * can't be honored in one surface and silently ignored in another.
 */
export function navFeatureAllowed(
  entry: { featureKey?: string; featureKeys?: string[] },
  features: Record<string, boolean>,
): boolean {
  if (entry.featureKeys?.length) return entry.featureKeys.some((k) => !!features[k]);
  if (entry.featureKey) return !!features[entry.featureKey];
  return true;
}

export const ORG_NAV_ENTRIES: NavEntry[] = [
  { href: '/dashboard',    label: 'Dashboard',    labelKey: 'nav.dashboard',    featureKey: 'dashboard' },
  {
    type: 'group', href: '/usool', label: 'Usool', labelKey: 'nav.assets',
    featureKey: 'assets', permissionKey: 'usool.view', moduleColor: '#00695C', moduleName: 'أصول',
    items: [
      { href: '/usool/list', label: 'Asset Register', labelKey: 'nav.assetsList',
        featureKey: 'assets', permissionKey: 'usool.view',
        moduleColor: '#00695C', moduleName: 'أصول' },
      { href: '/usool/audits', label: 'Audits', labelKey: 'nav.assetAudits',
        featureKey: 'assets', permissionKey: 'usool.assetAuditsView',
        moduleColor: '#00695C', moduleName: 'أصول' },
    ],
  },
  {
    type: 'group', href: '/raseed', label: 'Raseed', labelKey: 'nav.inventory',
    featureKey: 'inventory', permissionKey: 'raseed.view', moduleColor: '#E65100', moduleName: 'رصيد',
    items: [
      { href: '/raseed/list', label: 'Stock Items', labelKey: 'nav.inventoryList',
        featureKey: 'inventory', permissionKey: 'raseed.view',
        moduleColor: '#E65100', moduleName: 'رصيد' },
      { href: '/raseed/purchases', label: 'Purchases', labelKey: 'nav.purchases',
        featureKey: 'inventory', permissionKey: 'raseed.purchasesView',
        moduleColor: '#BF360C', moduleName: 'مشتريات' },
      { href: '/raseed/audits', label: 'Stock Audits', labelKey: 'nav.stockAudits',
        featureKey: 'inventory', permissionKey: 'raseed.stockAuditView',
        moduleColor: '#BF360C', moduleName: 'مراجعات' },
    ],
  },
  {
    type: 'group', href: '/haraka', label: 'Haraka', labelKey: 'nav.pos',
    featureKey: 'pos', permissionKey: 'haraka.view', moduleColor: '#C2185B', moduleName: 'حركة',
    items: [
      { type: 'section-header', label: 'Operations', labelKey: 'nav.sectionOperations' },
      { href: '/haraka/sessions', label: 'POS', labelKey: 'nav.harakaPos',
        featureKey: 'pos', permissionKey: 'haraka.sessionsView',
        moduleColor: '#AD1457', moduleName: 'جلسات' },
      { href: '/haraka/service-jobs', label: 'Services', labelKey: 'nav.harakaServiceJobs',
        featureKey: 'pos', harakaModule: 'services', permissionKey: 'haraka.servicesView',
        moduleColor: '#AD1457', moduleName: 'خدمات' },
      { href: '/haraka/orders', label: 'Orders', labelKey: 'nav.harakaOrders',
        featureKey: 'pos', harakaModule: 'orders', permissionKey: 'haraka.ordersView',
        moduleColor: '#AD1457', moduleName: 'طلبات' },
      { href: '/haraka/retainers', label: 'Retainers', labelKey: 'nav.harakaRetainers',
        featureKey: 'pos', harakaModule: 'retainers', permissionKey: 'haraka.retainersView',
        moduleColor: '#AD1457', moduleName: 'عقود' },
      { href: '/haraka/appointments', label: 'Appointments', labelKey: 'nav.harakaAppointments',
        featureKey: 'pos', harakaModule: 'appointments', permissionKey: 'haraka.appointmentsView',
        moduleColor: '#AD1457', moduleName: 'مواعيد',
        children: [
          { href: '/haraka/appointments/calendar', label: 'Calendar', labelKey: 'nav.harakaAppointmentsCalendar',
            featureKey: 'pos', harakaModule: 'appointments', permissionKey: 'haraka.appointmentsView',
            moduleColor: '#AD1457', moduleName: 'تقويم' },
        ],
      },
      { type: 'section-header', label: 'Records', labelKey: 'nav.sectionRecords' },
      { href: '/haraka/customers', label: 'Customers', labelKey: 'nav.customers',
        featureKey: 'pos', permissionKey: 'haraka.customersView',
        moduleColor: '#AD1457', moduleName: 'عملاء' },
      { href: '/haraka/staff', label: 'Workers', labelKey: 'nav.harakaStaff',
        featureKey: 'pos', harakaAddOn: 'deliveryAgents', permissionKey: 'haraka.deliveryAgentsView',
        moduleColor: '#AD1457', moduleName: 'موزعون' },
      { href: '/haraka/warranty-certs', label: 'Warranty Certificates', labelKey: 'nav.harakaWarrantyCerts',
        featureKey: 'pos', harakaAddOn: 'warrantyCerts', permissionKey: 'haraka.warrantyCertsView',
        moduleColor: '#AD1457', moduleName: 'ضمانات' },
      { href: '/haraka/services', label: 'Service Catalog', labelKey: 'nav.harakaServiceCatalog',
        featureKey: 'pos', harakaModule: 'services', permissionKey: 'haraka.serviceCatalogView',
        moduleColor: '#AD1457', moduleName: 'كتالوج الخدمات' },
      { href: '/haraka/reports', label: 'Reports', labelKey: 'nav.documentReports',
        featureKey: 'pos', harakaAddOn: 'documentReports', permissionKey: 'documentReports.reportsView',
        moduleColor: '#AD1457', moduleName: 'تقارير' },
      { type: 'section-header', label: 'Finance', labelKey: 'nav.sectionFinance' },
      { href: '/haraka/transactions', label: 'Transactions', labelKey: 'nav.transactions',
        featureKey: 'pos', permissionKey: 'haraka.posReportView',
        moduleColor: '#AD1457', moduleName: 'معاملات' },
      { href: '/haraka/analytics', label: 'Analytics', labelKey: 'nav.harakaReports',
        featureKey: 'pos', permissionKey: 'haraka.analyticsView',
        moduleColor: '#AD1457', moduleName: 'تحليلات' },
    ],
  },
  {
    // Zeyara (زيارة) — the clinic vertical. Rides the SAME engine as Haraka's
    // appointments/catalog/customers, so it deliberately carries no
    // `harakaModule` gate: buying Zeyara IS the entitlement. See
    // docs/plans/2026-08-26-zeyara-clinic-vertical-design.md §3.
    type: 'group', href: '/zeyara', label: 'Zeyara', labelKey: 'nav.zeyara',
    featureKey: 'zeyara', permissionKey: 'zeyara.view', moduleColor: '#0F766E', moduleName: 'زيارة',
    items: [
      { href: '/zeyara/appointments', label: 'Appointments', labelKey: 'nav.zeyaraAppointments',
        featureKey: 'zeyara', permissionKey: 'zeyara.appointmentsView',
        moduleColor: '#0F766E', moduleName: 'مواعيد',
        children: [
          { href: '/zeyara/appointments/calendar', label: 'Calendar', labelKey: 'nav.zeyaraCalendar',
            featureKey: 'zeyara', permissionKey: 'zeyara.appointmentsView',
            moduleColor: '#0F766E', moduleName: 'تقويم' },
        ],
      },
      { href: '/zeyara/patients', label: 'Patients', labelKey: 'nav.zeyaraPatients',
        featureKey: 'zeyara', permissionKey: 'zeyara.customersView',
        moduleColor: '#0F766E', moduleName: 'مرضى' },
      { href: '/zeyara/visits', label: 'Clinical Records', labelKey: 'nav.zeyaraVisits',
        featureKey: 'zeyara', permissionKey: 'zeyara.visitsView',
        moduleColor: '#0F766E', moduleName: 'السجلات السريرية' },
      { href: '/zeyara/follow-ups', label: 'Follow-ups', labelKey: 'nav.zeyaraFollowUps',
        featureKey: 'zeyara', permissionKey: 'zeyara.followUpsView',
        moduleColor: '#0F766E', moduleName: 'متابعات' },
      { href: '/zeyara/providers', label: 'Providers', labelKey: 'nav.zeyaraProviders',
        featureKey: 'zeyara', permissionKey: 'zeyara.staffManage',
        moduleColor: '#0F766E', moduleName: 'مقدمو الخدمة' },
      { href: '/zeyara/services', label: 'Service Catalog', labelKey: 'nav.zeyaraServiceCatalog',
        featureKey: 'zeyara', permissionKey: 'zeyara.serviceCatalogView',
        moduleColor: '#0F766E', moduleName: 'كتالوج الخدمات' },
      { href: '/zeyara/analytics', label: 'Analytics', labelKey: 'nav.zeyaraAnalytics',
        featureKey: 'zeyara', permissionKey: 'zeyara.analyticsView',
        moduleColor: '#0F766E', moduleName: 'تحليلات' },
      { href: '/zeyara/reminders', label: 'Reminders', labelKey: 'nav.zeyaraReminders',
        featureKey: 'zeyara', permissionKey: 'zeyara.staffManage',
        moduleColor: '#0F766E', moduleName: 'التذكيرات' },
      // Document Reports is cross-vertical: same templates, same instances,
      // reached from whichever surface the org bought. The add-on gate is what
      // sells it; the vertical only decides which route renders it.
      { href: '/zeyara/reports', label: 'Reports', labelKey: 'nav.zeyaraReports',
        featureKey: 'zeyara', harakaAddOn: 'documentReports', permissionKey: 'documentReports.reportsView',
        moduleColor: '#0F766E', moduleName: 'تقارير' },
    ],
  },
  {
    type: 'group', href: '/banna', label: 'Banna', labelKey: 'nav.banna',
    featureKey: 'banna', permissionKey: 'banna.view', moduleColor: '#1565C0', moduleName: 'بنّا',
    items: [
      { href: '/banna/custom-fields', label: 'Custom Fields', labelKey: 'banna.customFields',
        featureKey: 'banna', permissionKey: 'banna.view',
        moduleColor: '#1565C0', moduleName: 'بنّا' },
    ],
  },
  { type: 'separator' } as NavSeparator,
  { href: '/support',      label: 'Support',      labelKey: 'nav.support',      featureKey: 'support', permissionKey: 'support.view' },
  { href: '/audit-logs',   label: 'Audit Logs',   labelKey: 'nav.auditLogs',    adminOnly: true, featureKey: 'auditLogs', permissionKey: 'auditLogs.view' },
  {
    type: 'group',
    href: '/settings',
    label: 'Settings',
    labelKey: 'nav.settings',
    adminOnly: true,
    scope: 'org',
    items: [
      { href: '/settings/organization', label: 'Organization Info', labelKey: 'nav.orgInfo',       permissionKey: 'settingsOrgInfo.view',       scope: 'org' },
      { href: '/settings/spaces',       label: 'Spaces',            labelKey: 'nav.spaces',        permissionKey: 'settingsSpaces.view',        scope: 'org' },
      { href: '/settings/lists',        label: 'Lists',             labelKey: 'nav.lists',         permissionKey: 'settingsLists.view',         scope: 'org' },
      { href: '/subscription',          label: 'Subscription',      labelKey: 'nav.subscription',  permissionKey: 'settingsSubscription.view',  scope: 'org' },
      { href: '/users',                 label: 'Users',             labelKey: 'nav.users',         permissionKey: 'settingsUsers.view',         scope: 'org' },
      { href: '/settings/receipt',         label: 'Receipt',          labelKey: 'nav.receipt',          permissionKey: 'settingsReceipt.view',       featureKey: 'pos', scope: 'org' },
      { href: '/settings/invoice',       label: 'Invoice',       labelKey: 'nav.orderDocuments', permissionKey: 'settingsInvoice.view',       featureKey: 'pos', scope: 'org' },
      { href: '/settings/warranty-cert',   label: 'Warranty Cert',       labelKey: 'nav.warrantyCert',         permissionKey: 'settingsWarrantyCert.view',  featureKey: 'pos', harakaAddOn: 'warrantyCerts', scope: 'org' },
      { href: '/settings/notifications',   label: 'Notifications',       labelKey: 'nav.notificationSettings', permissionKey: 'settingsNotifications.view', scope: 'org' },
      { href: '/settings/cash-drawer',   label: 'Cash Drawer',   labelKey: 'nav.cashDrawer',     permissionKey: 'settingsCashDrawer.view',    featureKey: 'pos', scope: 'org' },
      { href: '/settings/reports',       label: 'Report Templates', labelKey: 'nav.reportTemplates', permissionKey: 'documentReports.reportsManageTemplates', featureKeys: VERTICAL_FEATURE_KEYS, harakaAddOn: 'documentReports', scope: 'org' },
    ],
  },
];

/** Flat list of all nav items (groups expanded to include group root + children); section headers skipped */
const ORG_NAV_FLAT: NavItemConfig[] = ORG_NAV_ENTRIES.flatMap((entry) => {
  if ('type' in entry && entry.type === 'separator') return [];
  if ('type' in entry && entry.type === 'group') {
    const groupAsItem: NavItemConfig = {
      href: entry.href,
      label: entry.label,
      labelKey: entry.labelKey,
      adminOnly: entry.adminOnly,
      featureKey: entry.featureKey,
      featureKeys: entry.featureKeys,
      permissionKey: entry.permissionKey,
      moduleColor: entry.moduleColor,
      moduleName: entry.moduleName,
      scope: entry.scope,
    };
    const children = entry.items
      .filter((sub): sub is NavItemConfig => !('type' in sub))
      .map((sub) => ({
        ...sub,
        adminOnly: sub.adminOnly ?? entry.adminOnly,
        scope: sub.scope ?? entry.scope,
      }));
    return [groupAsItem, ...children];
  }
  return [entry as NavItemConfig];
});

/** Prepend locale to a path like `/dashboard` → `/en/dashboard` */
export function withLocale(locale: string, path: string): string {
  if (path.startsWith('http') || path.startsWith('#')) return path;
  return `/${locale}${path}`;
}

/**
 * Build a full URL from a nav entry's `href`, inserting `[space]` for
 * space-scoped routes. Org-wide routes skip the space segment.
 *
 *   buildNavUrl({ locale: 'en', orgSlug: 'acme', space: 'default', entry: usool })
 *     → '/en/acme/default/usool'
 *   buildNavUrl({ ..., entry: settings })  → '/en/acme/settings'
 */
export function buildNavUrl(opts: {
  locale: string;
  orgSlug: string;
  space: string;
  entry: { href: string; scope?: NavScope };
}): string {
  const { locale, orgSlug, space, entry } = opts;
  const isOrgScope = entry.scope === 'org';
  const prefix = isOrgScope
    ? `/${locale}/${orgSlug}`
    : `/${locale}/${orgSlug}/${space}`;
  return `${prefix}${entry.href}`;
}

export function getFirstAccessiblePath(opts: {
  locale: string;
  orgSlug?: string;
  space?: string;
  role: string;
  features: Record<string, boolean>;
  activeHarakaModules?: string[];
  activeAddOns?: Record<string, boolean>;
  permissions?: Record<string, Record<string, boolean>> | null;
}): string {
  const isAdmin = opts.role === 'admin' || opts.role === 'super_admin' || opts.role === 'org_owner';
  const activeHarakaModules = opts.activeHarakaModules ?? [];
  for (const item of ORG_NAV_FLAT) {
    if (item.adminOnly && !isAdmin) continue;
    if (!navFeatureAllowed(item, opts.features)) continue;
    if (item.harakaModule && !activeHarakaModules.includes(item.harakaModule)) continue;
    if (item.harakaAddOn && opts.activeAddOns && !opts.activeAddOns[item.harakaAddOn]) continue;
    if (!isAdmin && opts.permissions) {
      // Use permissionKey's module when available (e.g. 'purchases.view' → 'purchases'),
      // otherwise fall back to featureKey. Prevents 'inventory' featureKey from being
      // incorrectly used to look up 'purchases' permissions.
      const permKey = item.permissionKey ?? (item.featureKey ? `${item.featureKey}.view` : null);
      if (permKey) {
        const [modKey, opKey = 'view'] = permKey.split('.');
        const mod = opts.permissions[modKey];
        // Require an explicit grant when the module block exists — an absent
        // key (e.g. 'pos.view', which doesn't exist as an op) means no access
        // for staff, so don't land them on a page their guard will blank out.
        if (mod && mod[opKey] !== true) continue;
      }
    }
    // If the caller passed orgSlug + space, build a full per-tenant URL.
    // Otherwise return the locale-prefixed nav href as before (legacy callers).
    if (opts.orgSlug) {
      return buildNavUrl({
        locale: opts.locale,
        orgSlug: opts.orgSlug,
        space: opts.space ?? 'default',
        entry: item,
      });
    }
    return withLocale(opts.locale, item.href);
  }
  return opts.orgSlug
    ? `/${opts.locale}/${opts.orgSlug}/${opts.space ?? 'default'}/dashboard`
    : withLocale(opts.locale, '/dashboard');
}
