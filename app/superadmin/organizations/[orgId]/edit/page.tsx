'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/ui';
import { ORG_CATEGORIES, type Organization, type OrgCategory } from '@/types';

interface OrgWithSub extends Organization {
  subscription?: unknown;
}

export default function EditOrganizationPage({ params }: { params: { orgId: string } }) {
  const { orgId } = params;
  const router = useRouter();
  const qc = useQueryClient();

  const { data: org, isLoading } = useQuery<OrgWithSub>({
    queryKey: ['org', orgId],
    queryFn: async () => {
      const res = await fetch(`/api/organizations/${orgId}`);
      if (!res.ok) throw new Error('Failed to load');
      return res.json();
    },
  });

  const [name, setName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<OrgCategory | ''>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!org) return;
    setName(org.name);
    setContactEmail(org.contactEmail);
    setDescription(org.description ?? '');
    setCategory((org.category as OrgCategory | null) ?? '');
  }, [org]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/organizations/${orgId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          contactEmail,
          description: description || null,
          category: category || null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to update');
      }
      toast.success('Organization updated');
      qc.invalidateQueries({ queryKey: ['org', orgId] });
      qc.invalidateQueries({ queryKey: ['organizations'] });
      qc.invalidateQueries({ queryKey: ['all-orgs-usage'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Edit Organization"
        description={org?.subdomain ?? '—'}
        breadcrumb={[
          { label: 'Organizations', href: '/superadmin' },
          { label: 'Edit', href: '' },
        ]}
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={() => router.push(`/superadmin/organizations/${orgId}/configuration`)}
          >
            Configuration
          </Button>
        }
      />

      <Card className="max-w-2xl">
        <CardContent className="p-6">
          {isLoading ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Organization Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Contact Email</Label>
                <Input id="email" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as OrgCategory | '')}
                  className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-sm"
                >
                  <option value="">— None —</option>
                  {ORG_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  maxLength={500}
                />
                <p className="text-xs text-gray-500">{description.length}/500</p>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving…' : 'Save Changes'}
                </Button>
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
