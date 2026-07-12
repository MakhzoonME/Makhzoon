import { NextResponse } from 'next/server';
import type { TenantContext } from '@/lib/platform/tenancy/types';
import type { CustomField, CreateCustomFieldInput, UpdateCustomFieldInput } from '@/types/banna.types';
import { BannaRepository } from '@/lib/modules/banna/repositories/banna.repository';
import { hasPermission } from '@/lib/platform/permissions';
import { auditLog } from '@/lib/platform/audit';

export class BannaService {
  private repo = new BannaRepository();

  async getCustomFields(tenant: TenantContext, opts?: { module?: 'assets' | 'inventory' | 'requests' | 'customers' }) {
    if (!hasPermission(tenant, 'banna', 'view'))
      throw NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return this.repo.getAll(tenant, opts);
  }

  async getCustomField(tenant: TenantContext, id: string) {
    if (!hasPermission(tenant, 'banna', 'view'))
      throw NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return this.repo.getById(tenant, id);
  }

  async createCustomField(tenant: TenantContext, input: CreateCustomFieldInput): Promise<CustomField> {
    if (!hasPermission(tenant, 'banna', 'create'))
      throw NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const field = await this.repo.create(tenant, input);
    await auditLog.create({ tenant, module: 'banna', action: 'CUSTOM_FIELD_CREATED', recordId: field.id, newValue: field as unknown as Record<string, unknown> });
    return field;
  }

  async updateCustomField(tenant: TenantContext, id: string, input: UpdateCustomFieldInput): Promise<CustomField> {
    if (!hasPermission(tenant, 'banna', 'update'))
      throw NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const old = await this.repo.getById(tenant, id);
    const updated = await this.repo.update(tenant, id, input);
    await auditLog.create({ tenant, module: 'banna', action: 'CUSTOM_FIELD_UPDATED', recordId: id, oldValue: old as unknown as Record<string, unknown>, newValue: updated as unknown as Record<string, unknown> });
    return updated;
  }

  async deleteCustomField(tenant: TenantContext, id: string) {
    if (!hasPermission(tenant, 'banna', 'delete'))
      throw NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const old = await this.repo.getById(tenant, id);
    await this.repo.delete(tenant, id);
    await auditLog.create({ tenant, module: 'banna', action: 'CUSTOM_FIELD_DELETED', recordId: id, oldValue: old as unknown as Record<string, unknown> });
  }
}
