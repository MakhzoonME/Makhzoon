import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/firebase/auth-helpers';
import { adminAuth } from '@/lib/firebase/admin';
import {
  getSuperAdminUsers,
  createSuperAdminUser,
  MakhzoonRole,
} from '@/lib/firestore/superadmin-users';
import { sendEmail } from '@/lib/email/resend';
import { z } from 'zod';

const createMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  displayName: z.string().min(2, 'Name must be at least 2 characters').max(100),
  role: z.enum(['makhzoon_admin', 'makhzoon_support']),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

const ALLOWED_CALLER_ROLES = new Set(['super_admin', 'makhzoon_admin']);
const SUPERADMIN_ROLES = new Set(['super_admin', 'makhzoon_admin', 'makhzoon_support']);

export async function GET() {
  const caller = await verifySessionCookie();
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!ALLOWED_CALLER_ROLES.has(caller.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Get all Firestore-tracked members
  const firestoreMembers = await getSuperAdminUsers();
  const firestoreIds = new Set(firestoreMembers.map((m) => m.id));

  // List Firebase Auth users and find superadmin-role ones not yet in Firestore
  const { users: authUsers } = await adminAuth.listUsers(1000);
  const missing = authUsers.filter(
    (u) => SUPERADMIN_ROLES.has(u.customClaims?.role) && !firestoreIds.has(u.uid)
  );

  const syntheticMembers = missing.map((u) => ({
    id: u.uid,
    email: u.email ?? '',
    displayName: u.displayName ?? u.email ?? u.uid,
    role: (u.customClaims?.role ?? 'super_admin') as 'super_admin' | 'makhzoon_admin' | 'makhzoon_support',
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

  // makhzoon_admin can only create makhzoon_support (not other makhzoon_admin)
  const body = await req.json();
  const parsed = createMemberSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const { email, displayName, role, password } = parsed.data;

  if (caller.role === 'makhzoon_admin' && role !== 'makhzoon_support') {
    return NextResponse.json({ error: 'Makhzoon Admins can only create Support accounts' }, { status: 403 });
  }

  const existing = await adminAuth.getUserByEmail(email).catch(() => null);
  if (existing) return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 });

  const newUser = await adminAuth.createUser({
    email,
    displayName,
    password,
    emailVerified: true,
  });

  await adminAuth.setCustomUserClaims(newUser.uid, { role: role as MakhzoonRole });

  await createSuperAdminUser(newUser.uid, {
    email,
    displayName,
    role: role as MakhzoonRole,
    createdBy: caller.uid,
  });

  // Send welcome email with credentials
  await sendEmail({
    to: email,
    subject: 'Your Makhzoon team account',
    html: `<p>Hi ${displayName},</p><p>Your Makhzoon team account has been created.</p><p><strong>Email:</strong> ${email}<br/><strong>Temporary password:</strong> ${password}</p><p>Please sign in and change your password.</p>`,
    text: `Hi ${displayName},\n\nYour Makhzoon team account has been created.\n\nEmail: ${email}\nTemporary password: ${password}\n\nPlease sign in and change your password.`,
  }).catch((err) => {
    if (process.env.NODE_ENV !== 'production') console.warn('[team] Welcome email failed:', err);
  });

  return NextResponse.json({ id: newUser.uid }, { status: 201 });
}
