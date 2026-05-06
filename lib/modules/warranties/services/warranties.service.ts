import { NextResponse } from 'next/server';
import {
  getWarranties,
  getWarrantyById,
  createWarranty as dbCreateWarranty,
  updateWarranty as dbUpdateWarranty,
  deleteWarranty as dbDeleteWarranty,
  getExpiringWarranties,
} from '@/lib/db/warranties';
import { hasPermission } from '@/lib/platform/permissions';
import { auditLog } from '@/lib/platform/audit';
import type { TenantContext } from '@/lib/platform/tenancy/types';

export interface CreateWarrantyInput {
  assetId: string;
  vendor: string;
  startDate: Date;
  endDate: Date;
  reminder?: boolean;
  notes?: string;
  receiptUrl?: string;
}

export interface UpdateWarrantyInput {
  vendor?: string;
  startDate?: Date;
  endDate?: Date;
  reminder?: boolean;
  notes?: string;
  receiptUrl?: string;
  updatedBy?: string;
}

export async function getAll(tenant: TenantContext, opts?: Parameters<typeof getWarranties>[1]) {
  if (!hasPermission(tenant, 'warranties', 'view'))
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return getWarranties(tenant.organizationId, opts);
}

export async function getById(tenant: TenantContext, warrantyId: string) {
  if (!hasPermission(tenant, 'warranties', 'view'))
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const warranty = await getWarrantyById(warrantyId);
  if (!warranty || warranty.organizationId !== tenant.organizationId)
    throw NextResponse.json({ error: 'Warranty not found' }, { status: 404 });
  return warranty;
}

export async function create(tenant: TenantContext, data: CreateWarrantyInput) {
  if (!hasPermission(tenant, 'warranties', 'create'))
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (tenant.subscription?.status && tenant.subscription.status !== 'ACTIVE')
    throw NextResponse.json({ error: 'Subscription expired' }, { status: 403 });

  const id = await dbCreateWarranty({
    organizationId: tenant.organizationId,
    ...data,
    reminder: data.reminder ?? false,
    createdBy: tenant.userId,
    updatedBy: tenant.userId,
  });

  auditLog.queue({
    tenant,
    action: 'WARRANTY_CREATED',
    module: 'warranties',
    recordId: id,
    newValue: data as unknown as Record<string, unknown>,
  });

  return { id };
}

export async function update(tenant: TenantContext, warrantyId: string, data: UpdateWarrantyInput) {
  if (!hasPermission(tenant, 'warranties', 'update'))
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const warranty = await getWarrantyById(warrantyId);
  if (!warranty || warranty.organizationId !== tenant.organizationId)
    throw NextResponse.json({ error: 'Warranty not found' }, { status: 404 });

  await dbUpdateWarranty(warrantyId, { ...data, updatedBy: tenant.userId } as never);

  auditLog.queue({
    tenant,
    action: 'WARRANTY_UPDATED',
    module: 'warranties',
    recordId: warrantyId,
    oldValue: warranty as unknown as Record<string, unknown>,
    newValue: data as unknown as Record<string, unknown>,
  });
}

export async function del(tenant: TenantContext, warrantyId: string) {
  if (!hasPermission(tenant, 'warranties', 'delete'))
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const warranty = await getWarrantyById(warrantyId);
  if (!warranty || warranty.organizationId !== tenant.organizationId)
    throw NextResponse.json({ error: 'Warranty not found' }, { status: 404 });

  await dbDeleteWarranty(warrantyId);

  auditLog.queue({
    tenant,
    action: 'WARRANTY_DELETED',
    module: 'warranties',
    recordId: warrantyId,
    oldValue: warranty as unknown as Record<string, unknown>,
  });
}

export async function getExpiring(tenant: TenantContext, days: number) {
  if (!hasPermission(tenant, 'warranties', 'view'))
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return getExpiringWarranties(tenant.organizationId, days);
}
