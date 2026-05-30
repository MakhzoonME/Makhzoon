import { NextResponse } from 'next/server';
import { getPackages } from '@/lib/db/packages';

// Public, unauthenticated tier list for the marketing pricing page.
// Returns only display-safe fields for active packages.
export async function GET() {
  try {
    const packages = await getPackages({ includeInactive: false });
    const tiers = packages.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      pricing: p.pricing,
      trialDays: p.trialDays,
      sortOrder: p.sortOrder,
      limits: p.limits,
      inclusions: p.inclusions,
    }));
    return NextResponse.json(tiers);
  } catch (err) {
    console.error('[GET /api/packages/public]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
