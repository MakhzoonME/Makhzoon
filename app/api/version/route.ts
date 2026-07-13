import { NextResponse } from 'next/server';
import { BUILD_ID } from '@/lib/app-env';

/**
 * Reports the build ID this deployment was built with, so clients still
 * running an older bundle can detect a newer one is live and prompt a
 * refresh. Must never be cached — a stale cached response would defeat
 * the whole point.
 */
export async function GET() {
  return NextResponse.json(
    { buildId: BUILD_ID },
    { headers: { 'Cache-Control': 'no-store, must-revalidate' } },
  );
}
