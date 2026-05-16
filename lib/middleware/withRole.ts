import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/supabase/auth-helpers';
import { AuthUser, UserRole } from '@/types';

type Handler = (req: NextRequest, user: AuthUser, context?: { params: Record<string, string> }) => Promise<NextResponse>;

export function withRole(roles: UserRole[], handler: Handler) {
  return async (req: NextRequest, context?: { params: Record<string, string> }) => {
    const user = await verifySessionCookie();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!roles.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return handler(req, user, context);
  };
}
