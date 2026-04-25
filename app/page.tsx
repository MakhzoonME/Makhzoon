import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

export default async function Home() {
  const cookieStore = cookies();
  const session = cookieStore.get('session')?.value;

  if (!session) {
    redirect('/login');
  }

  try {
    const decoded = await adminAuth.verifySessionCookie(session, true);
    const role = decoded.role as string;

    if (role === 'super_admin') {
      redirect('/superadmin/dashboard');
    }

    const orgId = decoded.organizationId as string | undefined;
    if (orgId) {
      const doc = await adminDb.collection('organizations').doc(orgId).get();
      if (doc.exists) {
        const slug = doc.data()?.subdomain as string | undefined;
        if (slug) redirect(`/${slug}/dashboard`);
      }
    }
  } catch {
    // Invalid or expired session
  }

  redirect('/login');
}
