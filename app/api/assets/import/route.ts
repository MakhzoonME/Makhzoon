import { NextRequest, NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant';
import { hasPermission } from '@/lib/permissions';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { createAsset } from '@/lib/db/assets';
import { auditLog } from '@/lib/platform/audit';
import { assetSchema } from '@/lib/validations/asset.schema';
import { z } from 'zod';

const importBodySchema = z.object({
  rows: z.array(z.record(z.string(), z.unknown())).min(1).max(1000),
});

type RowError = { row: number; errors: string[] };

export async function POST(req: NextRequest) {
  // SECURITY: Rate limit bulk imports (3 per IP per hour)
  const clientIp = getClientIp(req);
  const rateLimitResult = checkRateLimit(
    `import:${clientIp}`,
    3,
    60 * 60 * 1000,
    { action: 'import assets' }
  );
  if (rateLimitResult) return rateLimitResult;

  const tenant = await resolveTenant();
  const user = tenant.user;
  if (!hasPermission(user, 'assets', 'import')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (tenant.subscription?.status && tenant.subscription.status !== 'ACTIVE')
    return NextResponse.json({ error: 'Subscription expired' }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = importBodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid payload' }, { status: 422 });

  let imported = 0;
  const errors: RowError[] = [];

  for (let i = 0; i < parsed.data.rows.length; i++) {
    const raw = parsed.data.rows[i];
    const normalized = {
      name: String(raw.name ?? '').trim(),
      category: String(raw.category ?? '').trim(),
      status: (String(raw.status ?? 'Active').trim() === 'Retired' ? 'Retired' : 'Active'),
      serialNumber: raw.serialNumber ? String(raw.serialNumber).trim() : undefined,
      purchaseDate: raw.purchaseDate ? String(raw.purchaseDate).trim() : undefined,
      purchaseCost: raw.purchaseCost !== undefined && raw.purchaseCost !== '' ? raw.purchaseCost : undefined,
      assignedTo: raw.assignedTo ? String(raw.assignedTo).trim() : undefined,
      location: raw.location ? String(raw.location).trim() : undefined,
      notes: raw.notes ? String(raw.notes).trim() : undefined,
    };

    const rowParsed = assetSchema.safeParse(normalized);
    if (!rowParsed.success) {
      const flat = rowParsed.error.flatten().fieldErrors;
      const msgs = Object.entries(flat).flatMap(([k, v]) => (v ?? []).map((m) => `${k}: ${m}`));
      errors.push({ row: i + 2, errors: msgs });
      continue;
    }

    const d = rowParsed.data;
    try {
      await createAsset({
        organizationId: tenant.organizationId,
        name: d.name,
        category: d.category,
        status: d.status,
        serialNumber: d.serialNumber || undefined,
        purchaseDate: d.purchaseDate ? new Date(d.purchaseDate) : undefined,
        purchaseCost: d.purchaseCost ? Number(d.purchaseCost) : undefined,
        assignedTo: d.assignedTo || undefined,
        location: d.location || undefined,
        notes: d.notes || undefined,
        createdBy: user.uid,
        createdByEmail: user.email,
        createdByName: user.displayName,
        createdByRole: user.role,
        updatedBy: user.uid,
        updatedByEmail: user.email,
        updatedByName: user.displayName,
        updatedByRole: user.role,
      });
      imported++;
    } catch (e) {
      errors.push({ row: i + 2, errors: [e instanceof Error ? e.message : 'Write failed'] });
    }
  }

  auditLog.queue({
    tenant,
    action: 'ASSETS_IMPORTED',
    module: 'assets',
    newValue: { imported, failed: errors.length, total: parsed.data.rows.length },
  });

  return NextResponse.json({ imported, failed: errors.length, errors });
}
