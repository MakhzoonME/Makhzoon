import type { MessageKey } from '@/locales/messages';

// ─────────────────────────────────────────────────────────────────────────
// Per-module permission shapes. Modules are organized around the pricing
// pillars (Usool / Raseed / Haraka) rather than the old per-table split
// (assets/warranties, inventory/purchases, pos), so the permission editor
// matches how the product is actually sold and used.
//
// Settings is intentionally NOT one nested object — hasPermByKey() resolves
// a dot-separated key as exactly `module.operation` (2 levels), so each
// settings page is its own top-level module (settingsSpaces, settingsUsers,
// …), grouped visually in the editor via ModuleConfig.group = 'settings'.
// ─────────────────────────────────────────────────────────────────────────

export interface DashboardPermissions {
  view: boolean;
}

export interface UsoolPermissions {
  view: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
  export: boolean;
  viewActivity: boolean;
  qrLabel: boolean;
  warrantiesView: boolean;
  warrantiesCreate: boolean;
  warrantiesUpdate: boolean;
  warrantiesDelete: boolean;
  maintenanceView: boolean;
  maintenanceCreate: boolean;
  maintenanceUpdate: boolean;
  maintenanceDelete: boolean;
  checkoutView: boolean;
  checkoutCreate: boolean;
  checkoutUpdate: boolean;
  notesView: boolean;
  notesCreate: boolean; // note deletion is owner-only, not permissioned
  auditTrailView: boolean;
  retire: boolean;
  import: boolean;
  assetAuditsView: boolean;
  assetAuditStart: boolean;
}

export interface RaseedPermissions {
  view: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
  export: boolean;
  requestRefill: boolean;
  transactionsView: boolean; // stock movements
  adjustStockView: boolean;
  adjustStockUpdate: boolean;
  purchasesView: boolean;
  purchasesCreate: boolean;
  purchasesUpdate: boolean;
  purchasesDelete: boolean;
  purchasesReceive: boolean;
  stockAuditView: boolean;
  stockAuditStart: boolean;
}

export interface HarakaPermissions {
  view: boolean; // Haraka dashboard
  // Sessions
  sessionsView: boolean;
  sessionsOpen: boolean;
  sessionsCloseOwn: boolean;
  sessionsCloseOthers: boolean;
  sessionsEnterOthers: boolean;
  sessionsViewOthers: boolean;
  // Register
  registerOpen: boolean;
  applyDiscount: boolean;
  // Holder can approve a discount with their own PIN at checkout, and their
  // own discounts self-approve with no PIN prompt.
  approveDiscount: boolean;
  removeReceiptItems: boolean;
  receiptRemoveCustomer: boolean;
  holdReceipts: boolean;
  recallReceipts: boolean;
  removeReceipts: boolean;
  chargeReceipt: boolean;
  printerSettings: boolean;
  // Orders
  ordersView: boolean;
  ordersCreate: boolean;
  ordersRemoveCustomer: boolean;
  ordersGenerateInvoice: boolean;
  ordersGenerateWarranty: boolean;
  ordersShare: boolean;
  ordersMarkConfirmed: boolean;
  ordersCancel: boolean;
  ordersMarkAssigned: boolean;
  ordersMarkInTransit: boolean;
  ordersMarkDelivered: boolean;
  ordersAddPayment: boolean;
  // Customers
  customersView: boolean;
  customersCreate: boolean;
  customersUpdate: boolean;
  customersDelete: boolean;
  customersExport: boolean;
  customersHistoryView: boolean;
  customerFieldsView: boolean;
  customerFieldsCreate: boolean;
  customerFieldsUpdate: boolean;
  customerFieldsDelete: boolean;
  // Delivery agents
  deliveryAgentsView: boolean;
  deliveryAgentsCreate: boolean;
  deliveryAgentsUpdate: boolean;
  deliveryAgentsDelete: boolean;
  // Warranty certs
  warrantyCertsView: boolean;
  // Transactions
  transactionsView: boolean;
  transactionsPrint: boolean;
  transactionsShare: boolean;
  transactionsRefund: boolean;
  transactionsVoid: boolean;
  // POS report
  posReportView: boolean;
  posReportExport: boolean;
  // Service jobs
  servicesView: boolean;
  serviceJobsCreate: boolean;
  serviceJobsMarkConfirmed: boolean;
  serviceJobsAddPayment: boolean;
  serviceJobsMarkInProgress: boolean;
  serviceJobsMarkDone: boolean;
  serviceJobsUpdate: boolean;
  serviceJobsGenerateInvoice: boolean;
  // Retainers
  retainersView: boolean;
  retainersCreate: boolean;
  retainersPause: boolean;
  retainersCancel: boolean;
  retainersAddInvoice: boolean;
  retainersReactivate: boolean;
  // Service catalog
  serviceCatalogView: boolean;
  serviceCatalogCreate: boolean;
  serviceCatalogUpdate: boolean;
  serviceCatalogDelete: boolean;
  // Appointments
  appointmentsView: boolean;
  appointmentsCreate: boolean;
  appointmentsUpdate: boolean;
  appointmentsConfirm: boolean;
  appointmentsComplete: boolean;
  appointmentsCancel: boolean;
  appointmentsMarkNoShow: boolean;
  appointmentsGenerateInvoice: boolean;
  appointmentsAddPayment: boolean;
  // Staff directory beyond the delivery-agent CRUD above: capability tags
  // and per-provider working hours.
  staffManage: boolean;
  staffAvailabilityManage: boolean;
  // Analytics — cross-module revenue/sales overview (POS + Orders + Service
  // Jobs + Retainers + Appointments), distinct from the POS-only report above.
  analyticsView: boolean;
}

// Document Reports: generic, org-templated report generation (e.g. a
// doctor's patient report), separate from template building so a role can
// fill out reports without being able to change what templates look like.
// No delete op — reports are a retained record.
export interface DocumentReportsPermissions {
  reportsView: boolean;
  reportsCreate: boolean;
  reportsEdit: boolean;
  reportsManageTemplates: boolean;
}

/**
 * Zeyara (زيارة) — the clinic vertical. Operates the SAME engine as Haraka
 * (haraka_appointments, haraka_services, pos_customers, haraka_staff) through
 * its own namespace, so a clinic org never sees Point-of-Sale operations it
 * did not buy. See docs/plans/2026-08-26-zeyara-clinic-vertical-design.md §4.
 *
 * Operation keys intentionally MATCH HarakaPermissions wherever the underlying
 * operation is identical (`appointmentsCreate`, not `bookVisit`) — that is what
 * lets hasVerticalPermission() resolve one op name against both namespaces
 * without a translation table. Only the labels speak clinic.
 */
