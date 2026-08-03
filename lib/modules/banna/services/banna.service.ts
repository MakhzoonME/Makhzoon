import { NextResponse } from 'next/server';
import type { TenantContext } from '@/lib/platform/tenancy/types';
import type { CustomField, CreateCustomFieldInput, UpdateCustomFieldInput } from '@/types/banna.types';
import { BannaRepository } from '@/lib/modules/banna/repositories/banna.repository';
import { hasPermission, hasModuleAccess } from '@/lib/platform/permissions';
import { auditLog } from '@/lib/platform/audit';

export class BannaService {
  private repo = new BannaRepository();

  /**
   * Customer custom fields ship ahead of the rest of Banna, which isn't
   * released — no org has the 'banna' feature flag or 'banna' permission
   * block. They ride entirely on the 'pos' module instead (matching the UI
   * gate `useModuleGuard({ featureKey: 'pos', moduleKey: 'pos' })`): any user
   * with POS module access manages them, with no per-operation split. Every
   * other module stays on the 'banna' permission grid.
   */
  private assertCanManage(tenant: TenantContext, module: string, op: 'view' | 'create' | 'update' | 'delete') {
    const allowed = module === 'customers'
      ? hasModuleAccess(tenant.user, 'haraka')
      : hasPermission(tenant, 'banna', op);
    if (!allowed) throw NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  async getCustomFields(tenant: TenantContext, opts?: { module?: 'assets' | 'inventory' | 'customers' }) {
    // No module filter → the general Banna settings list, still banna-gated.
    this.assertCanManage(tenant, opts?.module ?? 'banna', 'view');
    return this.repo.getAll(tenant, opts);
  }

  async getCustomField(tenant: TenantContext, id: string) {
    const field = await this.repo.getById(tenant, id);
    this.assertCanManage(tenant, field.module, 'view');
    return field;
  }

  async createCustomField(tenant: TenantContext, input: CreateCustomFieldInput): Promise<CustomField> {
    this.assertCanManage(tenant, input.module, 'create');

    const field = await this.repo.create(tenant, input);
    await auditLog.create({ tenant, module: 'banna', action: 'CUSTOM_FIELD_CREATED', recordId: field.id, newValue: field as unknown as Record<string, unknown> });
    return field;
  }

  async updateCustomField(tenant: TenantContext, id: string, input: UpdateCustomFieldInput): Promise<CustomField> {
    const old = await this.repo.getById(tenant, id);
    this.assertCanManage(tenant, old.module, 'update');

    const updated = await this.repo.update(tenant, id, input);
    await auditLog.create({ tenant, module: 'banna', action: 'CUSTOM_FIELD_UPDATED', recordId: id, oldValue: old as unknown as Record<string, unknown>, newValue: updated as unknown as Record<string, unknown> });
    return updated;
  }

  async deleteCustomField(tenant: TenantContext, id: string) {
    const old = await this.repo.getById(tenant, id);
    this.assertCanManage(tenant, old.module, 'delete');

    await this.repo.delete(tenant, id);
    await auditLog.create({ tenant, module: 'banna', action: 'CUSTOM_FIELD_DELETED', recordId: id, oldValue: old as unknown as Record<string, unknown> });
  }
}
