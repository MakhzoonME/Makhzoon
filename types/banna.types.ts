export type CustomFieldType =
  | 'text'
  | 'number'
  | 'select'
  | 'multi_select'
  | 'date'
  | 'boolean'
  | 'user';

export interface CustomFieldOption {
  value: string;
  label: string;
  labelAr?: string;
}

export interface CustomField {
  id: string;
  organizationId: string;
  spaceId?: string;
  module: string;
  fieldKey: string;
  type: CustomFieldType;
  label: string;
  labelAr?: string;
  required: boolean;
  options?: CustomFieldOption[];
  placeholder?: string;
  placeholderAr?: string;
  sortOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomFieldPayload {
  module: string;
  fieldKey: string;
  type: CustomFieldType;
  label: string;
  labelAr?: string;
  required: boolean;
  options?: CustomFieldOption[];
  placeholder?: string;
  placeholderAr?: string;
  sortOrder: number;
}

export interface UpdateCustomFieldPayload {
  label?: string;
  labelAr?: string;
  required?: boolean;
  options?: CustomFieldOption[];
  placeholder?: string;
  placeholderAr?: string;
  sortOrder?: number;
  active?: boolean;
}

export type CreateCustomFieldInput = CreateCustomFieldPayload;

export interface UpdateCustomFieldInput {
  label?: string;
  labelAr?: string;
  required?: boolean;
  options?: CustomFieldOption[];
  placeholder?: string;
  placeholderAr?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface WorkspaceProfile {
  id: string;
  organizationId: string;
  spaceId: string;
}

export type CustomFieldRecordType = 'assets' | 'inventory' | 'requests';

export interface CustomFieldValue {
  id: string;
  organizationId: string;
  spaceId?: string | null;
  recordType: CustomFieldRecordType;
  recordId: string;
  fieldId: string;
  value: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface CustomFieldWithValue extends CustomField {
  value?: unknown;
  valueId?: string;
}

export interface UpsertCustomFieldValueInput {
  fieldId: string;
  value: unknown;
}

export interface SaveCustomFieldValuesInput {
  recordType: CustomFieldRecordType;
  recordId: string;
  values: UpsertCustomFieldValueInput[];
}
