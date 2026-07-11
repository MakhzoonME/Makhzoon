// Config-driven dropdown lists (see migration 0008_managed_lists.sql).
// Two tiers: platform defaults (superadmin) + per-org overrides/additions.
import type { MessageKey } from '@/locales/messages';

/** Every managed list. FREE lists are fully editable; SYSTEM lists are
 *  code-owned values with editable label/color/order/visibility only. */
export type ListKey =
  // Bucket A — free lists
  | 'asset_status'
  | 'asset_category'
  | 'location'
  | 'inventory_unit'
  | 'inventory_category'
  | 'inventory_storage_location'
  | 'vendor'
  | 'org_industry'
  // Bucket B — system lists (value locked)
  | 'request_status'
  | 'request_type'
  | 'purchase_status'
  | 'inventory_movement'
  | 'pos_txn_status'
  | 'pos_session_status'
  | 'warranty_status'
  | 'warranty_target'
  | 'maintenance_type'
  // Haraka Orders
  | 'order_status'
  | 'order_channel'
  | 'order_payment_method'
  // Haraka Service Jobs & Retainers
  | 'service_job_status'
  | 'service_job_type'
  | 'service_job_payment_method'
  | 'retainer_status';

/** Where a list is administered. 'org' lists support per-org overrides;
 *  'platform' lists are global (e.g. org_industry, system enums). */
export type ListScope = 'org' | 'platform';

export interface ListMeta {
  key: ListKey;
  /** Human label for the superadmin Lists portal (English fallback). */
  label: string;
  /** Translation key used by org-facing pages. */
  labelKey: MessageKey;
  scope: ListScope;
  /** true → SYSTEM list: value locked, no add/remove (label/color/order only). */
  isSystem: boolean;
  /** Optional note shown in the portal. */
  description?: string;
}

