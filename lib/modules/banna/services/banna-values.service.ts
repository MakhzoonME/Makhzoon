import { NextResponse } from 'next/server';
import type { TenantContext } from '@/lib/platform/tenancy/types';
import type { CustomFieldWithValue, CustomFieldRecordType, UpsertCustomFieldValueInput, PlateReaderEntry } from '@/types/banna.types';
import { BannaValuesRepository } from '@/lib/modules/banna/repositories/banna-values.repository';
import { hasPermission } from '@/lib/platform/permissions';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireFeature } from '@/lib/permissions/require-feature';
import { requireAddOn } from '@/lib/permissions/require-module';
import { ServiceVehiclesService } from '@/lib/modules/haraka/service-vehicles/service-vehicles.service';
import { isFieldVisible, type ConditionEvalEntry } from '@/lib/modules/banna/condition-eval';

const vehiclesService = new ServiceVehiclesService();

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

    const clearedValues = await this.applyConditionClearing(tenant, recordType, values);

    if (recordType === 'customers') {
      await this.syncPlateReaderFields(tenant, recordId, clearedValues);
    }

    await this.repo.upsert(tenant, recordType, recordId, clearedValues);
  }

  /**
   * Authoritative enforcement of "clear a field's value when its condition
   * no longer matches" — the UI clears it too, but a value could still
   * arrive here for a field the client thinks is hidden (stale draft, direct
   * API call), so it's re-checked against the *incoming* values before
   * persisting. Fields not covered by `condition` pass through untouched.
   */
  private async applyConditionClearing(
    tenant: TenantContext,
    recordType: CustomFieldRecordType,
    values: UpsertCustomFieldValueInput[],
  ): Promise<UpsertCustomFieldValueInput[]> {
    if (values.length === 0) return values;

    const { data: fieldRows, error } = await supabaseAdmin
      .from('custom_fields')
      .select('id, field_key, condition')
      .eq('organization_id', tenant.organizationId)
      .eq('module', recordType);
    if (error) throw error;
    if (!fieldRows || fieldRows.every((f) => !f.condition)) return values;

    const valueByFieldId = new Map(values.map((v) => [v.fieldId, v.value]));
    const byKey = new Map<string, ConditionEvalEntry>(
      fieldRows.map((f) => [f.field_key as string, { condition: f.condition as never, value: valueByFieldId.get(f.id as string) }]),
    );
    const fieldKeyById = new Map(fieldRows.map((f) => [f.id as string, f.field_key as string]));

    return values.map((v) => {
      const fieldKey = fieldKeyById.get(v.fieldId);
      if (!fieldKey || isFieldVisible(fieldKey, byKey)) return v;
      return { ...v, value: null };
    });
  }

  /**
   * `plate_reader`-type customer fields are entry points into the real
   * haraka_service_vehicles table, not plain JSON — every entry in the array
   * gets find-or-created/updated there, linked to this customer, with the
   * resulting vehicleId written back into the value before it's persisted.
   * Keeps "service history per exact vehicle" working (jobs still FK to a
   * real vehicle row) while the customer field stays the entry point.
   */
  private async syncPlateReaderFields(
    tenant: TenantContext,
    customerId: string,
    values: UpsertCustomFieldValueInput[],
  ): Promise<void> {
    const fieldIds = values.map((v) => v.fieldId);
    if (fieldIds.length === 0) return;

    const { data: fieldRows } = await supabaseAdmin
      .from('custom_fields')
      .select('id, type')
      .in('id', fieldIds);
    const plateFieldIds = new Set(
      (fieldRows ?? []).filter((f) => f.type === 'plate_reader').map((f) => f.id as string),
    );
    if (plateFieldIds.size === 0) return;

    requireFeature(tenant, 'vehicleIntake');
    await requireAddOn(tenant, 'vehicleIntake');

    for (const v of values) {
      if (!plateFieldIds.has(v.fieldId)) continue;
      const entries = Array.isArray(v.value) ? (v.value as PlateReaderEntry[]) : [];
      const synced: PlateReaderEntry[] = [];
      for (const entry of entries) {
        const plateNumber = entry?.plateNumber?.trim().toUpperCase();
        if (!plateNumber) continue;
        const details = {
          customerId,
          make:  entry.make ?? null,
          model: entry.model ?? null,
          color: entry.color ?? null,
          notes: entry.notes ?? null,
        };
        let vehicle;
        if (entry.vehicleId) {
          vehicle = await vehiclesService.update(tenant, entry.vehicleId, { plateNumber, ...details });
        } else {
          const found = await vehiclesService.findOrCreateByPlate(tenant, plateNumber, details);
          // findOrCreateByPlate only sets `details` on a brand-new row — an
          // existing plate found under a different (or no) customer still
          // needs to be re-linked/updated to this one.
          vehicle = found.isNew ? found.vehicle : await vehiclesService.update(tenant, found.vehicle.id, details);
        }
        synced.push({ ...entry, plateNumber: vehicle.plateNumber, vehicleId: vehicle.id });
      }
      v.value = synced;
    }
  }
}