export interface ZeyaraPermissions {
  view: boolean; // Zeyara dashboard
  // Appointments — same rows and semantics as HarakaPermissions' appointment ops
  appointmentsView: boolean;
  appointmentsCreate: boolean;
  appointmentsUpdate: boolean;
  appointmentsConfirm: boolean;
  appointmentsComplete: boolean;
  appointmentsCancel: boolean;
  appointmentsMarkNoShow: boolean;
  appointmentsGenerateInvoice: boolean;
  appointmentsAddPayment: boolean;
  // Patients — over pos_customers. Keys match Haraka's customer ops so the
  // shared CustomersService gates resolve in either namespace.
  customersView: boolean;
  customersCreate: boolean;
  customersUpdate: boolean;
  customersDelete: boolean;
  customersExport: boolean;
  customersHistoryView: boolean;
  customerFieldsView: boolean;
  customerFieldsCreate: boolean;
  customerFieldsUpdate: boolean;
  customerFieldsDelete: boolean;
  // Service catalog — over haraka_services
  serviceCatalogView: boolean;
  serviceCatalogCreate: boolean;
  serviceCatalogUpdate: boolean;
  serviceCatalogDelete: boolean;
  // Providers — over haraka_staff. Key names match Haraka's staff ops.
  staffManage: boolean;
  staffAvailabilityManage: boolean;
  analyticsView: boolean;
  // Clinical record (Phase 2) — Zeyara-only, no Haraka counterpart. These are
  // the operations that touch patient health information, so they are gated
  // separately from the booking/billing ops above.
  visitsView: boolean;
  visitsCreate: boolean;
  visitsUpdate: boolean;
  visitsDelete: boolean;
  visitNotesCreate: boolean;
  visitAttachmentsUpload: boolean;
  visitAttachmentsDelete: boolean;
  followUpsView: boolean;
}

export interface SupportPermissions {
  view: boolean;
  viewOthers: boolean;
  submit: boolean;
  replyOwn: boolean;
  replyOthers: boolean;
}

export interface AuditLogsPermissions {
  view: boolean;
  viewSpace: boolean;
  viewAllSpaces: boolean;
}

export interface LeadsPermissions {
  view: boolean;
}

export interface BannaPermissions {
  view: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
}

// ── Settings — one module per page ──────────────────────────────────────
export interface SettingsOrgInfoPermissions {
  view: boolean;
  editName: boolean;
  editBranding: boolean;
}
export interface SettingsSpacesPermissions {
  view: boolean;
  create: boolean;
  update: boolean;
  grantAccess: boolean;
  archive: boolean;
  restore: boolean;
}
export interface SettingsListsPermissions {
  view: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
}
export interface SettingsSubscriptionPermissions {
  view: boolean;
}
export interface SettingsUsersPermissions {
  view: boolean;
  invite: boolean;
  update: boolean;
  revoke: boolean;
  resetPassword: boolean;
  delete: boolean;
}
export interface SettingsReceiptPermissions {
  view: boolean;
  update: boolean;
}
export interface SettingsInvoicePermissions {
  view: boolean;
  update: boolean;
}
export interface SettingsWarrantyCertPermissions {
  view: boolean;
  update: boolean;
}
export interface SettingsNotificationsPermissions {
  view: boolean;
  update: boolean;
}
export interface SettingsCashDrawerPermissions {
  view: boolean;
  update: boolean;
}
export interface UserPermissions {
  dashboard: DashboardPermissions;
  usool: UsoolPermissions;
  raseed: RaseedPermissions;
  haraka: HarakaPermissions;
  documentReports: DocumentReportsPermissions;
  zeyara: ZeyaraPermissions;
  support: SupportPermissions;
  auditLogs: AuditLogsPermissions;
  leads: LeadsPermissions;
  banna: BannaPermissions;
  settingsOrgInfo: SettingsOrgInfoPermissions;
  settingsSpaces: SettingsSpacesPermissions;
  settingsLists: SettingsListsPermissions;
  settingsSubscription: SettingsSubscriptionPermissions;
  settingsUsers: SettingsUsersPermissions;
  settingsReceipt: SettingsReceiptPermissions;
  settingsInvoice: SettingsInvoicePermissions;
  settingsWarrantyCert: SettingsWarrantyCertPermissions;
  settingsNotifications: SettingsNotificationsPermissions;
  settingsCashDrawer: SettingsCashDrawerPermissions;
}

function allTrue<T>(keys: (keyof T)[]): T {
  return Object.fromEntries(keys.map((k) => [k, true])) as T;
}
function allFalse<T>(keys: (keyof T)[]): T {
  return Object.fromEntries(keys.map((k) => [k, false])) as T;
}

const USOOL_KEYS: (keyof UsoolPermissions)[] = [
  'view', 'create', 'update', 'delete', 'export', 'viewActivity', 'qrLabel',
  'warrantiesView', 'warrantiesCreate', 'warrantiesUpdate', 'warrantiesDelete',
  'maintenanceView', 'maintenanceCreate', 'maintenanceUpdate', 'maintenanceDelete',
  'checkoutView', 'checkoutCreate', 'checkoutUpdate',
  'notesView', 'notesCreate', 'auditTrailView', 'retire', 'import',
  'assetAuditsView', 'assetAuditStart',
];
const RASEED_KEYS: (keyof RaseedPermissions)[] = [
  'view', 'create', 'update', 'delete', 'export', 'requestRefill',
  'transactionsView', 'adjustStockView', 'adjustStockUpdate',
  'purchasesView', 'purchasesCreate', 'purchasesUpdate', 'purchasesDelete', 'purchasesReceive',
  'stockAuditView', 'stockAuditStart',
];
const HARAKA_KEYS: (keyof HarakaPermissions)[] = [
  'view',
  'sessionsView', 'sessionsOpen', 'sessionsCloseOwn', 'sessionsCloseOthers', 'sessionsEnterOthers', 'sessionsViewOthers',
  'registerOpen', 'applyDiscount', 'approveDiscount', 'removeReceiptItems', 'receiptRemoveCustomer', 'holdReceipts', 'recallReceipts', 'removeReceipts', 'chargeReceipt', 'printerSettings',
  'ordersView', 'ordersCreate', 'ordersRemoveCustomer', 'ordersGenerateInvoice', 'ordersGenerateWarranty', 'ordersShare', 'ordersMarkConfirmed', 'ordersCancel', 'ordersMarkAssigned', 'ordersMarkInTransit', 'ordersMarkDelivered', 'ordersAddPayment',
  'customersView', 'customersCreate', 'customersUpdate', 'customersDelete', 'customersExport', 'customersHistoryView', 'customerFieldsView', 'customerFieldsCreate', 'customerFieldsUpdate', 'customerFieldsDelete',
  'deliveryAgentsView', 'deliveryAgentsCreate', 'deliveryAgentsUpdate', 'deliveryAgentsDelete',
  'warrantyCertsView',
  'transactionsView', 'transactionsPrint', 'transactionsShare', 'transactionsRefund', 'transactionsVoid',
  'posReportView', 'posReportExport',
  'servicesView', 'serviceJobsCreate', 'serviceJobsMarkConfirmed', 'serviceJobsAddPayment', 'serviceJobsMarkInProgress', 'serviceJobsMarkDone', 'serviceJobsUpdate', 'serviceJobsGenerateInvoice',
  'retainersView', 'retainersCreate', 'retainersPause', 'retainersCancel', 'retainersAddInvoice', 'retainersReactivate',
  'serviceCatalogView', 'serviceCatalogCreate', 'serviceCatalogUpdate', 'serviceCatalogDelete',
  'appointmentsView', 'appointmentsCreate', 'appointmentsUpdate', 'appointmentsConfirm', 'appointmentsComplete', 'appointmentsCancel', 'appointmentsMarkNoShow', 'appointmentsGenerateInvoice', 'appointmentsAddPayment',
  'staffManage', 'staffAvailabilityManage',
  'analyticsView',
];
const ZEYARA_KEYS: (keyof ZeyaraPermissions)[] = [
  'view',
  'appointmentsView', 'appointmentsCreate', 'appointmentsUpdate', 'appointmentsConfirm', 'appointmentsComplete', 'appointmentsCancel', 'appointmentsMarkNoShow', 'appointmentsGenerateInvoice', 'appointmentsAddPayment',
  'customersView', 'customersCreate', 'customersUpdate', 'customersDelete', 'customersExport', 'customersHistoryView', 'customerFieldsView', 'customerFieldsCreate', 'customerFieldsUpdate', 'customerFieldsDelete',
  'serviceCatalogView', 'serviceCatalogCreate', 'serviceCatalogUpdate', 'serviceCatalogDelete',
  'staffManage', 'staffAvailabilityManage',
  'analyticsView',
  'visitsView', 'visitsCreate', 'visitsUpdate', 'visitsDelete',
  'visitNotesCreate', 'visitAttachmentsUpload', 'visitAttachmentsDelete',
  'followUpsView',
];

