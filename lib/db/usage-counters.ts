import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Denormalized per-org counts maintained by DB triggers (migration 0049).
// space_count is not trigger-maintained; the app computes spaces live via
// lib/db/usage.ts (counts public.spaces directly) instead.
export interface UsageCounters {
  organizationId: string;
  usoolAssetCount: number;
  raseedItemCount: number;
  userCount: number;
  spaceCount: number;
  updatedAt: Date;
}

function toUsageCounters(r: Record<string, unknown>): UsageCounters {
  return {
    organizationId: r.organization_id as string,
    usoolAssetCount: (r.usool_asset_count as number) ?? 0,
    raseedItemCount: (r.raseed_item_count as number) ?? 0,
    userCount: (r.user_count as number) ?? 0,
    spaceCount: (r.space_count as number) ?? 0,
    updatedAt: r.updated_at ? new Date(r.updated_at as string) : new Date(),
  };
}

export async function getUsageCounters(
  orgId: string,
): Promise<UsageCounters | null> {
  const { data } = await supabaseAdmin
    .from('usage_counters')
    .select('*')
    .eq('organization_id', orgId)
    .maybeSingle();
  return data ? toUsageCounters(data) : null;
}
