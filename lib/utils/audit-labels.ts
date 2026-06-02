import { formatDateTime } from '@/lib/utils/date';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

/**
 * Renders an audit log value as a human string. Handles Firestore Timestamps,
 * Date objects, ISO date strings, primitives, and falls back to JSON.stringify
 * for plain objects (avoids "[object Object]").
 */
export function formatAuditValue(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (v instanceof Date) return formatDateTime(v);
  if (typeof v === 'string') return ISO_DATE_RE.test(v) ? formatDateTime(new Date(v)) : v;
  if (typeof v === 'number' || typeof v === 'bigint') return String(v);
  if (typeof v === 'object') {
    const obj = v as Record<string, unknown>;
    if (typeof obj._seconds === 'number') {
      return formatDateTime(new Date(obj._seconds * 1000 + (Number(obj._nanoseconds ?? 0) / 1e6)));
    }
    if (typeof obj.seconds === 'number') {
      return formatDateTime(new Date(obj.seconds * 1000 + (Number(obj.nanoseconds ?? 0) / 1e6)));
    }
    if (typeof (obj as { toDate?: () => Date }).toDate === 'function') {
      try { return formatDateTime((obj as { toDate: () => Date }).toDate()); } catch { /* fall through */ }
    }
    try { return JSON.stringify(v); } catch { return '[unserializable]'; }
  }
  return String(v);
}