export const DEFAULT_ADMIN_PERMISSIONS: UserPermissions = {
  dashboard: { view: true },
  usool: allTrue<UsoolPermissions>(USOOL_KEYS),
  raseed: allTrue<RaseedPermissions>(RASEED_KEYS),
  haraka: allTrue<HarakaPermissions>(HARAKA_KEYS),
  documentReports: { reportsView: true, reportsCreate: true, reportsEdit: true, reportsManageTemplates: true },
  zeyara: allTrue<ZeyaraPermissions>(ZEYARA_KEYS),
  support: { view: true, viewOthers: true, submit: true, replyOwn: true, replyOthers: true },
  auditLogs: { view: true, viewSpace: true, viewAllSpaces: true },
  leads: { view: true },
  banna: { view: true, create: true, update: true, delete: true },
  settingsOrgInfo: { view: true, editName: true, editBranding: true },
  settingsSpaces: { view: true, create: true, update: true, grantAccess: true, archive: true, restore: true },
  settingsLists: { view: true, create: true, update: true, delete: true },
  settingsSubscription: { view: true },
  settingsUsers: { view: true, invite: true, update: true, revoke: true, resetPassword: true, delete: true },
  settingsReceipt: { view: true, update: true },
  settingsInvoice: { view: true, update: true },
  settingsWarrantyCert: { view: true, update: true },
  settingsNotifications: { view: true, update: true },
  settingsCashDrawer: { view: true, update: true },
};

export const DEFAULT_STAFF_PERMISSIONS: UserPermissions = {
  dashboard: { view: false },
  usool: { ...allFalse<UsoolPermissions>(USOOL_KEYS), view: true, warrantiesView: true, maintenanceView: true, checkoutView: true, notesView: true, auditTrailView: true },
  raseed: { ...allFalse<RaseedPermissions>(RASEED_KEYS), view: true, transactionsView: true },
  haraka: allFalse<HarakaPermissions>(HARAKA_KEYS),
  documentReports: { reportsView: false, reportsCreate: false, reportsEdit: false, reportsManageTemplates: false },
  zeyara: allFalse<ZeyaraPermissions>(ZEYARA_KEYS),
  support: { view: true, viewOthers: false, submit: true, replyOwn: true, replyOthers: false },
  auditLogs: { view: false, viewSpace: false, viewAllSpaces: false },
  leads: { view: true },
  banna: { view: true, create: false, update: false, delete: false },
  settingsOrgInfo: { view: false, editName: false, editBranding: false },
  settingsSpaces: { view: false, create: false, update: false, grantAccess: false, archive: false, restore: false },
  settingsLists: { view: false, create: false, update: false, delete: false },
  settingsSubscription: { view: false },
  settingsUsers: { view: false, invite: false, update: false, revoke: false, resetPassword: false, delete: false },
  settingsReceipt: { view: false, update: false },
  settingsInvoice: { view: false, update: false },
  settingsWarrantyCert: { view: false, update: false },
  settingsNotifications: { view: false, update: false },
  settingsCashDrawer: { view: false, update: false },
};

export interface ModuleOperationConfig {
  key: string;
  label: string;
  labelKey: MessageKey;
  /** When true, this op is disabled unless the gate key is enabled. */
  requiresView?: boolean;
  /** The specific permission key that must be true to unlock this op.
   *  Defaults to 'view' when omitted. Use when the module's gate isn't named 'view'. */
  requiresKey?: string;
  /** Subscription feature key that must be enabled for this op to appear in the editor. */
  featureKey?: string;
}

export type ModuleGroup = 'usool' | 'raseed' | 'haraka' | 'zeyara' | 'platform' | 'settings';

export interface ModuleConfig {
  key: keyof UserPermissions;
  label: string;
  labelKey: MessageKey;
  featureKey?: string;
  group?: ModuleGroup;
  /** When true, this module is hidden from the org-user PermissionsEditor. */
  hideFromEditor?: boolean;
  operations: ModuleOperationConfig[];
}

export const MODULE_GROUP_LABELS: Record<ModuleGroup, string> = {
  usool: 'Usool',
  raseed: 'Raseed',
  haraka: 'Haraka',
  zeyara: 'Zeyara',
  platform: 'Platform',
  settings: 'Settings',
};

export const MODULE_GROUP_LABEL_KEYS: Record<ModuleGroup, MessageKey> = {
  usool: 'permGroup.usool',
  raseed: 'permGroup.raseed',
  haraka: 'permGroup.haraka',
  zeyara: 'permGroup.zeyara',
  platform: 'permGroup.platform',
  settings: 'permGroup.settings',
};

export const MODULE_GROUP_ORDER: ModuleGroup[] = ['usool', 'raseed', 'haraka', 'zeyara', 'platform', 'settings'];

