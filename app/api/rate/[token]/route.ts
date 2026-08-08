import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

type Row = Record<string, unknown>

const submitRatingSchema = z.object({
  rating:  z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).nullable().optional(),
})

/**
 * GET — public, no auth. Resolves a service job by its rating_token for the
 * kiosk/link view. Mirrors /api/track/[token] (same public-token pattern used
 * for order tracking links).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const limited = await checkRateLimit(`rate:ip:${getClientIp(req)}`, 60, 60_000)
    if (limited) return limited

    const { token } = await params
    const { data: job } = await supabaseAdmin
      .from('haraka_service_jobs')
      .select('id, job_number, customer_name, status, organization_id, rating_token_expires_at')
      .eq('rating_token', token)
      .maybeSingle()

    const row = job as Row | null
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const expiresAt = row.rating_token_expires_at as string | null
    if (!expiresAt || new Date(expiresAt).getTime() <= Date.now()) {
      return NextResponse.json({ error: 'This rating link has expired' }, { status: 410 })
    }

    const { data: existingRating } = await supabaseAdmin
      .from('haraka_service_ratings')
      .select('id')
      .eq('job_id', row.id)
      .maybeSingle()

    return NextResponse.json({
      jobNumber:      row.job_number,
      customerName:   row.customer_name,
      alreadyRated:   !!existingRating,
    })
  } catch (err) {
    console.error('[GET /api/rate/[token]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** POST — public, no auth. Submits the one rating this token is allowed to leave. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const limited = await checkRateLimit(`rate-submit:ip:${getClientIp(req)}`, 10, 60_000)
    if (limited) return limited

    const { token } = await params
    const body = await req.json()
    const parsed = submitRatingSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }

    const { data: job } = await supabaseAdmin
      .from('haraka_service_jobs')
      .select('id, organization_id, rating_token_expires_at')
      .eq('rating_token', token)
      .maybeSingle()

    const row = job as Row | null
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const expiresAt = row.rating_token_expires_at as string | null
    if (!expiresAt || new Date(expiresAt).getTime() <= Date.now()) {
      return NextResponse.json({ error: 'This rating link has expired' }, { status: 410 })
    }

    const { error } = await supabaseAdmin
      .from('haraka_service_ratings')
      .insert({
        organization_id: row.organization_id,
        job_id:           row.id,
        rating:           parsed.data.rating,
        comment:          parsed.data.comment ?? null,
      })
    if (error) {
      if (error.code === '23505') { // unique_violation on job_id
        return NextResponse.json({ error: 'This job has already been rated' }, { status: 409 })
      }
      throw error
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[POST /api/rate/[token]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
