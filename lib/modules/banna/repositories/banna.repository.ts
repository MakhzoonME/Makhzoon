import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { TenantContext } from '@/lib/platform/tenancy/types';
import type { CustomField, CreateCustomFieldInput, UpdateCustomFieldInput } from '@/types/banna.types';

export interface GetAllCustomFieldsOpts {
  module?: 'assets' | 'inventory' | 'requests' | 'customers';
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
