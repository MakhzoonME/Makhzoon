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
