import type { MessageKey } from '@/locales/messages';

export interface AssetPermissions {
  view: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
  import: boolean;
  checkout: boolean;
  maintenance: boolean;
  notes: boolean;
}

export interface InventoryPermissions {
  view: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
  transactions: boolean;
  audits: boolean;
}

export interface WarrantyPermissions {
  view: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
}

export interface RequestPermissions {
  view: boolean;
  create: boolean;
  approve: boolean;
}

export interface ReportsPermissions {
  view: boolean;
}

export interface SupportPermissions {
  view: boolean;
  create: boolean;
}

export interface AuditLogsPermissions {
  view: boolean;
}

export interface PosPermissions {
  open_session: boolean;
  close_session: boolean;
  process_sale: boolean;
  apply_discount: boolean;
  issue_refund: boolean;
  void_transaction: boolean;
  view_reports: boolean;
  fawtara_submit: boolean;
}

export interface PurchasePermissions {
  view: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
  receive: boolean;
}

export interface SettingsPermissions {
  view: boolean;
  orgInfo: boolean;
  subscription: boolean;
  users: boolean;
  taxRates: boolean;
  fawtara: boolean;
}

export interface LeadsPermissions {
  view: boolean;
}

export interface UserPermissions {
  assets: AssetPermissions;
  inventory: InventoryPermissions;
  purchases: PurchasePermissions;
  warranties: WarrantyPermissions;
  requests: RequestPermissions;
  reports: ReportsPermissions;
  support: SupportPermissions;
  auditLogs: AuditLogsPermissions;
  leads: LeadsPermissions;
  pos: PosPermissions;
  settings: SettingsPermissions;
}

export const DEFAULT_ADMIN_PERMISSIONS: UserPermissions = {
  assets:    { view: true,  create: true,  update: true,  delete: true,  import: true,  checkout: true,  maintenance: true,  notes: true  },
  inventory: { view: true,  create: true,  update: true,  delete: true,  transactions: true,  audits: true  },
  purchases: { view: true,  create: true,  update: true,  delete: true,  receive: true },
  warranties:{ view: true,  create: true,  update: true,  delete: true  },
  requests:  { view: true,  create: true,  approve: true  },
  reports:   { view: true  },
  support:   { view: true,  create: true  },
  auditLogs: { view: true  },
  leads:     { view: true  },
  pos:       { open_session: true, close_session: true, process_sale: true, apply_discount: true, issue_refund: true, void_transaction: true, view_reports: true, fawtara_submit: true },
  settings:  { view: true,  orgInfo: true,  subscription: true,  users: true,  taxRates: true,  fawtara: true  },
};

export const DEFAULT_STAFF_PERMISSIONS: UserPermissions = {
  assets:    { view: true,  create: false, update: false, delete: false, import: false, checkout: false, maintenance: false, notes: false },
  inventory: { view: true,  create: false, update: false, delete: false, transactions: false, audits: false },
  purchases: { view: false, create: false, update: false, delete: false, receive: false },
  warranties:{ view: true,  create: false, update: false, delete: false },
  requests:  { view: true,  create: true,  approve: false },
  reports:   { view: false },
  support:   { view: true,  create: true },
  auditLogs: { view: false },
  leads:     { view: true  },
  pos:       { open_session: false, close_session: false, process_sale: false, apply_discount: false, issue_refund: false, void_transaction: false, view_reports: false, fawtara_submit: false },
  settings:  { view: false, orgInfo: false, subscription: false, users: false, taxRates: false, fawtara: false },
};

export interface ModuleOperationConfig {
  key: string;
  label: string;
  labelKey: MessageKey;
  requiresView?: boolean;
}

export type ModuleGroup = 'core' | 'commerce' | 'workflow' | 'admin';

export interface ModuleConfig {
  key: keyof UserPermissions;
  label: string;
  labelKey: MessageKey;
  featureKey?: string;
  /** Optional visual grouping in the PermissionsEditor. Defaults to 'core' when omitted. */
  group?: ModuleGroup;
  operations: ModuleOperationConfig[];
}

