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
  bulk_delete: boolean;
  bulk_move: boolean;
  bulk_duplicate: boolean;
}

export interface InventoryPermissions {
  view: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
  transactions: boolean;
  audits: boolean;
  bulk_delete: boolean;
  bulk_move: boolean;
  bulk_duplicate: boolean;
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
  bulk_move: boolean;
  bulk_duplicate: boolean;
}

export interface DashboardPermissions {
  view: boolean;
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
  customers_bulk_delete: boolean;
  customers_bulk_move: boolean;
  customers_bulk_duplicate: boolean;
  view_orders: boolean;
  manage_orders: boolean;
  assign_delivery: boolean;
  manage_delivery_agents: boolean;
  view_warranty_certs: boolean;
  manage_warranty_certs: boolean;
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

export interface BannaPermissions {
  view: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
}

export interface UserPermissions {
  dashboard: DashboardPermissions;
  assets: AssetPermissions;
  inventory: InventoryPermissions;
  purchases: PurchasePermissions;
  warranties: WarrantyPermissions;
  requests: RequestPermissions;
  reports: ReportsPermissions;
  support: SupportPermissions;
  auditLogs: AuditLogsPermissions;
  leads: LeadsPermissions;
  banna: BannaPermissions;
  pos: PosPermissions;
  settings: SettingsPermissions;
}

export const DEFAULT_ADMIN_PERMISSIONS: UserPermissions = {
  dashboard: { view: true  },
  assets:    { view: true,  create: true,  update: true,  delete: true,  import: true,  checkout: true,  maintenance: true,  notes: true,  bulk_delete: true,  bulk_move: true,  bulk_duplicate: true  },
  inventory: { view: true,  create: true,  update: true,  delete: true,  transactions: true,  audits: true,  bulk_delete: true,  bulk_move: true,  bulk_duplicate: true  },
  purchases: { view: true,  create: true,  update: true,  delete: true,  receive: true },
  warranties:{ view: true,  create: true,  update: true,  delete: true  },
  requests:  { view: true,  create: true,  approve: true,  bulk_move: true,  bulk_duplicate: true  },
  reports:   { view: true  },
  support:   { view: true,  create: true  },
  auditLogs: { view: true  },
  leads:     { view: true  },
  banna:     { view: true,  create: true,  update: true,  delete: true  },
  pos:       { open_session: true, close_session: true, process_sale: true, apply_discount: true, issue_refund: true, void_transaction: true, view_reports: true, fawtara_submit: true, customers_bulk_delete: true, customers_bulk_move: true, customers_bulk_duplicate: true, view_orders: true, manage_orders: true, assign_delivery: true, manage_delivery_agents: true, view_warranty_certs: true, manage_warranty_certs: true },
  settings:  { view: true,  orgInfo: true,  subscription: true,  users: true,  taxRates: true,  fawtara: true  },
};

export const DEFAULT_STAFF_PERMISSIONS: UserPermissions = {
  dashboard: { view: false  },
  assets:    { view: true,  create: false, update: false, delete: false, import: false, checkout: false, maintenance: false, notes: false, bulk_delete: false, bulk_move: false, bulk_duplicate: false },
  inventory: { view: true,  create: false, update: false, delete: false, transactions: false, audits: false, bulk_delete: false, bulk_move: false, bulk_duplicate: false },
  purchases: { view: false, create: false, update: false, delete: false, receive: false },
  warranties:{ view: true,  create: false, update: false, delete: false },
  requests:  { view: true,  create: true,  approve: false, bulk_move: false, bulk_duplicate: false },
  reports:   { view: false },
  support:   { view: true,  create: true },
  auditLogs: { view: false },
  leads:     { view: true  },
  banna:     { view: true,  create: false, update: false, delete: false },
  pos:       { open_session: false, close_session: false, process_sale: false, apply_discount: false, issue_refund: false, void_transaction: false, view_reports: false, fawtara_submit: false, customers_bulk_delete: false, customers_bulk_move: false, customers_bulk_duplicate: false, view_orders: false, manage_orders: false, assign_delivery: false, manage_delivery_agents: false, view_warranty_certs: false, manage_warranty_certs: false },
  settings:  { view: false, orgInfo: false, subscription: false, users: false, taxRates: false, fawtara: false },
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
    key: 'dashboard',
    label: 'Dashboard',
    labelKey: 'permModule.dashboard',
    featureKey: 'dashboard',
    group: 'core',
    operations: [
      { key: 'view', label: 'View Dashboard', labelKey: 'permOp.dashboard.view' },
    ],
  },
  {
    key: 'assets',
    label: 'Assets',
    labelKey: 'permModule.assets',
    featureKey: 'assets',
    group: 'core',
    operations: [
      { key: 'view',           label: 'View Assets',         labelKey: 'permOp.assets.view' },
      { key: 'create',         label: 'Add Assets',          labelKey: 'permOp.assets.create',         requiresView: true },
      { key: 'update',         label: 'Edit Assets',         labelKey: 'permOp.assets.update',         requiresView: true },
      { key: 'delete',         label: 'Delete Assets',       labelKey: 'permOp.assets.delete',         requiresView: true },
      { key: 'import',         label: 'Import Assets',       labelKey: 'permOp.assets.import',         requiresView: true },
      { key: 'checkout',       label: 'Check In / Out',      labelKey: 'permOp.assets.checkout',       requiresView: true },
      { key: 'maintenance',    label: 'Maintenance Records', labelKey: 'permOp.assets.maintenance',    requiresView: true },
      { key: 'notes',           label: 'Asset Notes',         labelKey: 'permOp.assets.notes',         requiresView: true },
      { key: 'bulk_delete',    label: 'Bulk delete',         labelKey: 'permOp.assets.bulk_delete',    requiresView: true },
      { key: 'bulk_move',      label: 'Bulk move to space',  labelKey: 'permOp.assets.bulk_move',      requiresView: true },
      { key: 'bulk_duplicate', label: 'Bulk duplicate to space', labelKey: 'permOp.assets.bulk_duplicate', requiresView: true },
    ],
  },
  {
    key: 'inventory',
    label: 'Inventory',
    labelKey: 'permModule.inventory',
    featureKey: 'inventory',
    group: 'core',
    operations: [
      { key: 'view',           label: 'View Inventory',      labelKey: 'permOp.inventory.view' },
      { key: 'create',         label: 'Add Items',           labelKey: 'permOp.inventory.create',         requiresView: true },
      { key: 'update',         label: 'Edit Items',          labelKey: 'permOp.inventory.update',         requiresView: true },
      { key: 'delete',         label: 'Delete Items',        labelKey: 'permOp.inventory.delete',         requiresView: true },
      { key: 'transactions',   label: 'Record Transactions', labelKey: 'permOp.inventory.transactions',   requiresView: true },
      { key: 'audits',         label: 'Manage Audits',       labelKey: 'permOp.inventory.audits',         requiresView: true },
      { key: 'bulk_delete',    label: 'Bulk delete',         labelKey: 'permOp.inventory.bulk_delete',    requiresView: true },
      { key: 'bulk_move',      label: 'Bulk move to space',  labelKey: 'permOp.inventory.bulk_move',      requiresView: true },
      { key: 'bulk_duplicate', label: 'Bulk duplicate to space', labelKey: 'permOp.inventory.bulk_duplicate', requiresView: true },
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
      { key: 'view',           label: 'View Requests',    labelKey: 'permOp.requests.view' },
      { key: 'create',         label: 'Submit Requests',  labelKey: 'permOp.requests.create',          requiresView: true },
      { key: 'approve',        label: 'Approve / Reject', labelKey: 'permOp.requests.approve',         requiresView: true },
      { key: 'bulk_move',      label: 'Bulk move to space',  labelKey: 'permOp.requests.bulk_move',      requiresView: true },
      { key: 'bulk_duplicate', label: 'Bulk duplicate to space', labelKey: 'permOp.requests.bulk_duplicate', requiresView: true },
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
      { key: 'open_session',             label: 'Open Session',        labelKey: 'permOp.pos.open_session' },
      { key: 'close_session',            label: 'Close Session',       labelKey: 'permOp.pos.close_session' },
      { key: 'process_sale',             label: 'Process Sales',       labelKey: 'permOp.pos.process_sale' },
      { key: 'apply_discount',           label: 'Apply Discounts',     labelKey: 'permOp.pos.apply_discount' },
      { key: 'issue_refund',             label: 'Issue Refunds',       labelKey: 'permOp.pos.issue_refund' },
      { key: 'void_transaction',         label: 'Void Transactions',   labelKey: 'permOp.pos.void_transaction' },
      { key: 'view_reports',             label: 'View Reports',        labelKey: 'permOp.pos.view_reports' },
      { key: 'fawtara_submit',           label: 'Resubmit to Fawtara', labelKey: 'permOp.pos.fawtara_submit' },
      { key: 'customers_bulk_delete',    label: 'Bulk delete customers',          labelKey: 'permOp.pos.customers_bulk_delete' },
      { key: 'customers_bulk_move',      label: 'Bulk move customers to space',   labelKey: 'permOp.pos.customers_bulk_move' },
      { key: 'customers_bulk_duplicate', label: 'Bulk duplicate customers',       labelKey: 'permOp.pos.customers_bulk_duplicate' },
      { key: 'view_orders',             label: 'View Orders',                    labelKey: 'permOp.pos.view_orders' },
      { key: 'manage_orders',           label: 'Create & Update Orders',         labelKey: 'permOp.pos.manage_orders',           requiresView: true, requiresKey: 'view_orders' },
      { key: 'assign_delivery',         label: 'Assign Delivery Agent',          labelKey: 'permOp.pos.assign_delivery',         requiresView: true, requiresKey: 'view_orders' },
      { key: 'manage_delivery_agents',  label: 'Manage Delivery Agents',         labelKey: 'permOp.pos.manage_delivery_agents',  requiresView: true, requiresKey: 'view_orders' },
      { key: 'view_warranty_certs',     label: 'View Warranty Certificates',     labelKey: 'permOp.pos.view_warranty_certs' },
      { key: 'manage_warranty_certs',   label: 'Generate & Delete Warranties',   labelKey: 'permOp.pos.manage_warranty_certs',   requiresView: true },
    ],
  },
  {
    key: 'banna',
    label: 'Workspace Builder',
    labelKey: 'permModule.banna',
    featureKey: 'banna',
    group: 'admin',
    operations: [
      { key: 'view',   label: 'View',   labelKey: 'permOp.banna.view' },
      { key: 'create', label: 'Create', labelKey: 'permOp.banna.create', requiresView: true },
      { key: 'update', label: 'Update', labelKey: 'permOp.banna.update', requiresView: true },
      { key: 'delete', label: 'Delete', labelKey: 'permOp.banna.delete', requiresView: true },
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
