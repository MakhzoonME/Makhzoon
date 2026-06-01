'use client';
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

/* ── StatCard ────────────────────────────────────────────────────── */
export interface StatCardProps {
  icon: React.ReactNode;
  /** CSS color for the icon chip background (e.g. 'var(--primary-50)') */
  iconBg: string;
  /** CSS color for the icon itself (e.g. 'var(--primary-700)') */
  iconColor: string;
  label: string;
  value: React.ReactNode;
  sub?: string;
  loading?: boolean;
  onClick?: () => void;
}

export function StatCard({ icon, iconBg, iconColor, label, value, sub, loading, onClick }: StatCardProps) {
  return (
    <Card
      className={`transition-all duration-150 ${onClick ? 'cursor-pointer hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600' : ''}`}
      onClick={onClick}
    >
      <CardContent className="ps-3 pe-4 py-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg flex-shrink-0" style={{ background: iconBg, color: iconColor }}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium text-gray-500 mb-0.5 uppercase tracking-wide">{label}</p>
            {loading ? (
              <div className="h-6 w-12 bg-surface-sidebar rounded animate-pulse" />
            ) : (
              <p className="text-xl font-bold text-gray-900 tabular-nums">{value}</p>
            )}
            {sub && !loading && <p className="text-xs text-gray-500 mt-0">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── OverviewSection ─────────────────────────────────────────────── */
export interface OverviewSectionProps {
  title: string;
  /** Label for the top-right link, e.g. t('dashboard.viewAll'). Arrow is baked into the string. */
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  /** When false, the body sits flush (use for tables that draw their own padding). Defaults true. */
  padded?: boolean;
  children: React.ReactNode;
}

export function OverviewSection({ title, actionLabel, onAction, className, padded = true, children }: OverviewSectionProps) {
  return (
    <Card className={className}>
      <CardContent className="p-0">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          {actionLabel && onAction && (
            <button
              onClick={onAction}
              className="text-xs text-primary-600 dark:text-primary-400 font-medium hover:text-primary-700 dark:hover:text-primary-300 transition-colors whitespace-nowrap"
            >
              {actionLabel}
            </button>
          )}
        </div>
        <div className={padded ? 'p-5' : ''}>{children}</div>
      </CardContent>
    </Card>
  );
}
