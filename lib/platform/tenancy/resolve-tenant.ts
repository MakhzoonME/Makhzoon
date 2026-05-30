import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { verifySessionCookie } from '@/lib/supabase/auth-helpers'
import { getSubscriptionByOrg } from '@/lib/db/subscriptions'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { TenantContext } from './types'

/**
 * Look up the accessible spaces for a user inside their org.
 *
 *  - users.all_spaces=true → every space in the org
 *  - otherwise           → spaces referenced in space_members
 *
 * Returns rows keyed by slug + id so we can resolve `x-space-slug`
 * to a uuid AND validate access in one place.
 */
async function listAccessibleSpaces(
  organizationId: string,
  userId: string,
  allSpaces: boolean,
): Promise<Array<{ id: string; slug: string; isDefault: boolean }>> {
  if (allSpaces) {
    const { data } = await supabaseAdmin
      .from('spaces')
      .select('id, slug, is_default')
      .eq('organization_id', organizationId)
      .eq('status', 'active')
    return (data ?? []).map((r) => ({
      id: r.id as string,
      slug: r.slug as string,
      isDefault: (r.is_default as boolean) ?? false,
    }))
  }

  // Join via space_members. Postgres returns nested objects through the
  // foreign-key relationship; we flatten them below.
  const { data } = await supabaseAdmin
    .from('space_members')
    .select('space_id, spaces!inner(id, slug, is_default, organization_id, status)')
    .eq('user_id', userId)
  type Row = {
    spaces: {
      id: string
      slug: string
      is_default: boolean | null
      organization_id: string
      status: string
    } | null
  }
  return (data as unknown as Row[] ?? [])
    .map((r) => r.spaces)
    .filter((s): s is NonNullable<Row['spaces']> =>
      !!s && s.organization_id === organizationId && s.status === 'active',
    )
    .map((s) => ({ id: s.id, slug: s.slug, isDefault: s.is_default ?? false }))
}

export async function resolveTenant(): Promise<TenantContext> {
  const user = await verifySessionCookie()
  if (!user) throw NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const organizationId = user.organizationId
  if (!organizationId) throw NextResponse.json({ error: 'No organization context' }, { status: 400 })

  const subscription = await getSubscriptionByOrg(organizationId)

  // ── Resolve active space ───────────────────────────────────────
  // Platform-admin family bypasses the space check entirely — they
  // operate cross-tenant and don't have space_members rows.
  const PLATFORM_ROLES = new Set(['super_admin', 'makhzoon_admin', 'makhzoon_support'])
  const isPlatformAdmin = PLATFORM_ROLES.has(user.role)

  const headerStore = await headers()
  const requestedSlug = headerStore.get('x-space-slug') || null

  let spaceId: string | undefined
  let accessibleSpaceIds: string[] | undefined
  const allSpaces = user.allSpaces ?? isPlatformAdmin

  if (!isPlatformAdmin) {
    const accessible = await listAccessibleSpaces(
      organizationId,
      user.uid,
      allSpaces,
    )
    accessibleSpaceIds = accessible.map((s) => s.id)

    if (requestedSlug) {
      const match = accessible.find((s) => s.slug === requestedSlug)
      if (!match) {
        throw NextResponse.json({ error: 'Space not accessible' }, { status: 403 })
      }
      spaceId = match.id
    } else {
      // No slug header (e.g. org-wide page) → fall back to default-or-first.
      const fallback = accessible.find((s) => s.isDefault) ?? accessible[0]
      spaceId = fallback?.id
    }
  }

  return {
    organizationId,
    userId: user.uid,
    user,
    role: user.role,
    permissions: user.permissions,
    subscription,
    spaceId,
    accessibleSpaceIds,
    allSpaces,
  }
}
