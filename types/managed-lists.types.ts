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
  // Haraka Service Jobs & Retainers
  | 'service_job_status'
  | 'service_job_type'
  | 'retainer_status'
  | 'service_category'
  // Haraka Appointments
  | 'appointment_status'
  // Shared across Orders, Service Jobs, Appointments, Retainers, and the POS
  // register — one org-configurable list so a method (e.g. an insurance
  // company) added once shows up everywhere payments are recorded.
  | 'payment_method';

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
  /** true → items carry behavior flags (isInvoicingTrigger/isBlocking/isTerminal)
   *  that the portal should expose as toggles, not just label/color. */
  supportsBehaviorFlags?: boolean;
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

  service_job_status:         { key: 'service_job_status',         label: 'Service Job Statuses',        labelKey: 'managedList.service_job_status',         scope: 'org', isSystem: true,  description: 'Service job lifecycle — values locked.' },
  service_job_type:           { key: 'service_job_type',           label: 'Service Job Types',           labelKey: 'managedList.service_job_type',           scope: 'org', isSystem: false, description: 'Categories of service work (repair, consultation, etc.).' },
  retainer_status:            { key: 'retainer_status',            label: 'Retainer Statuses',           labelKey: 'managedList.retainer_status',            scope: 'org', isSystem: true,  description: 'Retainer lifecycle — values locked.' },
  service_category:           { key: 'service_category',           label: 'Service Categories',          labelKey: 'managedList.service_category',           scope: 'org', isSystem: false, description: 'Categories for the Services catalog. Orgs can add custom categories.' },

  appointment_status:         { key: 'appointment_status',         label: 'Appointment Statuses',        labelKey: 'managedList.appointment_status',         scope: 'org', isSystem: false, supportsBehaviorFlags: true, description: 'Appointment lifecycle. Add, rename, reorder, or hide statuses; flag which ones trigger invoicing or hold the calendar slot.' },

  payment_method:              { key: 'payment_method',              label: 'Payment Methods',              labelKey: 'managedList.payment_method',              scope: 'org', isSystem: false, description: 'Shared across Orders, Service Jobs, Appointments, Retainers, and the POS register. Orgs can add custom methods (e.g. insurance company names). "Cash" and "Card" stay locked — POS reconciliation and e-invoicing key off them.' },
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
  /** Behavior flags, meaningful only for lists with supportsBehaviorFlags. */
  isInvoicingTrigger: boolean;
  isBlocking: boolean;
  isTerminal: boolean;
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
  isInvoicingTrigger: boolean | null;
  isBlocking: boolean | null;
  isTerminal: boolean | null;
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
  /** Behavior flags, meaningful only for lists with supportsBehaviorFlags. */
  isInvoicingTrigger: boolean;
  isBlocking: boolean;
  isTerminal: boolean;
}
