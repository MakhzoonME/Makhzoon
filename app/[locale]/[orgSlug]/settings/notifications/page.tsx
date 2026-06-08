'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Bell, BellOff } from 'lucide-react';
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

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

function usePushSubscription() {
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setSubscribed(false);
      return;
    }
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setSubscribed(!!sub);
    });
  }, []);

  const subscribe = useCallback(async () => {
    setLoading(true);
    try {
      const keyRes = await fetch('/api/push-subscriptions/vapid-key');
      if (!keyRes.ok) throw new Error('Push not configured on server');
      const { publicKey } = await keyRes.json() as { publicKey: string };

      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey).buffer as ArrayBuffer,
      });

      const json = sub.toJSON() as {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };

      await fetch('/api/push-subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint:  json.endpoint,
          keys:      json.keys,
          userAgent: navigator.userAgent,
        }),
      });

      setSubscribed(true);
    } catch (err) {
      console.error('[push] subscribe error', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch('/api/push-subscriptions', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } catch (err) {
      console.error('[push] unsubscribe error', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return { subscribed, loading, subscribe, unsubscribe };
}

export default function NotificationSettingsPage() {
  const { data: prefsData }   = useNotificationPreferences();
  const { data: defaultsData } = useOrgNotificationDefaults();
  const updateMut              = useUpdateNotificationPreferences();
  const push                   = usePushSubscription();

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

      {/* Browser push notifications */}
      {'serviceWorker' in (typeof navigator !== 'undefined' ? navigator : {}) && (
        <div className="rounded-xl border border-border bg-surface-page p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {push.subscribed
              ? <Bell className="h-5 w-5 text-primary-600" />
              : <BellOff className="h-5 w-5 text-gray-400" />}
            <div>
              <p className="text-sm font-medium text-gray-900">Browser push notifications</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {push.subscribed
                  ? 'This browser will receive push notifications.'
                  : 'Get instant alerts in this browser even when the tab is closed.'}
              </p>
            </div>
          </div>
          {push.subscribed === null ? null : push.subscribed ? (
            <Button
              size="sm"
              variant="outline"
              disabled={push.loading}
              onClick={push.unsubscribe}
              className="flex-shrink-0"
            >
              {push.loading ? 'Disabling…' : 'Disable'}
            </Button>
          ) : (
            <Button
              size="sm"
              disabled={push.loading}
              onClick={push.subscribe}
              className="flex-shrink-0"
              style={{ background: 'var(--mod-haraka)' }}
            >
              {push.loading ? 'Enabling…' : 'Enable'}
            </Button>
          )}
        </div>
      )}

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
