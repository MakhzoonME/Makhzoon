import { NextRequest, NextResponse } from 'next/server'
import { ReportInstancesService } from '@/lib/modules/document-reports/instances.service'

const service = new ReportInstancesService()

/** Public, unauthenticated — powers the /r/[orgSlug]/reports/[token] page.
 *  share_token is a 32-byte random value, unguessable, and never rotates. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params
    const report = await service.getByShareToken(token)
    return NextResponse.json({ report })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[GET /api/document-reports/share/[token]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
