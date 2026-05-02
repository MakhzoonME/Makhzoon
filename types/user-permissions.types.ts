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
}

export interface SettingsPermissions {
  view: boolean;
  orgInfo: boolean;
  subscription: boolean;
  users: boolean;
}

export interface UserPermissions {
  assets: AssetPermissions;
  inventory: InventoryPermissions;
  warranties: WarrantyPermissions;
  requests: RequestPermissions;
  reports: ReportsPermissions;
  support: SupportPermissions;
  auditLogs: AuditLogsPermissions;
  pos?: PosPermissions;
  settings: SettingsPermissions;
}

export const DEFAULT_ADMIN_PERMISSIONS: UserPermissions = {
  assets:    { view: true,  create: true,  update: true,  delete: true,  import: true,  checkout: true,  maintenance: true,  notes: true  },
  inventory: { view: true,  create: true,  update: true,  delete: true,  transactions: true,  audits: true  },
  warranties:{ view: true,  create: true,  update: true,  delete: true  },
  requests:  { view: true,  create: true,  approve: true  },
  reports:   { view: true  },
  support:   { view: true,  create: true  },
  auditLogs: { view: true  },
  settings:  { view: true,  orgInfo: true,  subscription: true,  users: true  },
};

export const DEFAULT_STAFF_PERMISSIONS: UserPermissions = {
  assets:    { view: true,  create: false, update: false, delete: false, import: false, checkout: false, maintenance: false, notes: false },
  inventory: { view: true,  create: false, update: false, delete: false, transactions: false, audits: false },
  warranties:{ view: true,  create: false, update: false, delete: false },
  requests:  { view: true,  create: true,  approve: false },
  reports:   { view: false },
  support:   { view: true,  create: true },
  auditLogs: { view: false },
  settings:  { view: false, orgInfo: false, subscription: false, users: false },
};

export interface ModuleOperationConfig {
  key: string;
  label: string;
  requiresView?: boolean;
}

export interface ModuleConfig {
  key: keyof UserPermissions;
  label: string;
  featureKey?: string;
  operations: ModuleOperationConfig[];
}

export const MODULE_PERMISSIONS_CONFIG: ModuleConfig[] = [
  {
    key: 'assets',
    label: 'Assets',
    featureKey: 'assets',
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
    operations: [
      { key: 'view', label: 'View Reports' },
    ],
  },
  {
    key: 'support',
    label: 'Support',
    featureKey: 'support',
    operations: [
      { key: 'view',   label: 'View Tickets' },
      { key: 'create', label: 'Create Tickets', requiresView: true },
    ],
  },
  {
    key: 'auditLogs',
    label: 'Audit Logs',
    featureKey: 'auditLogs',
    operations: [
      { key: 'view', label: 'View Audit Logs' },
    ],
  },
  {
    key: 'pos',
    label: 'Point of Sale',
    featureKey: 'pos',
    operations: [
      { key: 'open_session',      label: 'Open Session' },
      { key: 'close_session',     label: 'Close Session' },
      { key: 'process_sale',      label: 'Process Sales' },
      { key: 'apply_discount',    label: 'Apply Discounts', requiresView: true },
      { key: 'issue_refund',      label: 'Issue Refunds', requiresView: true },
      { key: 'void_transaction',  label: 'Void Transactions', requiresView: true },
      { key: 'view_reports',      label: 'View Reports' },
    ],
  },
  {
    key: 'settings',
    label: 'Settings',
    operations: [
      { key: 'orgInfo',      label: 'Organization Info', requiresView: true },
      { key: 'subscription', label: 'Subscription',      requiresView: true },
      { key: 'users',        label: 'Users',             requiresView: true },
    ],
  },
];
