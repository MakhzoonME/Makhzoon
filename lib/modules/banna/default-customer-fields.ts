/**
 * The five built-in customer properties (real columns on pos_customers, not
 * custom_fields rows created by users). Seeded as is_default=true rows in
 * custom_fields so they can be listed/reordered/toggled alongside real
 * custom fields, without exposing rename/delete/type-change.
 */
export const DEFAULT_CUSTOMER_FIELDS = [
  { fieldKey: 'name', label: 'Name', required: true, sortOrder: 0 },
  { fieldKey: 'phone', label: 'Phone', required: true, sortOrder: 1 },
  { fieldKey: 'email', label: 'Email', required: false, sortOrder: 2 },
  { fieldKey: 'notes', label: 'Notes', required: false, sortOrder: 3 },
] as const;

export type DefaultCustomerFieldKey = (typeof DEFAULT_CUSTOMER_FIELDS)[number]['fieldKey'];

/** Name/phone are always shown, required, and can't be hidden — Email,
 *  Notes, and genuine org-added custom fields can all be toggled off. */
export const ALWAYS_VISIBLE_CUSTOMER_FIELDS: readonly DefaultCustomerFieldKey[] = ['name', 'phone'];
