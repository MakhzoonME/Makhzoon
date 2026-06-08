import { NextResponse } from 'next/server';
import type { TenantContext } from '@/lib/platform/tenancy/types';
import type { CustomFieldWithValue, CustomFieldRecordType, UpsertCustomFieldValueInput } from '@/types/banna.types';
import { BannaValuesRepository } from '@/lib/modules/banna/repositories/banna-values.repository';
import { hasPermission } from '@/lib/platform/permissions';

export class BannaValuesService {
  private repo = new BannaValuesRepository();

  async getValues(
    tenant: TenantContext,
    recordType: CustomFieldRecordType,
    recordId: string,
  ): Promise<CustomFieldWithValue[]> {
    if (!hasPermission(tenant, 'banna', 'view'))
      throw NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return this.repo.getByRecord(tenant, recordType, recordId);
  }

  async saveValues(
    tenant: TenantContext,
    recordType: CustomFieldRecordType,
    recordId: string,
    values: UpsertCustomFieldValueInput[],
  ): Promise<void> {
    if (!hasPermission(tenant, 'banna', 'update'))
      throw NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    await this.repo.upsert(tenant, recordType, recordId, values);
  }
}
