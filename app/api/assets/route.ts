import { NextRequest, NextResponse } from 'next/server';
import { assetSchema } from '@/lib/validations/asset.schema';
import { withLogging } from '@/lib/logging/with-logging';
import { requireAuth } from '@/lib/services/base.service';
import * as assetsService from '@/lib/services/assets.service';
import { logError } from '@/lib/logging/safe-error';
import { adminDb } from '@/lib/firebase/admin';
import { Asset } from '@/types';

async function enrichAssetCreators(items: Asset[]): Promise<Asset[]> {
  const missingIds = Array.from(new Set(
    items.filter((a) => a.createdBy && !a.createdByName && !a.createdByEmail).map((a) => a.createdBy!)
  ));
  if (!missingIds.length) return items;
  const docs = await Promise.all(missingIds.map((id) => adminDb.collection('users').doc(id).get()));
  const labelMap = new Map<string, string>();
  docs.forEach((doc, i) => {
    if (doc.exists) {
      const d = doc.data()!;
      const label = d.displayName || d.email;
      if (label) labelMap.set(missingIds[i], String(label));
    }
  });
  return items.map((a) => {
    if (a.createdBy && !a.createdByName && !a.createdByEmail && labelMap.has(a.createdBy)) {
      return { ...a, createdByName: labelMap.get(a.createdBy) };
    }
    return a;
  });
}

async function _GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(req.url);

    if (searchParams.get('categoriesOnly') === 'true') {
      const categories = await assetsService.getOrgAssetCategories(user);
      return NextResponse.json({ categories }, {
        headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' },
      });
    }

    const status = searchParams.get('status') ?? undefined;
    const category = searchParams.get('category') ?? undefined;
    const search = searchParams.get('search') ?? undefined;
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : undefined;
    const pageSize = searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!, 10) : undefined;
    const sortBy = searchParams.get('sortBy') ?? undefined;
    const sortDir = searchParams.get('sortDir') === 'asc' ? 'asc' as const : 'desc' as const;

    const result = await assetsService.getOrgAssets(user, {
      status, category, search, page, pageSize, sortBy: sortBy as never, sortDir,
    });
    const enrichedItems = await enrichAssetCreators(result.items);
    return NextResponse.json({ ...result, items: enrichedItems }, {
      headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' },
    });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    logError('[GET /api/assets]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function _POST(req: NextRequest) {
  try {
    const user = await requireAuth();

    const body = await req.json();
    const parsed = assetSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    const data = parsed.data;
    const result = await assetsService.createAssetWithAudit(user, {
      name: data.name,
      category: data.category,
      status: data.status,
      serialNumber: data.serialNumber || undefined,
      purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
      purchaseCost: data.purchaseCost ? Number(data.purchaseCost) : undefined,
      assignedTo: data.assignedTo || undefined,
      location: data.location || undefined,
      notes: data.notes || undefined,
      receiptUrl: data.receiptUrl || undefined,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    logError('[POST /api/assets]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const GET  = withLogging(_GET);
export const POST = withLogging(_POST);
