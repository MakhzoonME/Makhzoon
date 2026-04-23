'use client';
import { useState } from 'react';
import Link from 'next/link';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Building2 } from 'lucide-react';
import { buildTenantUrl } from '@/lib/utils/tenant-url';

export default function SignupPage() {
  const [orgName, setOrgName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [subdomainTouched, setSubdomainTouched] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function deriveSubdomain(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  }

  function handleOrgName(v: string) {
    setOrgName(v);
    if (!subdomainTouched) setSubdomain(deriveSubdomain(v));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/organizations/self-serve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgName, subdomain, displayName, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = typeof data.error === 'string' ? data.error : 'Signup failed';
        throw new Error(msg);
      }

      const cred = await signInWithEmailAndPassword(auth, email, password);
      const token = await cred.user.getIdToken();
      const sessionRes = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: token }),
      });
      if (!sessionRes.ok) throw new Error('Session creation failed');
      window.location.href = buildTenantUrl(subdomain, '/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-indigo-600 mb-4">
            <Building2 className="text-white h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create your workspace</h1>
          <p className="text-sm text-gray-500 mt-1">Start your 14-day free trial.</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="orgName">Organization name</Label>
              <Input id="orgName" value={orgName} onChange={(e) => handleOrgName(e.target.value)} placeholder="Acme Inc." required />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="subdomain">Workspace URL</Label>
              <div className="flex items-center rounded-md border border-gray-300 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 overflow-hidden">
                <input
                  id="subdomain"
                  value={subdomain}
                  onChange={(e) => { setSubdomainTouched(true); setSubdomain(e.target.value.toLowerCase()); }}
                  placeholder="acme"
                  required
                  pattern="^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$"
                  minLength={3}
                  maxLength={40}
                  className="flex-1 px-3 py-2 text-sm outline-none bg-white"
                />
                <span className="px-3 py-2 text-xs text-gray-500 bg-gray-50 border-l border-gray-200">.yourapp.com</span>
              </div>
            </div>

            <hr className="border-gray-100" />

            <div className="space-y-1.5">
              <Label htmlFor="displayName">Your name</Label>
              <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Jane Doe" required />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Work email</Label>
              <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@acme.com" required />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" required minLength={8} />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating your workspace…' : 'Create workspace'}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-700">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
