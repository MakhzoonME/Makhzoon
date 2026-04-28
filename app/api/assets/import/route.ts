import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/firebase/auth-helpers';
import { createAsset } from '@/lib/firestore/assets';
import { getSubscriptionByOrg } from '@/lib/firestore/subscriptions';
import { writeAuditLog } from '@/lib/audit/logger';
import { assetSchema } from '@/lib/validations/asset.schema';
import { z } from 'zod';

const importBodySchema = z.object({
  rows: z.array(z.record(z.string(), z.unknown())).min(1).max(1000),
});

type RowError = { row: number; errors: string[] };

export async function POST(req: NextRequest) {
  const user = await verifySessionCookie();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin' && user.role !== 'super_admin' && user.role !== 'org_owner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (!user.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 400 });

  const sub = await getSubscriptionByOrg(user.organizationId);
  if (sub && sub.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'Subscription expired' }, { status: 403 });
  }

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
        organizationId: user.organizationId,
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
        updatedBy: user.uid,
      });
      imported++;
    } catch (e) {
      errors.push({ row: i + 2, errors: [e instanceof Error ? e.message : 'Write failed'] });
    }
  }

  await writeAuditLog({
    organizationId: user.organizationId,
    userId: user.uid,
    role: user.role,
    action: 'ASSETS_IMPORTED',
    module: 'assets',
    newValue: { imported, failed: errors.length, total: parsed.data.rows.length },
  });

  return NextResponse.json({ imported, failed: errors.length, errors });
}
