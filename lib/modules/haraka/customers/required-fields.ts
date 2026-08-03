import type { CustomerFormData } from './schemas';

export interface DefaultFieldConfig {
  fieldKey: string;
  required: boolean;
  /** false = hidden. Hidden always wins over required. */
  active: boolean;
}

const FIELD_KEY_TO_FORM_KEY: Record<string, keyof CustomerFormData> = {
  name: 'name',
  phone: 'phone',
  email: 'email',
  tax_number: 'taxNumber',
  notes: 'notes',
};

function isEmpty(value: unknown): boolean {
  return value == null || (typeof value === 'string' && value.trim().length === 0);
}

/**
 * Returns the default-field keys (e.g. 'name', 'tax_number') that are
 * required, visible, present in `data`, and currently empty. Hidden fields
 * are never returned, even when marked required — hidden overrides required.
 * Only checks keys present in `data` so partial updates aren't penalized for
 * fields the caller didn't touch.
 */
export function findMissingRequiredFields(
  defaults: DefaultFieldConfig[],
  data: Partial<CustomerFormData>,
): string[] {
  const missing: string[] = [];
  for (const field of defaults) {
    if (!field.active || !field.required) continue;
    const formKey = FIELD_KEY_TO_FORM_KEY[field.fieldKey];
    if (!formKey || !(formKey in data)) continue;
    if (isEmpty(data[formKey])) missing.push(field.fieldKey);
  }
  return missing;
}