/** Single source of truth for the portal: which lists exist and how they behave. */
export const LIST_REGISTRY: Record<ListKey, ListMeta> = {
  asset_status:       { key: 'asset_status',       label: 'Asset Statuses',      labelKey: 'managedList.asset_status',       scope: 'org',      isSystem: false },
  asset_category:     { key: 'asset_category',     label: 'Asset Categories',    labelKey: 'managedList.asset_category',     scope: 'org',      isSystem: false },
  location:           { key: 'location',           label: 'Locations',           labelKey: 'managedList.location',           scope: 'org',      isSystem: false },
  inventory_unit:     { key: 'inventory_unit',     label: 'Inventory Units',     labelKey: 'managedList.inventory_unit',     scope: 'org',      isSystem: false },
  inventory_category: { key: 'inventory_category', label: 'Inventory Categories', labelKey: 'managedList.inventory_category', scope: 'org',     isSystem: false },
  inventory_storage_location: { key: 'inventory_storage_location', label: 'Inventory Storage Locations', labelKey: 'managedList.inventory_storage_location', scope: 'org', isSystem: false },
  vendor:             { key: 'vendor',             label: 'Vendors / Suppliers', labelKey: 'managedList.vendor',             scope: 'org',      isSystem: false },
  org_industry:       { key: 'org_industry',       label: 'Organization Industries', labelKey: 'managedList.org_industry',   scope: 'platform', isSystem: false },

  request_status:     { key: 'request_status',     label: 'Request Statuses',    labelKey: 'managedList.request_status',     scope: 'platform', isSystem: true,  description: 'Drives the approval flow — values locked.' },
  request_type:       { key: 'request_type',       label: 'Request Types',       labelKey: 'managedList.request_type',       scope: 'platform', isSystem: true,  description: 'Branches request handling — values locked.' },
  purchase_status:    { key: 'purchase_status',    label: 'Purchase Statuses',   labelKey: 'managedList.purchase_status',    scope: 'platform', isSystem: true,  description: 'Purchase-order lifecycle — values locked.' },
  inventory_movement: { key: 'inventory_movement', label: 'Inventory Movements', labelKey: 'managedList.inventory_movement', scope: 'platform', isSystem: true,  description: 'Stock math — values locked.' },
  pos_txn_status:     { key: 'pos_txn_status',     label: 'POS Transaction Statuses', labelKey: 'managedList.pos_txn_status', scope: 'platform', isSystem: true, description: 'POS lifecycle — values locked.' },
  pos_session_status: { key: 'pos_session_status', label: 'POS Session Statuses', labelKey: 'managedList.pos_session_status', scope: 'platform', isSystem: true, description: 'POS lifecycle — values locked.' },
  warranty_status:    { key: 'warranty_status',    label: 'Warranty Statuses',   labelKey: 'managedList.warranty_status',    scope: 'platform', isSystem: true,  description: 'Computed from dates — values locked.' },
  warranty_target:    { key: 'warranty_target',    label: 'Warranty Coverage',   labelKey: 'managedList.warranty_target',    scope: 'platform', isSystem: true,  description: 'Asset vs inventory — values locked.' },
  maintenance_type:   { key: 'maintenance_type',   label: 'Maintenance Types',   labelKey: 'managedList.maintenance_type',   scope: 'platform', isSystem: true,  description: 'Has color logic — values locked.' },

  order_status:         { key: 'order_status',         label: 'Order Statuses',        labelKey: 'managedList.order_status',         scope: 'org', isSystem: true,  description: 'Order lifecycle — values locked, labels/colors customizable.' },
  order_channel:        { key: 'order_channel',        label: 'Order Channels',        labelKey: 'managedList.order_channel',        scope: 'org', isSystem: false, description: 'Source channels for orders (phone, WhatsApp, etc.). Orgs can add custom channels.' },
  order_payment_method: { key: 'order_payment_method', label: 'Order Payment Methods', labelKey: 'managedList.order_payment_method', scope: 'org', isSystem: true,  description: 'Payment method types for orders — values locked.' },

  service_job_status:         { key: 'service_job_status',         label: 'Service Job Statuses',        labelKey: 'managedList.service_job_status',         scope: 'org', isSystem: true,  description: 'Service job lifecycle — values locked.' },
  service_job_type:           { key: 'service_job_type',           label: 'Service Job Types',           labelKey: 'managedList.service_job_type',           scope: 'org', isSystem: false, description: 'Categories of service work (repair, consultation, etc.).' },
  service_job_payment_method: { key: 'service_job_payment_method', label: 'Service Job Payment Methods', labelKey: 'managedList.service_job_payment_method', scope: 'org', isSystem: true,  description: 'Payment method types for service jobs — values locked.' },
  retainer_status:            { key: 'retainer_status',            label: 'Retainer Statuses',           labelKey: 'managedList.retainer_status',            scope: 'org', isSystem: true,  description: 'Retainer lifecycle — values locked.' },
};

export const LIST_KEYS = Object.keys(LIST_REGISTRY) as ListKey[];

/** Row in platform_list_items (superadmin catalog + defaults). */
export interface PlatformListItem {
  id: string;
  listKey: ListKey;
  value: string;
  label: string;
  labelAr: string | null;
  color: string | null;
  sortOrder: number;
  enabled: boolean;
  isSystem: boolean;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date;
  updatedBy: string | null;
}

/** Row in org_list_items (per-org addition or override). */
export interface OrgListItem {
  id: string;
  organizationId: string;
  listKey: ListKey;
  value: string;
  label: string | null;
  labelAr: string | null;
  color: string | null;
  sortOrder: number | null;
  enabled: boolean;
  isCustom: boolean;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date;
  updatedBy: string | null;
}

/** The effective item an org sees after platform defaults + org overrides. */
export interface ResolvedListItem {
  value: string;
  label: string;
  labelAr: string | null;
  color: string | null;
  /** true when the value originates from a SYSTEM (code-owned) list. */
  isSystem: boolean;
  /** true when contributed/overridden by the org (vs a pure platform default). */
  isCustom: boolean;
}
