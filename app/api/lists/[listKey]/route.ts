import { NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/supabase/auth-helpers';
import {
  resolveListForOrg,
  getPlatformListItems,
} from '@/lib/db/managed-lists';
import { LIST_REGISTRY, type ListKey, type ResolvedListItem } from '@/types';

// Effective dropdown items for the current caller's org. Platform-scoped lists
// (or callers without an org) get platform defaults only. Any authenticated
// user may read; mutations live under /api/superadmin/lists and /api/org/lists.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ listKey: string }> },
) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { listKey } = await params;
    const meta = LIST_REGISTRY[listKey as ListKey];
    if (!meta) return NextResponse.json({ error: 'Unknown list' }, { status: 404 });

    let items: ResolvedListItem[];
    if (meta.scope === 'org' && user.organizationId) {
      items = await resolveListForOrg(user.organizationId, meta.key);
    } else {
      // Platform-scoped, or no org context: platform defaults only.
      items = (await getPlatformListItems(meta.key))
        .filter((p) => p.enabled)
        .map((p) => ({
          value: p.value,
          label: p.label,
          labelAr: p.labelAr,
          color: p.color,
          isSystem: p.isSystem,
          isCustom: false,
        }));
    }

    return NextResponse.json(
      { items },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    return err instanceof NextResponse
      ? err
      : NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