const ACTION_LABELS: Record<string, string> = {
  ASSET_CREATED: 'Asset Created',
  ASSET_UPDATED: 'Asset Updated',
  ASSET_RETIRED: 'Asset Retired',
  ASSET_DELETED: 'Asset Deleted',
  ASSETS_IMPORTED: 'Assets Imported',
  ASSET_NOTE_ADDED: 'Note Added',
  ASSET_NOTE_DELETED: 'Note Deleted',
  MAINTENANCE_ADDED: 'Maintenance Added',
  MAINTENANCE_UPDATED: 'Maintenance Updated',
  MAINTENANCE_DELETED: 'Maintenance Deleted',
  ASSET_CHECKED_OUT: 'Asset Checked Out',
  ASSET_CHECKED_IN: 'Asset Checked In',
  WARRANTY_CREATED: 'Warranty Created',
  WARRANTY_UPDATED: 'Warranty Updated',
  WARRANTY_DELETED: 'Warranty Deleted',
  WARRANTY_ALERT_SENT: 'Warranty Alert Sent',
  REQUEST_SUBMITTED: 'Request Submitted',
  REQUEST_APPROVED: 'Request Approved',
  REQUEST_REJECTED: 'Request Rejected',
  USER_INVITED: 'User Invited',
  USER_UPDATED: 'User Updated',
  USER_DEACTIVATED: 'User Deactivated',
  USER_DELETED: 'User Deleted',
  INVITE_SENT: 'Invite Sent',
  INVITE_ACCEPTED: 'Invite Accepted',
  INVITE_REVOKED: 'Invite Revoked',
  ORGANIZATION_CREATED: 'Organization Created',
  ORGANIZATION_UPDATED: 'Organization Updated',
  ORGANIZATION_SELF_SERVE_CREATED: 'Organization Self-Serve Created',
  SUBSCRIPTION_UPDATED: 'Subscription Updated',
  SUBSCRIPTION_PACKAGE_ASSIGNED: 'Package Assigned',
  SUBSCRIPTION_FEATURE_UPDATED: 'Feature Updated',
  PACKAGE_CREATED: 'Package Created',
  PACKAGE_UPDATED: 'Package Updated',
  PACKAGE_DELETED: 'Package Deleted',
  LIST_ITEM_CREATED: 'List Item Created',
  LIST_ITEM_UPDATED: 'List Item Updated',
  LIST_ITEM_DELETED: 'List Item Deleted',
  PAYMENT_RECORDED: 'Payment Recorded',
  PAYMENT_DELETED: 'Payment Deleted',
  TRANSFER_MODE_ENTERED: 'Transfer Mode Entered',
  TRANSFER_MODE_EXITED: 'Transfer Mode Exited',
  TICKET_CREATED: 'Ticket Created',
  TICKET_UPDATED: 'Ticket Updated',
  TICKET_REPLIED: 'Ticket Replied',
  TICKET_CLOSED: 'Ticket Closed',
  TICKET_RESOLVED: 'Ticket Resolved',
  INVENTORY_ITEM_CREATED: 'Inventory Item Created',
  INVENTORY_ITEM_UPDATED: 'Inventory Item Updated',
  INVENTORY_ITEM_DELETED: 'Inventory Item Deleted',
  INVENTORY_TRANSACTION_CREATED: 'Inventory Transaction',
  INVENTORY_AUDIT_STARTED: 'Inventory Audit Started',
  INVENTORY_AUDIT_COMPLETED: 'Inventory Audit Completed',
  CONFIG_STATUS_CREATED: 'Status Created',
  CONFIG_STATUS_UPDATED: 'Status Updated',
  CONFIG_STATUS_DELETED: 'Status Deleted',
  CONFIG_LOCATION_CREATED: 'Location Created',
  CONFIG_LOCATION_UPDATED: 'Location Updated',
  CONFIG_LOCATION_DELETED: 'Location Deleted',
  CONFIG_CATEGORY_CREATED: 'Category Created',
  CONFIG_CATEGORY_UPDATED: 'Category Updated',
  CONFIG_CATEGORY_DELETED: 'Category Deleted',
  TAX_RATE_CREATED: 'Tax Rate Created',
  TAX_RATE_UPDATED: 'Tax Rate Updated',
  TAX_RATE_DELETED: 'Tax Rate Deleted',
  PURCHASE_CREATED: 'Purchase Created',
  PURCHASE_UPDATED: 'Purchase Updated',
  PURCHASE_DELETED: 'Purchase Deleted',
  PURCHASE_RECEIVED: 'Purchase Received',
  PURCHASE_CANCELLED: 'Purchase Cancelled',
  POS_SESSION_OPENED: 'POS Session Opened',
  POS_SESSION_CLOSED: 'POS Session Closed',
  POS_SALE_COMPLETED: 'Sale Completed',
  POS_SALE_VOIDED: 'Sale Voided',
  POS_SALE_REFUNDED: 'Sale Refunded',
  POS_CUSTOMER_CREATED: 'Customer Created',
  POS_CUSTOMER_UPDATED: 'Customer Updated',
  POS_CUSTOMER_DELETED: 'Customer Deleted',
  FAWTARA_CONFIG_UPDATED: 'Jo-Fotara Config Updated',
  FAWTARA_SUBMISSION_SENT: 'Jo-Fotara Submission Sent',
  FAWTARA_SUBMISSION_FAILED: 'Jo-Fotara Submission Failed',
  SPACE_CREATED: 'Space Created',
  SPACE_UPDATED: 'Space Updated',
  SPACE_ARCHIVED: 'Space Archived',
  RECEIPT_CONFIG_UPDATED: 'Receipt Config Updated',
  ORG_LIST_ITEM_CREATED: 'List Item Added',
  ORG_LIST_ITEM_UPDATED: 'List Item Updated',
  ORG_LIST_ITEM_DELETED: 'List Item Removed',
  PROFILE_UPDATED: 'Profile Updated',
  ORG_CONFIG_UPDATED: 'Org Config Updated',
  PAYMENT_LOG_CREATED: 'Payment Log Created',
  PAYMENT_LOG_DELETED: 'Payment Log Deleted',
  SUBSCRIPTION_AUTO_EXPIRED: 'Subscription Auto Expired',
  STOCK_AUDIT_STARTED: 'Stock Audit Started',
  STOCK_AUDIT_COMPLETED: 'Stock Audit Completed',
};

export function formatActionLabel(action: string): string {
  return (
    ACTION_LABELS[action] ??
    action
      .split('_')
      .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
      .join(' ')
  );
}

export function formatKeyLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^\s/, '')
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}
