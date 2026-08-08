import { NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { requireFeature } from '@/lib/permissions/require-feature'
import { requireHarakaModule } from '@/lib/permissions/require-module'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const tenant = await resolveTenant()
    requireFeature(tenant, 'pos')
    await requireHarakaModule(tenant, 'services')

    const { data, error } = await supabaseAdmin
      .from('haraka_service_ratings')
      .select('rating, comment, submitted_at, haraka_service_jobs!inner(job_number, organization_id)')
      .eq('haraka_service_jobs.organization_id', tenant.organizationId)
      .order('submitted_at', { ascending: false })
      .limit(200)
    if (error) throw error

    const rows = (data ?? []) as unknown as {
      rating: number
      comment: string | null
      submitted_at: string
      haraka_service_jobs: { job_number: string }
    }[]

    const count = rows.length
    const average = count > 0 ? rows.reduce((sum, r) => sum + r.rating, 0) / count : null
    const recentLow = rows
      .filter((r) => r.rating <= 3)
      .slice(0, 10)
      .map((r) => ({
        jobNumber:   r.haraka_service_jobs.job_number,
        rating:      r.rating,
        comment:     r.comment,
        submittedAt: r.submitted_at,
      }))

    return NextResponse.json({ average, count, recentLow })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[GET /api/haraka/service-jobs/ratings-summary]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