export const MODULE_PERMISSIONS_CONFIG: ModuleConfig[] = [
  {
    key: 'dashboard', label: 'Dashboard', labelKey: 'permModule.dashboard',
    featureKey: 'dashboard', group: 'platform',
    operations: [
      { key: 'view', label: 'View Dashboard', labelKey: 'permOp.dashboard.view' },
    ],
  },
  {
    key: 'usool', label: 'Usool (Assets)', labelKey: 'permModule.usool',
    featureKey: 'assets', group: 'usool',
    operations: [
      { key: 'view', label: 'View Asset Register', labelKey: 'permOp.usool.view' },
      { key: 'create', label: 'Add Assets', labelKey: 'permOp.usool.create', requiresView: true },
      { key: 'update', label: 'Edit Assets', labelKey: 'permOp.usool.update', requiresView: true },
      { key: 'delete', label: 'Delete Assets', labelKey: 'permOp.usool.delete', requiresView: true },
      { key: 'export', label: 'Export Assets', labelKey: 'permOp.usool.export', requiresView: true },
      { key: 'viewActivity', label: 'View Activity Timeline', labelKey: 'permOp.usool.viewActivity', requiresView: true },
      { key: 'qrLabel', label: 'Print QR Labels', labelKey: 'permOp.usool.qrLabel', requiresView: true },
      { key: 'retire', label: 'Retire Assets', labelKey: 'permOp.usool.retire', requiresView: true },
      { key: 'import', label: 'Import Assets (CSV)', labelKey: 'permOp.usool.import', requiresView: true },
      { key: 'warrantiesView', label: 'View Warranties', labelKey: 'permOp.usool.warrantiesView', requiresView: true, featureKey: 'warranties' },
      { key: 'warrantiesCreate', label: 'Add Warranties', labelKey: 'permOp.usool.warrantiesCreate', requiresKey: 'warrantiesView', featureKey: 'warranties' },
      { key: 'warrantiesUpdate', label: 'Edit Warranties', labelKey: 'permOp.usool.warrantiesUpdate', requiresKey: 'warrantiesView', featureKey: 'warranties' },
      { key: 'warrantiesDelete', label: 'Delete Warranties', labelKey: 'permOp.usool.warrantiesDelete', requiresKey: 'warrantiesView', featureKey: 'warranties' },
      { key: 'maintenanceView', label: 'View Maintenance Records', labelKey: 'permOp.usool.maintenanceView', requiresView: true, featureKey: 'maintenance' },
      { key: 'maintenanceCreate', label: 'Add Maintenance Records', labelKey: 'permOp.usool.maintenanceCreate', requiresKey: 'maintenanceView', featureKey: 'maintenance' },
      { key: 'maintenanceUpdate', label: 'Edit Maintenance Records', labelKey: 'permOp.usool.maintenanceUpdate', requiresKey: 'maintenanceView', featureKey: 'maintenance' },
      { key: 'maintenanceDelete', label: 'Delete Maintenance Records', labelKey: 'permOp.usool.maintenanceDelete', requiresKey: 'maintenanceView', featureKey: 'maintenance' },
      { key: 'checkoutView', label: 'View Checkouts', labelKey: 'permOp.usool.checkoutView', requiresView: true, featureKey: 'assetCheckouts' },
      { key: 'checkoutCreate', label: 'Check Out Assets', labelKey: 'permOp.usool.checkoutCreate', requiresKey: 'checkoutView', featureKey: 'assetCheckouts' },
      { key: 'checkoutUpdate', label: 'Check In / Edit Checkouts', labelKey: 'permOp.usool.checkoutUpdate', requiresKey: 'checkoutView', featureKey: 'assetCheckouts' },
      { key: 'notesView', label: 'View Notes', labelKey: 'permOp.usool.notesView', requiresView: true, featureKey: 'assetNotes' },
      { key: 'notesCreate', label: 'Add Notes', labelKey: 'permOp.usool.notesCreate', requiresKey: 'notesView', featureKey: 'assetNotes' },
      { key: 'auditTrailView', label: 'View Audit Trail', labelKey: 'permOp.usool.auditTrailView', requiresView: true },
      { key: 'assetAuditsView', label: 'View Asset Audits', labelKey: 'permOp.usool.assetAuditsView', requiresView: true },
      { key: 'assetAuditStart', label: 'Start Asset Audit', labelKey: 'permOp.usool.assetAuditStart', requiresKey: 'assetAuditsView' },
    ],
  },
  {
    key: 'raseed', label: 'Raseed (Inventory)', labelKey: 'permModule.raseed',
    featureKey: 'inventory', group: 'raseed',
    operations: [
      { key: 'view', label: 'View Stock Items', labelKey: 'permOp.raseed.view' },
      { key: 'create', label: 'Add Items', labelKey: 'permOp.raseed.create', requiresView: true },
      { key: 'update', label: 'Edit Items', labelKey: 'permOp.raseed.update', requiresView: true },
      { key: 'delete', label: 'Delete Items', labelKey: 'permOp.raseed.delete', requiresView: true },
      { key: 'export', label: 'Export Items', labelKey: 'permOp.raseed.export', requiresView: true },
      { key: 'requestRefill', label: 'Request Refill', labelKey: 'permOp.raseed.requestRefill', requiresView: true },
      { key: 'transactionsView', label: 'View Stock Movements', labelKey: 'permOp.raseed.transactionsView', requiresView: true },
      { key: 'adjustStockView', label: 'View Stock Adjustments', labelKey: 'permOp.raseed.adjustStockView', requiresView: true },
      { key: 'adjustStockUpdate', label: 'Adjust Stock', labelKey: 'permOp.raseed.adjustStockUpdate', requiresKey: 'adjustStockView' },
      { key: 'purchasesView', label: 'View Purchases', labelKey: 'permOp.raseed.purchasesView', requiresView: true },
      { key: 'purchasesCreate', label: 'Create Purchases', labelKey: 'permOp.raseed.purchasesCreate', requiresKey: 'purchasesView' },
      { key: 'purchasesUpdate', label: 'Edit Purchases', labelKey: 'permOp.raseed.purchasesUpdate', requiresKey: 'purchasesView' },
      { key: 'purchasesDelete', label: 'Delete Purchases', labelKey: 'permOp.raseed.purchasesDelete', requiresKey: 'purchasesView' },
      { key: 'purchasesReceive', label: 'Receive Purchases (Stock-In)', labelKey: 'permOp.raseed.purchasesReceive', requiresKey: 'purchasesView' },
      { key: 'stockAuditView', label: 'View Stock Audits', labelKey: 'permOp.raseed.stockAuditView', requiresView: true },
      { key: 'stockAuditStart', label: 'Start Stock Audit', labelKey: 'permOp.raseed.stockAuditStart', requiresKey: 'stockAuditView' },
    ],
  },
  {
    key: 'haraka', label: 'Haraka', labelKey: 'permModule.haraka',
    featureKey: 'pos', group: 'haraka',
    operations: [
      { key: 'view', label: 'View Haraka Dashboard', labelKey: 'permOp.haraka.view' },
      { key: 'sessionsView', label: 'View Sessions', labelKey: 'permOp.haraka.sessionsView' },
      { key: 'sessionsOpen', label: 'Open Session', labelKey: 'permOp.haraka.sessionsOpen', requiresKey: 'sessionsView' },
      { key: 'sessionsCloseOwn', label: 'Close Own Session', labelKey: 'permOp.haraka.sessionsCloseOwn', requiresKey: 'sessionsView' },
      { key: 'sessionsCloseOthers', label: "Close Others' Sessions", labelKey: 'permOp.haraka.sessionsCloseOthers', requiresKey: 'sessionsView' },
      { key: 'sessionsEnterOthers', label: "Enter Others' Sessions", labelKey: 'permOp.haraka.sessionsEnterOthers', requiresKey: 'sessionsView' },
      { key: 'sessionsViewOthers', label: "View Others' Sessions", labelKey: 'permOp.haraka.sessionsViewOthers', requiresKey: 'sessionsView' },
      { key: 'registerOpen', label: 'Open Register', labelKey: 'permOp.haraka.registerOpen' },
      { key: 'applyDiscount', label: 'Apply Discount', labelKey: 'permOp.haraka.applyDiscount', requiresKey: 'chargeReceipt' },
      { key: 'approveDiscount', label: 'Approve Discount (own PIN)', labelKey: 'permOp.haraka.approveDiscount', requiresKey: 'chargeReceipt' },
      { key: 'removeReceiptItems', label: 'Remove Items from Receipt', labelKey: 'permOp.haraka.removeReceiptItems', requiresKey: 'registerOpen' },
      { key: 'receiptRemoveCustomer', label: 'Remove Customer from Receipt', labelKey: 'permOp.haraka.receiptRemoveCustomer', requiresKey: 'registerOpen' },
      { key: 'holdReceipts', label: 'Hold Receipts', labelKey: 'permOp.haraka.holdReceipts', requiresKey: 'registerOpen' },
      { key: 'recallReceipts', label: 'Recall Receipts', labelKey: 'permOp.haraka.recallReceipts', requiresKey: 'registerOpen' },
      { key: 'removeReceipts', label: 'Remove Receipts', labelKey: 'permOp.haraka.removeReceipts', requiresKey: 'registerOpen' },
      { key: 'chargeReceipt', label: 'Charge Receipt', labelKey: 'permOp.haraka.chargeReceipt', requiresKey: 'registerOpen' },
      { key: 'printerSettings', label: 'Printer Settings', labelKey: 'permOp.haraka.printerSettings' },
      { key: 'ordersView', label: 'View Orders', labelKey: 'permOp.haraka.ordersView' },
      { key: 'ordersCreate', label: 'Create Orders', labelKey: 'permOp.haraka.ordersCreate', requiresKey: 'ordersView' },
      { key: 'ordersRemoveCustomer', label: 'Remove Customer from Order', labelKey: 'permOp.haraka.ordersRemoveCustomer', requiresKey: 'ordersView' },
      { key: 'ordersGenerateInvoice', label: 'Generate Invoice for Order', labelKey: 'permOp.haraka.ordersGenerateInvoice', requiresKey: 'ordersView' },
      { key: 'ordersGenerateWarranty', label: 'Generate Warranty for Order', labelKey: 'permOp.haraka.ordersGenerateWarranty', requiresKey: 'ordersView' },
      { key: 'ordersShare', label: 'Share Order', labelKey: 'permOp.haraka.ordersShare', requiresKey: 'ordersView' },
      { key: 'ordersMarkConfirmed', label: 'Mark Order Confirmed', labelKey: 'permOp.haraka.ordersMarkConfirmed', requiresKey: 'ordersView' },
      { key: 'ordersCancel', label: 'Cancel Order', labelKey: 'permOp.haraka.ordersCancel', requiresKey: 'ordersView' },
      { key: 'ordersMarkAssigned', label: 'Mark Order Assigned', labelKey: 'permOp.haraka.ordersMarkAssigned', requiresKey: 'ordersView' },
      { key: 'ordersMarkInTransit', label: 'Mark Order In Transit', labelKey: 'permOp.haraka.ordersMarkInTransit', requiresKey: 'ordersView' },
      { key: 'ordersMarkDelivered', label: 'Mark Order Delivered', labelKey: 'permOp.haraka.ordersMarkDelivered', requiresKey: 'ordersView' },
      { key: 'ordersAddPayment', label: 'Add Payment Entry (Orders)', labelKey: 'permOp.haraka.ordersAddPayment', requiresKey: 'ordersView' },
      { key: 'customersView', label: 'View Customers', labelKey: 'permOp.haraka.customersView' },
      { key: 'customersCreate', label: 'Add Customers', labelKey: 'permOp.haraka.customersCreate', requiresKey: 'customersView' },
      { key: 'customersUpdate', label: 'Edit Customers', labelKey: 'permOp.haraka.customersUpdate', requiresKey: 'customersView' },
      { key: 'customersDelete', label: 'Delete Customers', labelKey: 'permOp.haraka.customersDelete', requiresKey: 'customersView' },
      { key: 'customersExport', label: 'Export Customers (CSV)', labelKey: 'permOp.haraka.customersExport', requiresKey: 'customersView' },
      { key: 'customersHistoryView', label: 'View Customer History', labelKey: 'permOp.haraka.customersHistoryView', requiresKey: 'customersView' },
      { key: 'customerFieldsView', label: 'View Customer Fields', labelKey: 'permOp.haraka.customerFieldsView', requiresKey: 'customersView' },
      { key: 'customerFieldsCreate', label: 'Add Customer Fields', labelKey: 'permOp.haraka.customerFieldsCreate', requiresKey: 'customerFieldsView' },
      { key: 'customerFieldsUpdate', label: 'Edit Customer Fields', labelKey: 'permOp.haraka.customerFieldsUpdate', requiresKey: 'customerFieldsView' },
      { key: 'customerFieldsDelete', label: 'Delete Customer Fields', labelKey: 'permOp.haraka.customerFieldsDelete', requiresKey: 'customerFieldsView' },
      { key: 'deliveryAgentsView', label: 'View Delivery Agents', labelKey: 'permOp.haraka.deliveryAgentsView' },
      { key: 'deliveryAgentsCreate', label: 'Add Delivery Agents', labelKey: 'permOp.haraka.deliveryAgentsCreate', requiresKey: 'deliveryAgentsView' },
      { key: 'deliveryAgentsUpdate', label: 'Edit Delivery Agents', labelKey: 'permOp.haraka.deliveryAgentsUpdate', requiresKey: 'deliveryAgentsView' },
      { key: 'deliveryAgentsDelete', label: 'Delete Delivery Agents', labelKey: 'permOp.haraka.deliveryAgentsDelete', requiresKey: 'deliveryAgentsView' },
      { key: 'warrantyCertsView', label: 'View Warranty Certificates', labelKey: 'permOp.haraka.warrantyCertsView' },
      { key: 'transactionsView', label: 'View Transactions', labelKey: 'permOp.haraka.transactionsView' },
      { key: 'transactionsPrint', label: 'Print Transaction', labelKey: 'permOp.haraka.transactionsPrint', requiresKey: 'transactionsView' },
      { key: 'transactionsShare', label: 'Share Transaction', labelKey: 'permOp.haraka.transactionsShare', requiresKey: 'transactionsView' },
      { key: 'transactionsRefund', label: 'Refund Transaction', labelKey: 'permOp.haraka.transactionsRefund', requiresKey: 'transactionsView' },
      { key: 'transactionsVoid', label: 'Void Transaction', labelKey: 'permOp.haraka.transactionsVoid', requiresKey: 'transactionsView' },
      { key: 'posReportView', label: 'View POS Report', labelKey: 'permOp.haraka.posReportView' },
      { key: 'posReportExport', label: 'Export POS Report', labelKey: 'permOp.haraka.posReportExport', requiresKey: 'posReportView' },
      { key: 'servicesView', label: 'View Services', labelKey: 'permOp.haraka.servicesView' },
      { key: 'serviceJobsCreate', label: 'Create Service Job', labelKey: 'permOp.haraka.serviceJobsCreate', requiresKey: 'servicesView' },
      { key: 'serviceJobsMarkConfirmed', label: 'Mark Service Job Confirmed', labelKey: 'permOp.haraka.serviceJobsMarkConfirmed', requiresKey: 'servicesView' },
      { key: 'serviceJobsAddPayment', label: 'Add Payment Entry (Services)', labelKey: 'permOp.haraka.serviceJobsAddPayment', requiresKey: 'servicesView' },
      { key: 'serviceJobsMarkInProgress', label: 'Mark Service Job In Progress', labelKey: 'permOp.haraka.serviceJobsMarkInProgress', requiresKey: 'servicesView' },
      { key: 'serviceJobsMarkDone', label: 'Mark Service Job Done', labelKey: 'permOp.haraka.serviceJobsMarkDone', requiresKey: 'servicesView' },
      { key: 'serviceJobsUpdate', label: 'Edit Service Job', labelKey: 'permOp.haraka.serviceJobsUpdate', requiresKey: 'servicesView' },
      { key: 'serviceJobsGenerateInvoice', label: 'Generate Invoice for Service Job', labelKey: 'permOp.haraka.serviceJobsGenerateInvoice', requiresKey: 'servicesView' },
      { key: 'retainersView', label: 'View Retainers', labelKey: 'permOp.haraka.retainersView' },
      { key: 'retainersCreate', label: 'Create Retainer', labelKey: 'permOp.haraka.retainersCreate', requiresKey: 'retainersView' },
      { key: 'retainersPause', label: 'Pause Retainer', labelKey: 'permOp.haraka.retainersPause', requiresKey: 'retainersView' },
      { key: 'retainersCancel', label: 'Cancel Retainer', labelKey: 'permOp.haraka.retainersCancel', requiresKey: 'retainersView' },
      { key: 'retainersAddInvoice', label: 'Add Retainer Invoice', labelKey: 'permOp.haraka.retainersAddInvoice', requiresKey: 'retainersView' },
      { key: 'retainersReactivate', label: 'Reactivate Retainer', labelKey: 'permOp.haraka.retainersReactivate', requiresKey: 'retainersView' },
      { key: 'serviceCatalogView', label: 'View Service Catalog', labelKey: 'permOp.haraka.serviceCatalogView' },
      { key: 'serviceCatalogCreate', label: 'Add Service', labelKey: 'permOp.haraka.serviceCatalogCreate', requiresKey: 'serviceCatalogView' },
      { key: 'serviceCatalogUpdate', label: 'Edit Service', labelKey: 'permOp.haraka.serviceCatalogUpdate', requiresKey: 'serviceCatalogView' },
      { key: 'serviceCatalogDelete', label: 'Delete Service', labelKey: 'permOp.haraka.serviceCatalogDelete', requiresKey: 'serviceCatalogView' },
      { key: 'appointmentsView', label: 'View Appointments', labelKey: 'permOp.haraka.appointmentsView' },
      { key: 'appointmentsCreate', label: 'Book Appointment', labelKey: 'permOp.haraka.appointmentsCreate', requiresKey: 'appointmentsView' },
      { key: 'appointmentsUpdate', label: 'Edit / Reschedule Appointment', labelKey: 'permOp.haraka.appointmentsUpdate', requiresKey: 'appointmentsView' },
      { key: 'appointmentsConfirm', label: 'Confirm Appointment', labelKey: 'permOp.haraka.appointmentsConfirm', requiresKey: 'appointmentsView' },
      { key: 'appointmentsComplete', label: 'Complete Appointment', labelKey: 'permOp.haraka.appointmentsComplete', requiresKey: 'appointmentsView' },
      { key: 'appointmentsCancel', label: 'Cancel Appointment', labelKey: 'permOp.haraka.appointmentsCancel', requiresKey: 'appointmentsView' },
      { key: 'appointmentsMarkNoShow', label: 'Mark Appointment No-Show', labelKey: 'permOp.haraka.appointmentsMarkNoShow', requiresKey: 'appointmentsView' },
      { key: 'appointmentsGenerateInvoice', label: 'Generate Invoice for Appointment', labelKey: 'permOp.haraka.appointmentsGenerateInvoice', requiresKey: 'appointmentsView' },
      { key: 'appointmentsAddPayment', label: 'Add Payment Entry (Appointments)', labelKey: 'permOp.haraka.appointmentsAddPayment', requiresKey: 'appointmentsView' },
      { key: 'staffManage', label: 'Manage Staff Capabilities', labelKey: 'permOp.haraka.staffManage', requiresKey: 'deliveryAgentsView' },
      { key: 'staffAvailabilityManage', label: 'Manage Staff Working Hours', labelKey: 'permOp.haraka.staffAvailabilityManage', requiresKey: 'staffManage' },
      { key: 'analyticsView', label: 'View Analytics', labelKey: 'permOp.haraka.analyticsView' },
    ],
  },
  {
    key: 'zeyara', label: 'Zeyara (Clinics)', labelKey: 'permModule.zeyara',
    featureKey: 'zeyara', group: 'zeyara',
    operations: [
      { key: 'view', label: 'View Zeyara Dashboard', labelKey: 'permOp.zeyara.view' },
      { key: 'appointmentsView', label: 'View Appointments', labelKey: 'permOp.zeyara.appointmentsView' },
      { key: 'appointmentsCreate', label: 'Book Appointment', labelKey: 'permOp.zeyara.appointmentsCreate', requiresKey: 'appointmentsView' },
      { key: 'appointmentsUpdate', label: 'Edit / Reschedule Appointment', labelKey: 'permOp.zeyara.appointmentsUpdate', requiresKey: 'appointmentsView' },
      { key: 'appointmentsConfirm', label: 'Confirm Appointment', labelKey: 'permOp.zeyara.appointmentsConfirm', requiresKey: 'appointmentsView' },
      { key: 'appointmentsComplete', label: 'Complete Appointment', labelKey: 'permOp.zeyara.appointmentsComplete', requiresKey: 'appointmentsView' },
      { key: 'appointmentsCancel', label: 'Cancel Appointment', labelKey: 'permOp.zeyara.appointmentsCancel', requiresKey: 'appointmentsView' },
      { key: 'appointmentsMarkNoShow', label: 'Mark Appointment No-Show', labelKey: 'permOp.zeyara.appointmentsMarkNoShow', requiresKey: 'appointmentsView' },
      { key: 'appointmentsGenerateInvoice', label: 'Generate Invoice for Appointment', labelKey: 'permOp.zeyara.appointmentsGenerateInvoice', requiresKey: 'appointmentsView' },
      { key: 'appointmentsAddPayment', label: 'Add Payment Entry', labelKey: 'permOp.zeyara.appointmentsAddPayment', requiresKey: 'appointmentsView' },
      { key: 'customersView', label: 'View Patients', labelKey: 'permOp.zeyara.customersView' },
      { key: 'customersCreate', label: 'Add Patients', labelKey: 'permOp.zeyara.customersCreate', requiresKey: 'customersView' },
      { key: 'customersUpdate', label: 'Edit Patients', labelKey: 'permOp.zeyara.customersUpdate', requiresKey: 'customersView' },
      { key: 'customersDelete', label: 'Delete Patients', labelKey: 'permOp.zeyara.customersDelete', requiresKey: 'customersView' },
      { key: 'customersExport', label: 'Export Patients', labelKey: 'permOp.zeyara.customersExport', requiresKey: 'customersView' },
      { key: 'customersHistoryView', label: 'View Patient History', labelKey: 'permOp.zeyara.customersHistoryView', requiresKey: 'customersView' },
      { key: 'customerFieldsView', label: 'View Patient Fields', labelKey: 'permOp.zeyara.customerFieldsView' },
      { key: 'customerFieldsCreate', label: 'Add Patient Fields', labelKey: 'permOp.zeyara.customerFieldsCreate', requiresKey: 'customerFieldsView' },
      { key: 'customerFieldsUpdate', label: 'Edit Patient Fields', labelKey: 'permOp.zeyara.customerFieldsUpdate', requiresKey: 'customerFieldsView' },
      { key: 'customerFieldsDelete', label: 'Delete Patient Fields', labelKey: 'permOp.zeyara.customerFieldsDelete', requiresKey: 'customerFieldsView' },
      { key: 'serviceCatalogView', label: 'View Service Catalog', labelKey: 'permOp.zeyara.serviceCatalogView' },
      { key: 'serviceCatalogCreate', label: 'Add Service', labelKey: 'permOp.zeyara.serviceCatalogCreate', requiresKey: 'serviceCatalogView' },
      { key: 'serviceCatalogUpdate', label: 'Edit Service', labelKey: 'permOp.zeyara.serviceCatalogUpdate', requiresKey: 'serviceCatalogView' },
      { key: 'serviceCatalogDelete', label: 'Delete Service', labelKey: 'permOp.zeyara.serviceCatalogDelete', requiresKey: 'serviceCatalogView' },
      { key: 'staffManage', label: 'Manage Providers', labelKey: 'permOp.zeyara.staffManage' },
      { key: 'staffAvailabilityManage', label: 'Manage Provider Working Hours', labelKey: 'permOp.zeyara.staffAvailabilityManage', requiresKey: 'staffManage' },
      { key: 'analyticsView', label: 'View Analytics', labelKey: 'permOp.zeyara.analyticsView' },
      { key: 'visitsView', label: 'View Clinical Records', labelKey: 'permOp.zeyara.visitsView' },
      { key: 'visitsCreate', label: 'Open Clinical Record', labelKey: 'permOp.zeyara.visitsCreate', requiresKey: 'visitsView' },
      { key: 'visitsUpdate', label: 'Edit Clinical Record', labelKey: 'permOp.zeyara.visitsUpdate', requiresKey: 'visitsView' },
      { key: 'visitsDelete', label: 'Delete Clinical Record', labelKey: 'permOp.zeyara.visitsDelete', requiresKey: 'visitsView' },
      { key: 'visitNotesCreate', label: 'Add Clinical Note', labelKey: 'permOp.zeyara.visitNotesCreate', requiresKey: 'visitsView' },
      { key: 'visitAttachmentsUpload', label: 'Upload Visit Attachment', labelKey: 'permOp.zeyara.visitAttachmentsUpload', requiresKey: 'visitsView' },
      { key: 'visitAttachmentsDelete', label: 'Delete Visit Attachment', labelKey: 'permOp.zeyara.visitAttachmentsDelete', requiresKey: 'visitsView' },
      { key: 'followUpsView', label: 'View Follow-ups', labelKey: 'permOp.zeyara.followUpsView', requiresKey: 'visitsView' },
    ],
  },
  {
    key: 'documentReports', label: 'Document Reports', labelKey: 'permModule.documentReports',
    featureKey: 'pos', group: 'haraka',
    operations: [
      { key: 'reportsView', label: 'View Reports', labelKey: 'permOp.documentReports.reportsView' },
      { key: 'reportsCreate', label: 'Generate Reports', labelKey: 'permOp.documentReports.reportsCreate', requiresKey: 'reportsView' },
      { key: 'reportsEdit', label: 'Edit Reports', labelKey: 'permOp.documentReports.reportsEdit', requiresKey: 'reportsView' },
      { key: 'reportsManageTemplates', label: 'Manage Report Templates', labelKey: 'permOp.documentReports.reportsManageTemplates', requiresKey: 'reportsView' },
    ],
  },
  {
    key: 'support', label: 'Support', labelKey: 'permModule.support',
    featureKey: 'support', group: 'platform',
    operations: [
      { key: 'view', label: 'View Support Page', labelKey: 'permOp.support.view' },
      { key: 'viewOthers', label: "View Others' Tickets", labelKey: 'permOp.support.viewOthers', requiresView: true },
      { key: 'submit', label: 'Submit Tickets', labelKey: 'permOp.support.submit', requiresView: true },
      { key: 'replyOwn', label: 'Reply to Own Tickets', labelKey: 'permOp.support.replyOwn', requiresView: true },
      { key: 'replyOthers', label: "Reply to Others' Tickets", labelKey: 'permOp.support.replyOthers', requiresKey: 'viewOthers' },
    ],
  },
  {
    key: 'auditLogs', label: 'Audit Logs', labelKey: 'permModule.auditLogs',
    featureKey: 'auditLogs', group: 'platform',
    operations: [
      { key: 'view', label: 'View Audit Logs Page', labelKey: 'permOp.auditLogs.view' },
      { key: 'viewSpace', label: 'View Current Space Logs', labelKey: 'permOp.auditLogs.viewSpace', requiresView: true },
      { key: 'viewAllSpaces', label: 'View All Spaces Logs', labelKey: 'permOp.auditLogs.viewAllSpaces', requiresView: true },
    ],
  },
  {
    key: 'leads', label: 'Leads', labelKey: 'permModule.leads',
    group: 'platform', hideFromEditor: true,
    operations: [
      { key: 'view', label: 'View Leads', labelKey: 'permOp.leads.view' },
    ],
  },
  {
    key: 'banna', label: 'Customization', labelKey: 'permModule.banna',
    featureKey: 'banna', group: 'platform',
    operations: [
      { key: 'view', label: 'View', labelKey: 'permOp.banna.view' },
      { key: 'create', label: 'Create', labelKey: 'permOp.banna.create', requiresView: true },
      { key: 'update', label: 'Update', labelKey: 'permOp.banna.update', requiresView: true },
      { key: 'delete', label: 'Delete', labelKey: 'permOp.banna.delete', requiresView: true },
    ],
  },
  {
    key: 'settingsOrgInfo', label: 'Organization Info', labelKey: 'permModule.settingsOrgInfo',
    group: 'settings',
    operations: [
      { key: 'view', label: 'View Organization Info', labelKey: 'permOp.settingsOrgInfo.view' },
      { key: 'editName', label: 'Edit Organization Name', labelKey: 'permOp.settingsOrgInfo.editName', requiresView: true },
      { key: 'editBranding', label: 'Edit Branding', labelKey: 'permOp.settingsOrgInfo.editBranding', requiresView: true },
    ],
  },
  {
    key: 'settingsSpaces', label: 'Spaces', labelKey: 'permModule.settingsSpaces',
    group: 'settings',
    operations: [
      { key: 'view', label: 'View Spaces', labelKey: 'permOp.settingsSpaces.view' },
      { key: 'create', label: 'Create Spaces', labelKey: 'permOp.settingsSpaces.create', requiresView: true },
      { key: 'update', label: 'Edit Spaces', labelKey: 'permOp.settingsSpaces.update', requiresView: true },
      { key: 'grantAccess', label: 'Grant User Access', labelKey: 'permOp.settingsSpaces.grantAccess', requiresView: true },
      { key: 'archive', label: 'Archive Space', labelKey: 'permOp.settingsSpaces.archive', requiresView: true },
      { key: 'restore', label: 'Restore Archived Space', labelKey: 'permOp.settingsSpaces.restore', requiresView: true },
    ],
  },
  {
    key: 'settingsLists', label: 'Lists', labelKey: 'permModule.settingsLists',
    group: 'settings',
    operations: [
      { key: 'view', label: 'View Lists', labelKey: 'permOp.settingsLists.view' },
      { key: 'create', label: 'Add List Items', labelKey: 'permOp.settingsLists.create', requiresView: true },
      { key: 'update', label: 'Edit List Items', labelKey: 'permOp.settingsLists.update', requiresView: true },
      { key: 'delete', label: 'Delete List Items', labelKey: 'permOp.settingsLists.delete', requiresView: true },
    ],
  },
  {
    key: 'settingsSubscription', label: 'Subscription', labelKey: 'permModule.settingsSubscription',
    group: 'settings',
    operations: [
      { key: 'view', label: 'View Subscription', labelKey: 'permOp.settingsSubscription.view' },
    ],
  },
  {
    key: 'settingsUsers', label: 'Users', labelKey: 'permModule.settingsUsers',
    group: 'settings',
    operations: [
      { key: 'view', label: 'View Users', labelKey: 'permOp.settingsUsers.view' },
      { key: 'invite', label: 'Invite Users', labelKey: 'permOp.settingsUsers.invite', requiresView: true },
      { key: 'update', label: 'Edit Users', labelKey: 'permOp.settingsUsers.update', requiresView: true },
      { key: 'revoke', label: 'Revoke Invites', labelKey: 'permOp.settingsUsers.revoke', requiresView: true },
      { key: 'resetPassword', label: "Reset Users' Passwords", labelKey: 'permOp.settingsUsers.resetPassword', requiresView: true },
      { key: 'delete', label: 'Delete Users', labelKey: 'permOp.settingsUsers.delete', requiresView: true },
    ],
  },
  {
    key: 'settingsReceipt', label: 'Receipt Customization', labelKey: 'permModule.settingsReceipt',
    group: 'settings',
    operations: [
      { key: 'view', label: 'View Receipt Customization', labelKey: 'permOp.settingsReceipt.view' },
      { key: 'update', label: 'Edit Receipt Customization', labelKey: 'permOp.settingsReceipt.update', requiresView: true },
    ],
  },
  {
    key: 'settingsInvoice', label: 'Invoice Customization', labelKey: 'permModule.settingsInvoice',
    group: 'settings',
    operations: [
      { key: 'view', label: 'View Invoice Customization', labelKey: 'permOp.settingsInvoice.view' },
      { key: 'update', label: 'Edit Invoice Customization', labelKey: 'permOp.settingsInvoice.update', requiresView: true },
    ],
  },
  {
    key: 'settingsWarrantyCert', label: 'Warranty Certificate Customization', labelKey: 'permModule.settingsWarrantyCert',
    group: 'settings',
    operations: [
      { key: 'view', label: 'View Warranty Certificate Customization', labelKey: 'permOp.settingsWarrantyCert.view' },
      { key: 'update', label: 'Edit Warranty Certificate Customization', labelKey: 'permOp.settingsWarrantyCert.update', requiresView: true },
    ],
  },
  {
    key: 'settingsNotifications', label: 'Notifications', labelKey: 'permModule.settingsNotifications',
    group: 'settings',
    operations: [
      { key: 'view', label: 'View Notifications Settings', labelKey: 'permOp.settingsNotifications.view' },
      { key: 'update', label: 'Edit Notifications Settings', labelKey: 'permOp.settingsNotifications.update', requiresView: true },
    ],
  },
  {
    key: 'settingsCashDrawer', label: 'Cash Drawer', labelKey: 'permModule.settingsCashDrawer',
    group: 'settings',
    operations: [
      { key: 'view', label: 'View Cash Drawer Settings', labelKey: 'permOp.settingsCashDrawer.view' },
      { key: 'update', label: 'Edit Cash Drawer Settings', labelKey: 'permOp.settingsCashDrawer.update', requiresView: true },
    ],
  },
];
