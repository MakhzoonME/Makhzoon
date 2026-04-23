'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { CheckCircle2, AlertCircle, Mail, UserCircle2, Shield } from 'lucide-react';

type InviteInfo = {
  email: string;
  displayName: string;
  role: 'admin' | 'staff';
  orgName: string;
  invitedByName: string;
};

export default function AcceptInvitePage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/invites/${params.token}`)
      .then(async (res) => {
        if (!res.ok) {
          const e = await res.json().catch(() => ({}));
          throw new Error(e.error ?? 'Invite is invalid or expired');
        }
        return res.json();
      })
      .then((data) => setInfo(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [params.token]);

  async function handleAccept(e: React.FormEvent) {
    e.preventDefault();
    if (!info) return;
    setError('');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (password !== confirm) return setError('Passwords do not match.');

    setSubmitting(true);
    try {
      const res = await fetch(`/api/invites/${params.token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to accept invite');

      const cred = await signInWithEmailAndPassword(auth, info.email, password);
      const token = await cred.user.getIdToken();
      const sessionRes = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: token }),
      });
      if (!sessionRes.ok) throw new Error('Session creation failed');
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept invite');
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md animate-pulse bg-white rounded-2xl border border-gray-200 p-8 h-80" />
      </div>
    );
  }

  if (error && !info) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 p-8 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-red-50 mb-4">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-1">Invite unavailable</h1>
          <p className="text-sm text-gray-500 mb-6">{error}</p>
          <Button onClick={() => router.push('/login')} className="w-full">Go to sign in</Button>
        </div>
      </div>
    );
  }

  if (!info) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-indigo-600 mb-4">
            <CheckCircle2 className="text-white h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Join {info.orgName}</h1>
          <p className="text-sm text-gray-500 mt-1">{info.invitedByName} invited you to collaborate.</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="space-y-2 text-sm mb-6">
            <div className="flex items-center gap-2 text-gray-700">
              <UserCircle2 className="h-4 w-4 text-gray-400" />
              <span className="font-medium">{info.displayName}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <Mail className="h-4 w-4 text-gray-400" />
              <span>{info.email}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <Shield className="h-4 w-4 text-gray-400" />
              <span className="capitalize">{info.role}</span>
            </div>
          </div>

          <form onSubmit={handleAccept} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password">Create a password</Label>
              <Input
                id="password"
                type="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Setting up your account…' : 'Accept invitation'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
