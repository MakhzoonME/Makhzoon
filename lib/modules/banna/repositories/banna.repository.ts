import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { TenantContext } from '@/lib/platform/tenancy/types';
import type { CustomField, CreateCustomFieldInput, UpdateCustomFieldInput } from '@/types/banna.types';
import { DEFAULT_CUSTOMER_FIELDS } from '@/lib/modules/banna/default-customer-fields';

export interface GetAllCustomFieldsOpts {
  module?: 'assets' | 'inventory' | 'customers';
  isActive?: boolean;
}

export class BannaRepository {
  private db() {
    return supabaseAdmin.from('custom_fields');
  }

  async getAll(tenant: TenantContext, opts?: GetAllCustomFieldsOpts) {
    let query = this.db()
      .select('*')
      .eq('organization_id', tenant.organizationId)
      .order('sort_order', { ascending: true });

    if (opts?.module) query = query.eq('module', opts.module);
    if (opts?.isActive !== undefined) query = query.eq('is_active', opts.isActive);

    const { data, error } = await query;
    if (error) throw error;
    return data as unknown as CustomField[];
  }

  /** Idempotently inserts any missing default-field rows for this org's
   *  customers module (Name/Phone/Email/Notes). Safe to call on every fetch.
   *
   *  Matches by field_key alone (not `is_default`) — orgs whose rows predate
   *  migration 0057 have `is_default=false` from that column's backfill-free
   *  default, and re-inserting for those would collide with the existing row
   *  on the (organization_id, module, field_key) unique index. Existing rows
   *  are flagged is_default=true instead of duplicated; only truly missing
   *  keys are inserted. */
  async ensureDefaultCustomerFields(tenant: TenantContext) {
    const { data: existing, error: fetchError } = await this.db()
      .select('id, field_key, is_default')
      .eq('organization_id', tenant.organizationId)
      .eq('module', 'customers');
    if (fetchError) throw fetchError;

    const existingByKey = new Map((existing ?? []).map((r) => [r.field_key as string, r]));
    const missing = DEFAULT_CUSTOMER_FIELDS.filter((f) => !existingByKey.has(f.fieldKey));
    const needsFlag = DEFAULT_CUSTOMER_FIELDS.filter((f) => {
      const row = existingByKey.get(f.fieldKey);
      return row && !row.is_default;
    });

    if (needsFlag.length > 0) {
      const { error } = await this.db()
        .update({ is_default: true })
        .in('id', needsFlag.map((f) => existingByKey.get(f.fieldKey)!.id as string));
      if (error) throw error;
    }

    if (missing.length > 0) {
      const { error } = await this.db().insert(
        missing.map((f) => ({
          organization_id: tenant.organizationId,
          module: 'customers',
          field_key: f.fieldKey,
          type: 'text',
          label: f.label,
          required: f.required,
          sort_order: f.sortOrder,
          is_default: true,
        })),
      );
      if (error) throw error;
    }
  }

  async getById(tenant: TenantContext, id: string) {
    const { data, error } = await this.db()
      .select('*')
      .eq('organization_id', tenant.organizationId)
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as unknown as CustomField;
  }

  async create(tenant: TenantContext, input: CreateCustomFieldInput) {
    const { data, error } = await this.db()
      .insert({
        organization_id: tenant.organizationId,
        module: input.module,
        field_key: input.fieldKey,
        type: input.type,
        label: input.label,
        label_ar: input.labelAr ?? null,
        required: input.required ?? false,
        options: input.options ?? null,
        placeholder: input.placeholder ?? null,
        placeholder_ar: input.placeholderAr ?? null,
        sort_order: input.sortOrder ?? 0,
      })
      .select()
      .single();
    if (error) throw error;
    return data as unknown as CustomField;
  }

  async update(tenant: TenantContext, id: string, input: UpdateCustomFieldInput) {
    const patches: Record<string, unknown> = {};
    if (input.label !== undefined) patches.label = input.label;
    if (input.labelAr !== undefined) patches.label_ar = input.labelAr;
    if (input.required !== undefined) patches.required = input.required;
    if (input.options !== undefined) patches.options = input.options;
    if (input.placeholder !== undefined) patches.placeholder = input.placeholder;
    if (input.placeholderAr !== undefined) patches.placeholder_ar = input.placeholderAr;
    if (input.sortOrder !== undefined) patches.sort_order = input.sortOrder;
    if (input.isActive !== undefined) patches.is_active = input.isActive;

    const { data, error } = await this.db()
      .update(patches)
      .eq('organization_id', tenant.organizationId)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as unknown as CustomField;
  }

  async delete(tenant: TenantContext, id: string) {
    const { error } = await this.db()
      .delete()
      .eq('organization_id', tenant.organizationId)
      .eq('id', id);
    if (error) throw error;
  }
}
