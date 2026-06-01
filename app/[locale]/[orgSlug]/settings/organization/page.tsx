'use client';
import { useState, useEffect } from 'react';
import { useOrgInfo } from '@/hooks/org';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { useT, useAdminGuard } from '@/hooks/ui';
import { toast } from '@/hooks/ui';
import { useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/utils/api-fetch';
import { ORG_CATEGORIES } from '@/types';
import { Check } from 'lucide-react';

export default function OrganizationInfoPage() {
  const { t } = useT();
  const { isAllowed } = useAdminGuard('settings.orgInfo');
  const { data: org, isLoading } = useOrgInfo();
  const qc = useQueryClient();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (org) {
      setName(org.name ?? '');
      setCategory(org.category ?? '');
      setContactEmail(org.contactEmail ?? '');
      setDescription(org.description ?? '');
    }
  }, [org]);

  if (!isAllowed) return null;
  if (isLoading) return <LoadingSkeleton rows={5} columns={1} />;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await apiFetch('/api/organizations/self', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, category: category || null, contactEmail, description }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Failed to save');
      }
      toast.success(t('common.updated'));
      qc.invalidateQueries({ queryKey: ['org-info-self'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.updateFailed'));
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    if (org) {
      setName(org.name ?? '');
      setCategory(org.category ?? '');
      setContactEmail(org.contactEmail ?? '');
      setDescription(org.description ?? '');
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav.orgInfo')}
        breadcrumb={[
          { label: org?.name ?? '' },
          { label: t('nav.settings') },
          { label: t('nav.orgInfo') },
        ]}
      />

      <Card className="max-w-[620px] rounded-xl">
        <CardContent className="p-6">
          <h2 className="text-[17px] font-semibold text-gray-900 mb-5">{t('settings.orgName')}</h2>
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="org-name">{t('settings.orgName')} <span className="text-red-500">*</span></Label>
              <Input
                id="org-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                maxLength={100}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="org-category">{t('settings.category')}</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="org-category">
                    <SelectValue placeholder={t('settings.selectCategory')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{t('settings.noneSelected')}</SelectItem>
                    {ORG_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="org-email">{t('settings.contactEmail')}</Label>
                <Input
                  id="org-email"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  maxLength={200}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="org-description">{t('settings.description')}</Label>
              <Textarea
                id="org-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('settings.descriptionPlaceholder')}
                rows={4}
                maxLength={1000}
              />
            </div>

            {org?.accountManager && (
              <div className="flex justify-between py-2.5 border-t border-border">
                <dt className="text-sm text-gray-500">{t('settings.accountManager')}</dt>
                <dd className="text-sm font-medium text-gray-900 text-end">
                  {org.accountManager.name
                    ? `${org.accountManager.name} (${org.accountManager.email})`
                    : org.accountManager.email}
                </dd>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                disabled={saving}
                className="cursor-pointer transition-colors duration-150"
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={saving || !name.trim()}
                className="cursor-pointer transition-colors duration-150"
              >
                <Check aria-hidden className="h-4 w-4 me-1" strokeWidth={1.75} />
                {saving ? t('common.saving') : t('settings.saveChanges')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