export const MODULE_GROUP_LABELS: Record<ModuleGroup, string> = {
  core: 'Core',
  commerce: 'Commerce',
  workflow: 'Workflow',
  admin: 'Admin',
};

export const MODULE_GROUP_LABEL_KEYS: Record<ModuleGroup, MessageKey> = {
  core: 'permGroup.core',
  commerce: 'permGroup.commerce',
  workflow: 'permGroup.workflow',
  admin: 'permGroup.admin',
};

export const MODULE_GROUP_ORDER: ModuleGroup[] = ['core', 'commerce', 'workflow', 'admin'];

export const MODULE_PERMISSIONS_CONFIG: ModuleConfig[] = [
  {
    key: 'assets',
    label: 'Assets',
    labelKey: 'permModule.assets',
    featureKey: 'assets',
    group: 'core',
    operations: [
      { key: 'view',        label: 'View Assets',         labelKey: 'permOp.assets.view' },
      { key: 'create',      label: 'Add Assets',          labelKey: 'permOp.assets.create',      requiresView: true },
      { key: 'update',      label: 'Edit Assets',         labelKey: 'permOp.assets.update',      requiresView: true },
      { key: 'delete',      label: 'Delete Assets',       labelKey: 'permOp.assets.delete',      requiresView: true },
      { key: 'import',      label: 'Import Assets',       labelKey: 'permOp.assets.import',      requiresView: true },
      { key: 'checkout',    label: 'Check In / Out',      labelKey: 'permOp.assets.checkout',    requiresView: true },
      { key: 'maintenance', label: 'Maintenance Records', labelKey: 'permOp.assets.maintenance', requiresView: true },
      { key: 'notes',       label: 'Asset Notes',         labelKey: 'permOp.assets.notes',       requiresView: true },
    ],
  },
  {
    key: 'inventory',
    label: 'Inventory',
    labelKey: 'permModule.inventory',
    featureKey: 'inventory',
    group: 'core',
    operations: [
      { key: 'view',         label: 'View Inventory',      labelKey: 'permOp.inventory.view' },
      { key: 'create',       label: 'Add Items',           labelKey: 'permOp.inventory.create',       requiresView: true },
      { key: 'update',       label: 'Edit Items',          labelKey: 'permOp.inventory.update',       requiresView: true },
      { key: 'delete',       label: 'Delete Items',        labelKey: 'permOp.inventory.delete',       requiresView: true },
      { key: 'transactions', label: 'Record Transactions', labelKey: 'permOp.inventory.transactions', requiresView: true },
      { key: 'audits',       label: 'Manage Audits',       labelKey: 'permOp.inventory.audits',       requiresView: true },
    ],
  },
  {
    key: 'warranties',
    label: 'Warranties',
    labelKey: 'permModule.warranties',
    featureKey: 'warranties',
    group: 'core',
    operations: [
      { key: 'view',   label: 'View Warranties',   labelKey: 'permOp.warranties.view' },
      { key: 'create', label: 'Add Warranties',    labelKey: 'permOp.warranties.create', requiresView: true },
      { key: 'update', label: 'Edit Warranties',   labelKey: 'permOp.warranties.update', requiresView: true },
      { key: 'delete', label: 'Delete Warranties', labelKey: 'permOp.warranties.delete', requiresView: true },
    ],
  },
  {
    key: 'requests',
    label: 'Requests',
    labelKey: 'permModule.requests',
    featureKey: 'requests',
    group: 'workflow',
    operations: [
      { key: 'view',    label: 'View Requests',    labelKey: 'permOp.requests.view' },
      { key: 'create',  label: 'Submit Requests',  labelKey: 'permOp.requests.create',  requiresView: true },
      { key: 'approve', label: 'Approve / Reject', labelKey: 'permOp.requests.approve', requiresView: true },
    ],
  },
  {
    key: 'reports',
    label: 'Reports',
    labelKey: 'permModule.reports',
    featureKey: 'reports',
    group: 'workflow',
    operations: [
      { key: 'view', label: 'View Reports', labelKey: 'permOp.reports.view' },
    ],
  },
  {
    key: 'support',
    label: 'Support',
    labelKey: 'permModule.support',
    featureKey: 'support',
    group: 'workflow',
    operations: [
      { key: 'view',   label: 'View Tickets',   labelKey: 'permOp.support.view' },
      { key: 'create', label: 'Create Tickets', labelKey: 'permOp.support.create', requiresView: true },
    ],
  },
  {
    key: 'auditLogs',
    label: 'Audit Logs',
    labelKey: 'permModule.auditLogs',
    featureKey: 'auditLogs',
    group: 'admin',
    operations: [
      { key: 'view', label: 'View Audit Logs', labelKey: 'permOp.auditLogs.view' },
    ],
  },
  {
    key: 'leads',
    label: 'Leads',
    labelKey: 'permModule.leads',
    group: 'admin',
    operations: [
      { key: 'view', label: 'View Leads', labelKey: 'permOp.leads.view' },
    ],
  },
  {
    key: 'purchases',
    label: 'Purchases',
    labelKey: 'permModule.purchases',
    featureKey: 'inventory',
    group: 'commerce',
    operations: [
      { key: 'view',    label: 'View Purchases',                labelKey: 'permOp.purchases.view' },
      { key: 'create',  label: 'Create Purchases',              labelKey: 'permOp.purchases.create',  requiresView: true },
      { key: 'update',  label: 'Edit Purchases',                labelKey: 'permOp.purchases.update',  requiresView: true },
      { key: 'delete',  label: 'Delete Purchases',              labelKey: 'permOp.purchases.delete',  requiresView: true },
      { key: 'receive', label: 'Receive Purchases (stock-in)',  labelKey: 'permOp.purchases.receive', requiresView: true },
    ],
  },
  {
    key: 'pos',
    label: 'Point of Sale (Haraka)',
    labelKey: 'permModule.pos',
    featureKey: 'pos',
    group: 'commerce',
    operations: [
      { key: 'open_session',      label: 'Open Session',        labelKey: 'permOp.pos.open_session' },
      { key: 'close_session',     label: 'Close Session',       labelKey: 'permOp.pos.close_session' },
      { key: 'process_sale',      label: 'Process Sales',       labelKey: 'permOp.pos.process_sale' },
      { key: 'apply_discount',    label: 'Apply Discounts',     labelKey: 'permOp.pos.apply_discount' },
      { key: 'issue_refund',      label: 'Issue Refunds',       labelKey: 'permOp.pos.issue_refund' },
      { key: 'void_transaction',  label: 'Void Transactions',   labelKey: 'permOp.pos.void_transaction' },
      { key: 'view_reports',      label: 'View Reports',        labelKey: 'permOp.pos.view_reports' },
      { key: 'fawtara_submit',    label: 'Resubmit to Fawtara', labelKey: 'permOp.pos.fawtara_submit' },
    ],
  },
  {
    key: 'settings',
    label: 'Settings',
    labelKey: 'permModule.settings',
    group: 'admin',
    operations: [
      { key: 'orgInfo',      label: 'Organization Info',          labelKey: 'permOp.settings.orgInfo' },
      { key: 'subscription', label: 'Subscription',               labelKey: 'permOp.settings.subscription' },
      { key: 'users',        label: 'Users',                      labelKey: 'permOp.settings.users' },
      { key: 'taxRates',     label: 'Tax Rates',                  labelKey: 'permOp.settings.taxRates' },
      { key: 'fawtara',      label: 'Fawtara (Jordan e-invoicing)', labelKey: 'permOp.settings.fawtara' },
    ],
  },
];
