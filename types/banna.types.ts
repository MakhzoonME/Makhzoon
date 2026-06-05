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
