'use client';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { useAuditLogs } from '@/hooks/org';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useT } from '@/hooks/ui';
import type { MessageKey } from '@/locales/messages';


function XSVGIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function ActivitySVGIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M1.5 8h2.5l2-5 3 10 2-5.5 1.5 0.5H14.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const ACTION_KEY: Record<string, MessageKey> = {
  ASSET_CREATED: 'audit.action.ASSET_CREATED',
  ASSET_UPDATED: 'audit.action.ASSET_UPDATED',
  ASSET_RETIRED: 'audit.action.ASSET_RETIRED',
  WARRANTY_CREATED: 'audit.action.WARRANTY_CREATED',
  WARRANTY_UPDATED: 'audit.action.WARRANTY_UPDATED',
  WARRANTY_DELETED: 'audit.action.WARRANTY_DELETED',
  REQUEST_SUBMITTED: 'audit.action.REQUEST_SUBMITTED',
  REQUEST_APPROVED: 'audit.action.REQUEST_APPROVED',
  REQUEST_REJECTED: 'audit.action.REQUEST_REJECTED',
  USER_INVITED: 'audit.action.USER_INVITED',
  USER_UPDATED: 'audit.action.USER_UPDATED',
  USER_DEACTIVATED: 'audit.action.USER_DEACTIVATED',
  ORGANIZATION_CREATED: 'audit.action.ORGANIZATION_CREATED',
  ORGANIZATION_UPDATED: 'audit.action.ORGANIZATION_UPDATED',
  SUBSCRIPTION_UPDATED: 'audit.action.SUBSCRIPTION_UPDATED',
  ASSET_NOTE_ADDED: 'audit.action.ASSET_NOTE_ADDED',
  ASSET_NOTE_DELETED: 'audit.action.ASSET_NOTE_DELETED',
  MAINTENANCE_ADDED: 'audit.action.MAINTENANCE_ADDED',
  MAINTENANCE_DELETED: 'audit.action.MAINTENANCE_DELETED',
  ASSET_CHECKED_OUT: 'audit.action.ASSET_CHECKED_OUT',
  ASSET_CHECKED_IN: 'audit.action.ASSET_CHECKED_IN',
  INVITE_SENT: 'audit.action.INVITE_SENT',
  INVITE_ACCEPTED: 'audit.action.INVITE_ACCEPTED',
  SPACE_CREATED: 'audit.action.SPACE_CREATED',
  SPACE_UPDATED: 'audit.action.SPACE_UPDATED',
  SPACE_ARCHIVED: 'audit.action.SPACE_ARCHIVED',
  RECEIPT_CONFIG_UPDATED: 'audit.action.RECEIPT_CONFIG_UPDATED',
  ORG_LIST_ITEM_CREATED: 'audit.action.ORG_LIST_ITEM_CREATED',
  ORG_LIST_ITEM_UPDATED: 'audit.action.ORG_LIST_ITEM_UPDATED',
  ORG_LIST_ITEM_DELETED: 'audit.action.ORG_LIST_ITEM_DELETED',
  TAX_RATE_CREATED: 'audit.action.TAX_RATE_CREATED',
  TAX_RATE_UPDATED: 'audit.action.TAX_RATE_UPDATED',
  TAX_RATE_DELETED: 'audit.action.TAX_RATE_DELETED',
  FAWTARA_CONFIG_UPDATED: 'audit.action.FAWTARA_CONFIG_UPDATED',
  POS_SESSION_OPENED: 'audit.action.POS_SESSION_OPENED',
  POS_SESSION_CLOSED: 'audit.action.POS_SESSION_CLOSED',
  POS_SALE_COMPLETED: 'audit.action.POS_SALE_COMPLETED',
  POS_SALE_VOIDED: 'audit.action.POS_SALE_VOIDED',
  POS_SALE_REFUNDED: 'audit.action.POS_SALE_REFUNDED',
  POS_CUSTOMER_CREATED: 'audit.action.POS_CUSTOMER_CREATED',
  POS_CUSTOMER_UPDATED: 'audit.action.POS_CUSTOMER_UPDATED',
  INVENTORY_ITEM_CREATED: 'audit.action.INVENTORY_ITEM_CREATED',
  INVENTORY_ITEM_UPDATED: 'audit.action.INVENTORY_ITEM_UPDATED',
  INVENTORY_ITEM_DELETED: 'audit.action.INVENTORY_ITEM_DELETED',
  PURCHASE_CREATED: 'audit.action.PURCHASE_CREATED',
  PURCHASE_UPDATED: 'audit.action.PURCHASE_UPDATED',
  PURCHASE_DELETED: 'audit.action.PURCHASE_DELETED',
};

