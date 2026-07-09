import { NextRequest, NextResponse } from 'next/server';
import { authEmailExists } from '@/lib/supabase/auth-admin';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
});

export async function POST(req: NextRequest) {
  const clientIp = getClientIp(req);
  const limited = await checkRateLimit(`check-email:ip:${clientIp}`, 10, 60 * 1000, { action: 'check email' });
  if (limited) return limited;

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ exists: false });
  }

  const exists = await authEmailExists(parsed.data.email).catch(() => true);
  return NextResponse.json({ exists });
}
