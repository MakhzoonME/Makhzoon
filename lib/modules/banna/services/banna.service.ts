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
    if (opts?.module === 'customers') {
      await this.repo.ensureDefaultCustomerFields(tenant);
    }
    return this.repo.getAll(tenant, opts);
  }

  async getCustomField(tenant: TenantContext, id: string) {
    const field = await this.repo.getById(tenant, id);
    this.assertCanManage(tenant, field.module, 'view');
    return field;
  }

  /**
   * Conditions may chain (B depends on A, C depends on B), so a new/updated
   * condition must be checked against the whole existing chain: the parent
   * must exist in the same module, and walking up from it must never lead
   * back to `ownFieldKey` (that would be a cycle).
   */
  private async validateCondition(
    tenant: TenantContext,
    module: string,
    ownFieldKey: string | undefined,
    condition: CreateCustomFieldInput['condition'],
  ) {
    if (!condition) return;
    if (condition.parentFieldKey === ownFieldKey) {
      throw NextResponse.json({ error: 'A field cannot depend on itself' }, { status: 422 });
    }

    // repo.getAll/getById return raw snake_case db rows cast to the camelCase
    // CustomField type (see is_default/sort_order usage elsewhere in this
    // file) — read field_key/condition off the raw record, not f.fieldKey.
    const siblings = (await this.repo.getAll(tenant, { module: module as 'assets' | 'inventory' | 'customers' })) as unknown as Record<string, unknown>[];
    const byKey = new Map(siblings.map((f) => [f.field_key as string, f]));

    let cursorKey: string | undefined = condition.parentFieldKey;
    const visited = new Set<string>();
    while (cursorKey) {
      const parent = byKey.get(cursorKey);
      if (!parent) {
        throw NextResponse.json({ error: `Parent field "${cursorKey}" not found` }, { status: 422 });
      }
      if (cursorKey === ownFieldKey || visited.has(cursorKey)) {
        throw NextResponse.json({ error: 'Circular field condition' }, { status: 422 });
      }
      visited.add(cursorKey);
      cursorKey = (parent.condition as { parentFieldKey?: string } | null)?.parentFieldKey;
    }
  }

  /** Blocks deleting/deactivating a field that other fields' conditions still
   *  point to — those dependents would otherwise reference a parent that no
   *  longer resolves, and go permanently (silently) hidden. */
  private async assertNoDependents(tenant: TenantContext, field: CustomField) {
    const fieldKey = (field as unknown as Record<string, unknown>).field_key as string;
    const siblings = (await this.repo.getAll(tenant, { module: field.module as 'assets' | 'inventory' | 'customers' })) as unknown as Record<string, unknown>[];
    const dependents = siblings.filter((f) => (f.condition as { parentFieldKey?: string } | null)?.parentFieldKey === fieldKey);
    if (dependents.length > 0) {
      throw NextResponse.json(
        { error: `Remove the condition on "${dependents.map((d) => d.label as string).join(', ')}" first` },
        { status: 400 },
      );
    }
  }

  async createCustomField(tenant: TenantContext, input: CreateCustomFieldInput): Promise<CustomField> {
    this.assertCanManage(tenant, input.module, 'create');
    await this.validateCondition(tenant, input.module, input.fieldKey, input.condition);

    // Always append to the bottom of the list — order isn't something the
    // creator picks, it's just "newest last". repo.getAll returns raw
    // snake_case rows cast to CustomField, hence sort_order here.
    const existing = await this.repo.getAll(tenant, { module: input.module as 'assets' | 'inventory' | 'customers' });
    const sortOrder = existing.reduce(
      (max, f) => Math.max(max, ((f as unknown as Record<string, unknown>).sort_order as number) ?? 0),
      -1,
    ) + 1;

    const field = await this.repo.create(tenant, { ...input, sortOrder });
    await auditLog.create({ tenant, module: 'banna', action: 'CUSTOM_FIELD_CREATED', recordId: field.id, newValue: field as unknown as Record<string, unknown> });
    return field;
  }

  async updateCustomField(tenant: TenantContext, id: string, input: UpdateCustomFieldInput): Promise<CustomField> {
    const old = await this.repo.getById(tenant, id);
    this.assertCanManage(tenant, old.module, 'update');

    // Default fields (Name/Phone/Email/Tax number/Notes) are real pos_customers
    // columns, not user-defined fields — only required/visible/order can change.
    // `old` is a raw db row (snake_case) cast to CustomField, hence is_default here.
    const isDefault = (old as unknown as Record<string, unknown>).is_default === true;
    const effectiveInput: UpdateCustomFieldInput = isDefault
      ? { required: input.required, isActive: input.isActive, sortOrder: input.sortOrder }
      : input;

    if (effectiveInput.condition !== undefined) {
      const ownFieldKey = (old as unknown as Record<string, unknown>).field_key as string;
      await this.validateCondition(tenant, old.module, ownFieldKey, effectiveInput.condition);
    }
    if (effectiveInput.isActive === false) {
      await this.assertNoDependents(tenant, old);
    }

    const updated = await this.repo.update(tenant, id, effectiveInput);
    await auditLog.create({ tenant, module: 'banna', action: 'CUSTOM_FIELD_UPDATED', recordId: id, oldValue: old as unknown as Record<string, unknown>, newValue: updated as unknown as Record<string, unknown> });
    return updated;
  }

  async deleteCustomField(tenant: TenantContext, id: string) {
    const old = await this.repo.getById(tenant, id);
    this.assertCanManage(tenant, old.module, 'delete');
    const isDefault = (old as unknown as Record<string, unknown>).is_default === true;
    if (isDefault) {
      throw NextResponse.json({ error: 'Default fields cannot be deleted' }, { status: 400 });
    }
    await this.assertNoDependents(tenant, old);

    await this.repo.delete(tenant, id);
    await auditLog.create({ tenant, module: 'banna', action: 'CUSTOM_FIELD_DELETED', recordId: id, oldValue: old as unknown as Record<string, unknown> });
  }
}