export function AuditLogDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data, isLoading } = useAuditLogs();
  const params = useParams<{ locale: string; orgSlug: string }>();
  const locale = params?.locale ?? 'en';
  const orgSlug = params?.orgSlug ?? '';
  const recent = (data?.logs ?? []).slice(0, 30);
  const { t } = useT();
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  function relativeTime(ts: string | number | Date): string {
    const d = new Date(ts);
    const diffMs = Date.now() - d.getTime();
    const diffMin = Math.floor(diffMs / 60_000);
    const diffH = Math.floor(diffMs / 3_600_000);
    const diffD = Math.floor(diffMs / 86_400_000);
    if (diffMin < 2) return t('time.justNow');
    if (diffMin < 60) return rtf.format(-diffMin, 'minute');
    if (diffH < 24) return rtf.format(-diffH, 'hour');
    if (diffD < 30) return rtf.format(-diffD, 'day');
    return d.toLocaleDateString(locale);
  }

  function buildModuleHref(module: string, recordId: string): string {
    const base = orgSlug ? `/${locale}/${orgSlug}` : `/${locale}`;
    switch (module) {
      case 'assets': return `${base}/usool/${recordId}`;
      case 'inventory': return `${base}/raseed/${recordId}`;
      case 'warranties': return `${base}/warranties`;
      case 'requests': return `${base}/requests`;
      case 'users': return `${base}/users`;
      default: return '';
    }
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/30 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed end-0 top-0 z-50 h-full w-full sm:max-w-md bg-surface-card border-s border-border shadow-lg flex flex-col data-[state=open]:animate-in data-[state=closed]:animate-out ltr:data-[state=closed]:slide-out-to-right rtl:data-[state=closed]:slide-out-to-left ltr:data-[state=open]:slide-in-from-right rtl:data-[state=open]:slide-in-from-left duration-200"
          aria-describedby={undefined}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <ActivitySVGIcon />
              <DialogPrimitive.Title className="text-sm font-semibold text-gray-900">{t('dashboard.recentActivity')}</DialogPrimitive.Title>
            </div>
            <DialogPrimitive.Close className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-surface-page">
              <XSVGIcon />
              <span className="sr-only">{t('common.close')}</span>
            </DialogPrimitive.Close>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-14 rounded-md bg-surface-page animate-pulse" />
                ))}
              </div>
            ) : recent.length === 0 ? (
              <p className="p-6 text-sm text-gray-400 text-center">{t('audit.noActivity')}</p>
            ) : (
              <ul className="divide-y divide-border">
                {recent.map((log) => {
                  const label = ACTION_KEY[log.action] ? t(ACTION_KEY[log.action]) : log.action;
                  const href = log.recordId ? buildModuleHref(log.module, log.recordId) : '';
                  const timeAgo = log.timestamp ? relativeTime(log.timestamp) : '';
                  const inner = (
                    <div className="px-5 py-3 hover:bg-surface-page transition-colors">
                      <p className="text-sm text-gray-900 font-medium">{label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        <span className="capitalize">{log.module}</span> · {timeAgo}
                      </p>
                    </div>
                  );
                  return (
                    <li key={log.id}>
                      {href ? (
                        <Link href={href} onClick={() => onOpenChange(false)} className="block">
                          {inner}
                        </Link>
                      ) : (
                        inner
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="border-t border-border px-5 py-3">
            <Link
              href={`/${locale}/superadmin/audit-logs`}
              onClick={() => onOpenChange(false)}
              className="text-xs text-primary-600 hover:underline font-medium"
            >
              {t('audit.viewAllLogs')}
            </Link>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
