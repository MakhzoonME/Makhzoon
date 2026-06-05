'use client';
import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast, useT } from '@/hooks/ui';
import { ORG_CATEGORIES, type Organization, type OrgCategory } from '@/types';

interface TeamMember {
  id: string;
  displayName: string;
  email: string;
  role: string;
  status: string;
}

interface OrgWithSub extends Organization {
  subscription?: unknown;
}

function EditOrgForm({
  org,
  orgId,
  teamMembers,
  onCancel,
}: {
  org: OrgWithSub;
  orgId: string;
  teamMembers: TeamMember[];
  onCancel: () => void;
}) {
  const { t } = useT();
  const qc = useQueryClient();
  const [name, setName] = useState(org.name);
  const [contactEmail, setContactEmail] = useState(org.contactEmail);
  const [description, setDescription] = useState(org.description ?? '');
  const [category, setCategory] = useState<OrgCategory | ''>((org.category as OrgCategory | null) ?? '');
  const [assignedMemberId, setAssignedMemberId] = useState<string>(org.assignedMemberId ?? '');
  const [saving, setSaving] = useState(false);

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
          assignedMemberId: assignedMemberId || null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to update');
      }
      toast.success(t('orgs.updated'));
      qc.invalidateQueries({ queryKey: ['org', orgId] });
      qc.invalidateQueries({ queryKey: ['organizations'] });
      qc.invalidateQueries({ queryKey: ['all-orgs-usage'] });
      qc.invalidateQueries({ queryKey: ['org-info-self'] });
      onCancel();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('orgs.updateFailed'));
    } finally {
      setSaving(false);
    }
  }

  const activeMembers = teamMembers.filter((m) => m.status === 'active');

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">{t('orgs.name')}</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">{t('orgs.contactEmail')}</Label>
        <Input id="email" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="category">{t('orgs.category')}</Label>
        <select
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value as OrgCategory | '')}
          className="flex h-9 w-full rounded-md border border-border bg-surface-card px-3 text-[14px] text-gray-700 focus:outline-none focus:ring-[3px] focus:ring-primary-500/20 focus:border-primary-600"
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
        <Label htmlFor="description">{t('orgs.description')}</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          maxLength={500}
        />
        <p className="text-xs text-gray-500">{description.length}/500</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="assignedMember">{t('settings.accountManager')}</Label>
        <select
          id="assignedMember"
          value={assignedMemberId}
          onChange={(e) => setAssignedMemberId(e.target.value)}
          className="flex h-9 w-full rounded-md border border-border bg-surface-card px-3 text-[14px] text-gray-700 focus:outline-none focus:ring-[3px] focus:ring-primary-500/20 focus:border-primary-600"
        >
          <option value="">— Unassigned —</option>
          {activeMembers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.displayName} ({m.email})
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500">{t('orgs.accountManagerHint')}</p>
      </div>
      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={saving}>
          {saving ? t('common.saving') : t('common.saveChanges')}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  );
}

export default function EditOrganizationPage(props: { params: Promise<{ orgId: string }> }) {
  const params = use(props.params);
  const { orgId } = params;
  const router = useRouter();
  const { t, locale } = useT();

  const { data: org, isLoading } = useQuery<OrgWithSub>({
    queryKey: ['org', orgId],
    queryFn: async () => {
      const res = await fetch(`/api/organizations/${orgId}`);
      if (!res.ok) throw new Error('Failed to load');
      return res.json();
    },
  });

  const { data: teamMembers = [] } = useQuery<TeamMember[]>({
    queryKey: ['superadmin-team'],
    queryFn: async () => {
      const res = await fetch('/api/superadmin/team');
      if (!res.ok) throw new Error('Failed to load team');
      return res.json();
    },
  });

  return (
    <div>
      <PageHeader
        title={org?.name ?? t('common.edit')}
        description={`ID: ${org?.subdomain ?? '—'}`}
        breadcrumb={[
          { label: t('nav.organizations'), href: `/${locale}/superadmin` },
          { label: org?.name ?? '' },
          { label: t('common.edit') },
        ]}
      />

      <Card className="max-w-2xl">
        <CardContent className="p-6">
          {isLoading || !org ? (
            <p className="text-sm text-gray-500">{t('common.loading')}</p>
          ) : (
            <EditOrgForm
              key={org.id}
              org={org}
              orgId={orgId}
              teamMembers={teamMembers}
              onCancel={() => router.back()}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
