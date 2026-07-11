'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Bell, CheckCheck } from 'lucide-react';
import { PageHeader } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { NotificationItem } from '@/components/notifications/NotificationItem';
import {
  useNotifications,
  useMarkAsRead,
  useMarkAllAsRead,
} from '@/hooks/notifications';

export default function NotificationsPage() {
  const router = useRouter();
  const { locale, orgSlug } = useParams<{ locale: string; orgSlug: string }>();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useNotifications({ unreadOnly, page, pageSize: 30 });
  const markReadMut  = useMarkAsRead();
  const markAllMut   = useMarkAllAsRead();

  const items     = data?.items ?? [];
  const hasUnread = items.some((n) => !n.isRead);

  function handleItemClick(n: { id: string; link: string | null; isRead: boolean }) {
    if (!n.isRead) markReadMut.mutate(n.id);
    if (n.link) router.push(`/${locale}/${orgSlug}${n.link}`);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title="Notifications"
        actions={
          hasUnread && (
            <Button variant="outline" size="sm" onClick={() => markAllMut.mutate()} disabled={markAllMut.isPending}>
              <CheckCheck className="h-3.5 w-3.5 me-1.5" />
              Mark all as read
            </Button>
          )
        }
      />

      {/* Filter bar */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500">Show unread only</span>
        <Switch
          checked={unreadOnly}
          onCheckedChange={(v) => { setUnreadOnly(v); setPage(1); }}
        />
      </div>

      {/* List */}
      <div className="rounded-xl border border-border bg-surface-page overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-gray-400">
            <Bell size={28} strokeWidth={1.5} />
            <p className="text-sm">{unreadOnly ? 'No unread notifications.' : 'No notifications yet.'}</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {items.map((n) => (
              <NotificationItem
                key={n.id}
                notification={n}
                onClick={() => handleItemClick(n)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
            Previous
          </Button>
          <span className="text-sm text-gray-500 self-center">Page {page} of {data.totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))} disabled={page === data.totalPages}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
