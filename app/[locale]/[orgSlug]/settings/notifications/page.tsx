'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  useOrgNotificationDefaults,
} from '@/hooks/notifications';
import { NOTIFICATION_CATALOG, getCatalogByModule } from '@/lib/notifications/catalog';
import { useAdminGuard, toast } from '@/hooks/ui';
import type { NotificationEventType } from '@/lib/notifications/catalog';

interface PrefState {
  inApp: boolean | null   // null = use org default
  email: boolean | null
}

const MODULE_LABELS: Record<string, string> = {
  orders:    'Orders (Haraka)',
  pos:       'Point of Sale (Haraka)',
  inventory: 'Inventory (Raseed)',
  requests:  'Requests',
  users:     'Users',
  warranty:  'Warranties',
  system:    'System',
}

export default function NotificationSettingsPage() {
  const { data: prefsData }   = useNotificationPreferences();
  const { data: defaultsData } = useOrgNotificationDefaults();
  const updateMut              = useUpdateNotificationPreferences();

  const [prefs, setPrefs] = useState<Record<NotificationEventType, PrefState>>({} as Record<NotificationEventType, PrefState>)

  useEffect(() => {
    const initial: Record<NotificationEventType, PrefState> = {} as Record<NotificationEventType, PrefState>
    for (const entry of NOTIFICATION_CATALOG) {
      const saved = prefsData?.preferences.find((p) => p.eventType === entry.key)
      initial[entry.key] = saved
        ? { inApp: saved.inApp, email: saved.email }
        : { inApp: null, email: null }
    }
    setPrefs(initial)
  }, [prefsData])

  function getDefault(key: NotificationEventType, channel: 'inApp' | 'email'): boolean {
    const orgDef = defaultsData?.defaults.find((d) => d.eventType === key)
    if (orgDef) return channel === 'inApp' ? orgDef.inAppEnabled : orgDef.emailEnabled
    const cat = NOTIFICATION_CATALOG.find((e) => e.key === key)
    return channel === 'inApp' ? (cat?.defaultInApp ?? true) : (cat?.defaultEmail ?? false)
  }

  function getEffective(key: NotificationEventType, channel: 'inApp' | 'email'): boolean {
    const p = prefs[key]
    const val = channel === 'inApp' ? p?.inApp : p?.email
    return val ?? getDefault(key, channel)
  }

  async function handleSave() {
    const rows = NOTIFICATION_CATALOG
      .filter((e) => {
        const p = prefs[e.key]
        return p?.inApp !== null || p?.email !== null
      })
      .map((e) => ({
        eventType: e.key,
        inApp:     getEffective(e.key, 'inApp'),
        email:     getEffective(e.key, 'email'),
      }))
    try {
      await updateMut.mutateAsync(rows)
      toast.success('Notification preferences saved')
    } catch {
      toast.error('Failed to save preferences')
    }
  }

  const byModule = getCatalogByModule()

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Notification Preferences</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Choose how you receive notifications. These override the organization defaults for your account only.
        </p>
      </div>

      {Object.entries(byModule).map(([module, entries]) => (
        <div key={module} className="rounded-xl border border-border bg-surface-page overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-surface-inset">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              {MODULE_LABELS[module] ?? module}
            </span>
          </div>
          <div className="divide-y divide-border">
            {entries.map((entry) => (
              <div key={entry.key} className="flex items-center justify-between px-5 py-3 gap-4">
                <span className="text-sm text-gray-700 flex-1">{entry.label}</span>
                <div className="flex items-center gap-6 flex-shrink-0">
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-[10px] text-gray-400">In-app</span>
                    <Switch
                      checked={getEffective(entry.key, 'inApp')}
                      onCheckedChange={(v) => setPrefs((p) => ({ ...p, [entry.key]: { ...p[entry.key], inApp: v } }))}
                    />
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-[10px] text-gray-400">Email</span>
                    <Switch
                      checked={getEffective(entry.key, 'email')}
                      onCheckedChange={(v) => setPrefs((p) => ({ ...p, [entry.key]: { ...p[entry.key], email: v } }))}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <Button onClick={handleSave} disabled={updateMut.isPending} style={{ background: 'var(--mod-haraka)' }}>
        {updateMut.isPending ? 'Saving…' : 'Save preferences'}
      </Button>
    </div>
  );
}
