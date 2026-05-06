import { NextResponse } from 'next/server'
import { verifySessionCookie } from '@/lib/firebase/auth-helpers'
import { getSubscriptionByOrg } from '@/lib/db/subscriptions'
import type { TenantContext } from './types'

export async function resolveTenant(): Promise<TenantContext> {
  const user = await verifySessionCookie()
  if (!user) throw NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const organizationId = user.organizationId
  if (!organizationId) throw NextResponse.json({ error: 'No organization context' }, { status: 400 })

  const subscription = await getSubscriptionByOrg(organizationId)

  return {
    organizationId,
    userId: user.uid,
    user,
    role: user.role,
    permissions: user.permissions,
    subscription,
  }
}
