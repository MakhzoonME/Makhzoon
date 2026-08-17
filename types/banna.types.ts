export type CustomFieldType =
  | 'text'
  | 'number'
  | 'select'
  | 'multi_select'
  | 'date'
  | 'boolean'
  | 'user'
  | 'plate_reader';

/** One entry in a `plate_reader` field's value array — always a list, one
 *  customer can have multiple vehicles. `vehicleId` links to the underlying
 *  haraka_service_vehicles row (populated server-side on save); absent on a
 *  freshly-added row that hasn't been saved yet. */
export interface PlateReaderEntry {
  vehicleId?: string | null;
  plateNumber: string;
  make?: string | null;
  model?: string | null;
  color?: string | null;
  notes?: string | null;
}

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
  /** True for the built-in Name/Phone/Email/Tax number/Notes rows — real
   *  pos_customers columns, not user-created fields. Not deletable; only
   *  required/active/sortOrder can be changed. */
  isDefault: boolean;
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

export type CustomFieldRecordType = 'assets' | 'inventory' | 'customers';

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
