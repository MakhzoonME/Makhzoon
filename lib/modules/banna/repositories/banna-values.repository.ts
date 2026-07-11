import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { TenantContext } from '@/lib/platform/tenancy/types';
import type { CustomFieldValue, CustomFieldWithValue, CustomFieldRecordType, UpsertCustomFieldValueInput } from '@/types/banna.types';

function toValue(r: Record<string, unknown>): CustomFieldValue {
  return {
    id:             r.id as string,
    organizationId: r.organization_id as string,
    spaceId:        (r.space_id as string) ?? null,
    recordType:     r.record_type as CustomFieldRecordType,
    recordId:       r.record_id as string,
    fieldId:        r.field_id as string,
    value:          r.value,
    createdAt:      r.created_at as string,
    updatedAt:      r.updated_at as string,
  };
}

export class BannaValuesRepository {
  async getByRecord(
    tenant: TenantContext,
    recordType: CustomFieldRecordType,
    recordId: string,
  ): Promise<CustomFieldWithValue[]> {
    // Fetch field definitions for this module
    const { data: fields, error: fieldsErr } = await supabaseAdmin
      .from('custom_fields')
      .select('*')
      .eq('organization_id', tenant.organizationId)
      .eq('module', recordType)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (fieldsErr) throw fieldsErr;
    if (!fields || fields.length === 0) return [];

    // Fetch existing values for this record
    const { data: vals, error: valsErr } = await supabaseAdmin
      .from('custom_field_values')
      .select('*')
      .eq('organization_id', tenant.organizationId)
      .eq('record_type', recordType)
      .eq('record_id', recordId);

    if (valsErr) throw valsErr;

    const valMap = new Map<string, CustomFieldValue>();
    for (const v of (vals ?? [])) {
      const val = toValue(v as Record<string, unknown>);
      valMap.set(val.fieldId, val);
    }

    return (fields as unknown as Record<string, unknown>[]).map((f) => {
      const existing = valMap.get(f.id as string);
      return {
        id:             f.id as string,
        organizationId: f.organization_id as string,
        spaceId:        (f.space_id as string) ?? undefined,
        module:         f.module as string,
        fieldKey:       f.field_key as string,
        type:           f.type as string,
        label:          f.label as string,
        labelAr:        (f.label_ar as string) ?? undefined,
        required:       f.required as boolean,
        options:        (f.options as unknown[]) ?? [],
        placeholder:    (f.placeholder as string) ?? undefined,
        placeholderAr:  (f.placeholder_ar as string) ?? undefined,
        sortOrder:      f.sort_order as number,
        active:         f.is_active as boolean,
        createdAt:      f.created_at as string,
        updatedAt:      f.updated_at as string,
        value:          existing?.value,
        valueId:        existing?.id,
      } as CustomFieldWithValue;
    });
  }

  async upsert(
    tenant: TenantContext,
    recordType: CustomFieldRecordType,
    recordId: string,
    inputs: UpsertCustomFieldValueInput[],
  ): Promise<void> {
    if (inputs.length === 0) return;

    const rows = inputs.map((i) => ({
      organization_id: tenant.organizationId,
      space_id:        tenant.spaceId ?? null,
      record_type:     recordType,
      record_id:       recordId,
      field_id:        i.fieldId,
      value:           i.value ?? null,
      updated_at:      new Date().toISOString(),
    }));

    const { error } = await supabaseAdmin
      .from('custom_field_values')
      .upsert(rows, { onConflict: 'organization_id,record_type,record_id,field_id' });

    if (error) throw error;
  }
}
