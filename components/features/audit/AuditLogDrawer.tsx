'use client';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { useAuditLogs } from '@/hooks/org';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

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

const ACTION_LABEL: Record<string, string> = {
  ASSET_CREATED: 'Created asset',
  ASSET_UPDATED: 'Updated asset',
  ASSET_RETIRED: 'Retired asset',
  WARRANTY_CREATED: 'Added warranty',
  WARRANTY_UPDATED: 'Updated warranty',
  WARRANTY_DELETED: 'Removed warranty',
  REQUEST_SUBMITTED: 'Filed request',
  REQUEST_APPROVED: 'Approved request',
  REQUEST_REJECTED: 'Rejected request',
  USER_INVITED: 'Invited user',
  USER_UPDATED: 'Updated user',
  USER_DEACTIVATED: 'Deactivated user',
  ORGANIZATION_CREATED: 'Created organization',
  ORGANIZATION_UPDATED: 'Updated organization',
  SUBSCRIPTION_UPDATED: 'Updated subscription',
  ASSET_NOTE_ADDED: 'Added note',
  ASSET_NOTE_DELETED: 'Removed note',
  MAINTENANCE_ADDED: 'Logged maintenance',
  MAINTENANCE_DELETED: 'Removed maintenance record',
  ASSET_CHECKED_OUT: 'Checked out asset',
  ASSET_CHECKED_IN: 'Returned asset',
  INVITE_SENT: 'Sent invite',
  INVITE_ACCEPTED: 'Accepted invite',
};

const MODULE_HREF: Record<string, (id: string) => string> = {
  assets: (id) => `/assets/${id}`,
  warranties: () => `/warranties`,
  requests: () => `/requests`,
  users: () => `/users`,
};

export function AuditLogDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data, isLoading } = useAuditLogs();
  const recent = (data?.logs ?? []).slice(0, 30);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/30 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed right-0 top-0 z-50 h-full w-full sm:max-w-md bg-white border-l border-gray-200 shadow-lg flex flex-col data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right duration-200"
          aria-describedby={undefined}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <ActivitySVGIcon />
              <DialogPrimitive.Title className="text-sm font-semibold text-gray-900">Recent activity</DialogPrimitive.Title>
            </div>
            <DialogPrimitive.Close className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100">
              <XSVGIcon />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-14 rounded-md bg-gray-100 animate-pulse" />
                ))}
              </div>
            ) : recent.length === 0 ? (
              <p className="p-6 text-sm text-gray-400 text-center">No activity yet.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {recent.map((log) => {
                  const label = ACTION_LABEL[log.action] ?? log.action;
                  const href = MODULE_HREF[log.module]?.(log.recordId);
                  const timeAgo = log.timestamp
                    ? formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })
                    : '';
                  const inner = (
                    <div className="px-5 py-3 hover:bg-gray-50 transition-colors">
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

          <div className="border-t border-gray-200 px-5 py-3">
            <Link
              href="/superadmin/audit-logs"
              onClick={() => onOpenChange(false)}
              className="text-xs text-indigo-600 hover:underline font-medium"
            >
              View all logs →
            </Link>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
