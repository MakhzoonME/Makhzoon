export interface OrganizationsPermissions {
  view: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
}

export interface SupportMgmtPermissions {
  view: boolean;
  respond: boolean;
  close: boolean;
}

export interface ConfigurationPermissions {
  view: boolean;
  edit: boolean;
}

export interface SAuditLogsPermissions {
  view: boolean;
}

export interface TeamMgmtPermissions {
  view: boolean;
  manage: boolean;
}

export interface BackendLogsPermissions {
  view: boolean;
}

export interface SuperAdminPermissions {
  organizations: OrganizationsPermissions;
  support: SupportMgmtPermissions;
  configuration: ConfigurationPermissions;
  auditLogs: SAuditLogsPermissions;
  team: TeamMgmtPermissions;
  backendLogs: BackendLogsPermissions;
}

export const DEFAULT_SUPER_ADMIN_PERMISSIONS: SuperAdminPermissions = {
  organizations: { view: true,  create: true,  update: true,  delete: true  },
  support:       { view: true,  respond: true,  close: true  },
  configuration: { view: true,  edit: true  },
  auditLogs:     { view: true  },
  team:          { view: true,  manage: true  },
  backendLogs:   { view: true  },
};

export const DEFAULT_MAKHZOON_ADMIN_PERMISSIONS: SuperAdminPermissions = {
  organizations: { view: true,  create: true,  update: true,  delete: false },
  support:       { view: true,  respond: true,  close: true  },
  configuration: { view: true,  edit: false },
  auditLogs:     { view: true  },
  team:          { view: true,  manage: false },
  backendLogs:   { view: true  },
};

export const DEFAULT_SUPPORT_PERMISSIONS: SuperAdminPermissions = {
  organizations: { view: true,  create: false, update: false, delete: false },
  support:       { view: true,  respond: true,  close: false },
  configuration: { view: false, edit: false },
  auditLogs:     { view: true },
  team:          { view: false, manage: false },
  backendLogs:   { view: true },
};

export interface SAModuleOperationConfig {
  key: string;
  label: string;
  requiresView?: boolean;
}

export interface SAModuleConfig {
  key: keyof SuperAdminPermissions;
  label: string;
  operations: SAModuleOperationConfig[];
}

export const SUPERADMIN_MODULE_CONFIG: SAModuleConfig[] = [
  {
    key: 'organizations',
    label: 'Organizations',
    operations: [
      { key: 'view',   label: 'View Organizations' },
      { key: 'create', label: 'Create Organizations', requiresView: true },
      { key: 'update', label: 'Edit Organizations',   requiresView: true },
      { key: 'delete', label: 'Delete Organizations', requiresView: true },
    ],
  },
  {
    key: 'support',
    label: 'Support Tickets',
    operations: [
      { key: 'view',    label: 'View Tickets' },
      { key: 'respond', label: 'Respond to Tickets', requiresView: true },
      { key: 'close',   label: 'Close Tickets',      requiresView: true },
    ],
  },
  {
    key: 'configuration',
    label: 'Configuration',
    operations: [
      { key: 'view', label: 'View Configuration' },
      { key: 'edit', label: 'Edit Configuration', requiresView: true },
    ],
  },
  {
    key: 'auditLogs',
    label: 'Audit Logs',
    operations: [
      { key: 'view', label: 'View Audit Logs' },
    ],
  },
  {
    key: 'team',
    label: 'Team Management',
    operations: [
      { key: 'view',   label: 'View Team Members' },
      { key: 'manage', label: 'Manage Team Members', requiresView: true },
    ],
  },
  {
    key: 'backendLogs',
    label: 'Backend Logs',
    operations: [
      { key: 'view', label: 'View Backend Logs' },
    ],
  },
];
