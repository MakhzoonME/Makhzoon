import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/firebase/auth-helpers';
import { adminAuth } from '@/lib/firebase/admin';
import {
  getSuperAdminUsers,
  createSuperAdminUser,
  MakhzoonRole,
} from '@/lib/db/superadmin-users';
import { createPasswordResetToken } from '@/lib/db/password-reset-tokens';
import { sendEmail } from '@/lib/email/resend';
import { z } from 'zod';

const createMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  displayName: z.string().min(2, 'Name must be at least 2 characters').max(100),
  role: z.enum(['super_admin', 'makhzoon_admin', 'makhzoon_support']),
  permissions: z.record(z.unknown()).optional().nullable(),
});

const ALLOWED_CALLER_ROLES = new Set(['super_admin', 'makhzoon_admin']);
const SUPERADMIN_ROLES = new Set(['super_admin', 'makhzoon_admin', 'makhzoon_support']);

export async function GET() {
  const caller = await verifySessionCookie();
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!ALLOWED_CALLER_ROLES.has(caller.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const firestoreMembers = await getSuperAdminUsers();
  const firestoreIds = new Set(firestoreMembers.map((m) => m.id));

  const { users: authUsers } = await adminAuth.listUsers(1000);
  const missing = authUsers.filter(
    (u) => SUPERADMIN_ROLES.has(u.customClaims?.role) && !firestoreIds.has(u.uid)
  );

  const syntheticMembers = missing.map((u) => ({
    id: u.uid,
    email: u.email ?? '',
    displayName: u.displayName ?? u.email ?? u.uid,
    role: (u.customClaims?.role ?? 'super_admin') as MakhzoonRole,
    status: u.disabled ? 'deactivated' : 'active',
    createdAt: u.metadata.creationTime ?? new Date().toISOString(),
    createdBy: 'system',
    updatedAt: u.metadata.lastRefreshTime ?? new Date().toISOString(),
  }));

  return NextResponse.json([...syntheticMembers, ...firestoreMembers]);
}

export async function POST(req: NextRequest) {
  const caller = await verifySessionCookie();
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!ALLOWED_CALLER_ROLES.has(caller.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const parsed = createMemberSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const { email, displayName, role, permissions } = parsed.data;

  // Only super_admin can create super_admin accounts
  if (role === 'super_admin' && caller.role !== 'super_admin') {
    return NextResponse.json({ error: 'Only Super Admins can create Super Admin accounts' }, { status: 403 });
  }

  // makhzoon_admin can only create makhzoon_support accounts
  if (caller.role === 'makhzoon_admin' && role !== 'makhzoon_support') {
    return NextResponse.json({ error: 'Makhzoon Admins can only create Support accounts' }, { status: 403 });
  }

  const existing = await adminAuth.getUserByEmail(email).catch(() => null);
  if (existing) return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 });

  // Create user without a password — they'll set it via password reset link
  const newUser = await adminAuth.createUser({
    email,
    displayName,
    emailVerified: true,
  });

  await adminAuth.setCustomUserClaims(newUser.uid, { role: role as MakhzoonRole });

  await createSuperAdminUser(newUser.uid, {
    email,
    displayName,
    role: role as MakhzoonRole,
    createdBy: caller.uid,
    permissions: role === 'makhzoon_support' && permissions ? permissions as never : undefined,
  });

  // Generate password reset token and send email with reset link
  const resetToken = await createPasswordResetToken(newUser.uid);
  const resetLink = `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${encodeURIComponent(resetToken)}`;

  await sendEmail({
    to: email,
    subject: 'Set up your Makhzoon team account',
    html: `<p>Hi ${displayName},</p><p>Your Makhzoon team account has been created. Click the link below to set your password.</p><p><a href="${resetLink}">Set Password</a></p><p>This link expires in 24 hours.</p>`,
    text: `Hi ${displayName},\n\nYour Makhzoon team account has been created. Visit the link below to set your password:\n\n${resetLink}\n\nThis link expires in 24 hours.`,
  }).catch((err) => {
    if (process.env.NODE_ENV !== 'production') console.warn('[team] Welcome email failed:', err);
  });

  return NextResponse.json({ id: newUser.uid }, { status: 201 });
}
