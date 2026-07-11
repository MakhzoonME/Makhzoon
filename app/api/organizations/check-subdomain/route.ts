import { NextRequest, NextResponse } from 'next/server';
import { subdomainExists } from '@/lib/db/organizations';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { z } from 'zod';

const schema = z.object({
  subdomain: z
    .string()
    .min(3)
    .max(40)
    .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/),
});

export async function POST(req: NextRequest) {
  const clientIp = getClientIp(req);
  const limited = await checkRateLimit(
    `check-subdomain:ip:${clientIp}`,
    20,
    60 * 1000,
    { action: 'check subdomain' },
  );
  if (limited) return limited;

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ available: true });

  const taken = await subdomainExists(parsed.data.subdomain).catch(() => false);
  return NextResponse.json({ available: !taken });
}
