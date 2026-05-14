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
  requiresView?: boolean;
}

export type ModuleGroup = 'core' | 'commerce' | 'workflow' | 'admin';

export interface ModuleConfig {
  key: keyof UserPermissions;
  label: string;
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

export const MODULE_GROUP_ORDER: ModuleGroup[] = ['core', 'commerce', 'workflow', 'admin'];

export const MODULE_PERMISSIONS_CONFIG: ModuleConfig[] = [
  {
    key: 'assets',
    label: 'Assets',
    featureKey: 'assets',
    group: 'core',
    operations: [
      { key: 'view',        label: 'View Assets' },
      { key: 'create',      label: 'Add Assets',         requiresView: true },
      { key: 'update',      label: 'Edit Assets',        requiresView: true },
      { key: 'delete',      label: 'Delete Assets',      requiresView: true },
      { key: 'import',      label: 'Import Assets',      requiresView: true },
      { key: 'checkout',    label: 'Check In / Out',     requiresView: true },
      { key: 'maintenance', label: 'Maintenance Records',requiresView: true },
      { key: 'notes',       label: 'Asset Notes',        requiresView: true },
    ],
  },
  {
    key: 'inventory',
    label: 'Inventory',
    featureKey: 'inventory',
    group: 'core',
    operations: [
      { key: 'view',         label: 'View Inventory' },
      { key: 'create',       label: 'Add Items',                requiresView: true },
      { key: 'update',       label: 'Edit Items',               requiresView: true },
      { key: 'delete',       label: 'Delete Items',             requiresView: true },
      { key: 'transactions', label: 'Record Transactions',      requiresView: true },
      { key: 'audits',       label: 'Manage Audits',            requiresView: true },
    ],
  },
  {
    key: 'warranties',
    label: 'Warranties',
    featureKey: 'warranties',
    group: 'core',
    operations: [
      { key: 'view',   label: 'View Warranties' },
      { key: 'create', label: 'Add Warranties',    requiresView: true },
      { key: 'update', label: 'Edit Warranties',   requiresView: true },
      { key: 'delete', label: 'Delete Warranties', requiresView: true },
    ],
  },
  {
    key: 'requests',
    label: 'Requests',
    featureKey: 'requests',
    group: 'workflow',
    operations: [
      { key: 'view',    label: 'View Requests' },
      { key: 'create',  label: 'Submit Requests', requiresView: true },
      { key: 'approve', label: 'Approve / Reject', requiresView: true },
    ],
  },
  {
    key: 'reports',
    label: 'Reports',
    featureKey: 'reports',
    group: 'workflow',
    operations: [
      { key: 'view', label: 'View Reports' },
    ],
  },
  {
    key: 'support',
    label: 'Support',
    featureKey: 'support',
    group: 'workflow',
    operations: [
      { key: 'view',   label: 'View Tickets' },
      { key: 'create', label: 'Create Tickets', requiresView: true },
    ],
  },
  {
    key: 'auditLogs',
    label: 'Audit Logs',
    featureKey: 'auditLogs',
    group: 'admin',
    operations: [
      { key: 'view', label: 'View Audit Logs' },
    ],
  },
  {
    key: 'leads',
    label: 'Leads',
    group: 'admin',
    operations: [
      { key: 'view', label: 'View Leads' },
    ],
  },
  {
    key: 'purchases',
    label: 'Purchases',
    featureKey: 'inventory',
    group: 'commerce',
    operations: [
      { key: 'view',    label: 'View Purchases' },
      { key: 'create',  label: 'Create Purchases',  requiresView: true },
      { key: 'update',  label: 'Edit Purchases',    requiresView: true },
      { key: 'delete',  label: 'Delete Purchases',  requiresView: true },
      { key: 'receive', label: 'Receive Purchases (stock-in)', requiresView: true },
    ],
  },
  {
    key: 'pos',
    label: 'Point of Sale (Haraka)',
    featureKey: 'pos',
    group: 'commerce',
    operations: [
      { key: 'open_session',      label: 'Open Session' },
      { key: 'close_session',     label: 'Close Session' },
      { key: 'process_sale',      label: 'Process Sales' },
      { key: 'apply_discount',    label: 'Apply Discounts' },
      { key: 'issue_refund',      label: 'Issue Refunds' },
      { key: 'void_transaction',  label: 'Void Transactions' },
      { key: 'view_reports',      label: 'View Reports' },
      { key: 'fawtara_submit',    label: 'Resubmit to Fawtara' },
    ],
  },
  {
    key: 'settings',
    label: 'Settings',
    group: 'admin',
    operations: [
      { key: 'orgInfo',      label: 'Organization Info' },
      { key: 'subscription', label: 'Subscription' },
      { key: 'users',        label: 'Users' },
      { key: 'taxRates',     label: 'Tax Rates' },
      { key: 'fawtara',      label: 'Fawtara (Jordan e-invoicing)' },
    ],
  },
];
