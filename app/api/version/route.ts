import { NextResponse } from 'next/server';
import { BUILD_ID } from '@/lib/app-env';

/**
 * Reports the build ID this deployment was built with, so clients still
 * running an older bundle can detect a newer one is live and prompt a
 * refresh. Must never be cached — a stale cached response would defeat
 * the whole point.
 *
 * force-dynamic is required, not optional: a GET handler with no dynamic
 * data usage (cookies/headers/searchParams) is otherwise eligible for
 * Next's static route caching, which would freeze this response at build
 * time and keep serving the OLD build's answer after the next deploy —
 * exactly the staleness this route exists to detect.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(
    { buildId: BUILD_ID },
    { headers: { 'Cache-Control': 'no-store, must-revalidate' } },
  );
}
