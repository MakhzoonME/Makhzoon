'use client';

import { Star, AlertTriangle } from 'lucide-react';
import { useServiceJobRatingsSummary } from '@/hooks/haraka';
import { formatDate } from '@/lib/utils/date';

export function RatingsSummaryWidget() {
  const { data, isLoading } = useServiceJobRatingsSummary();

  if (isLoading || !data || data.count === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-surface-page p-4 flex flex-wrap items-start gap-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <span className="text-2xl font-bold tabular-nums text-gray-900">{data.average?.toFixed(1)}</span>
          <Star className="h-5 w-5 text-amber-500" fill="#f59e0b" />
        </div>
        <div className="text-xs text-gray-400">
          {data.count} rating{data.count !== 1 ? 's' : ''}
        </div>
      </div>

      {data.recentLow.length > 0 && (
        <div className="flex-1 min-w-[220px]">
          <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700 mb-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            {data.recentLow.length} rating{data.recentLow.length !== 1 ? 's' : ''} 3★ or below
          </div>
          <div className="space-y-1">
            {data.recentLow.slice(0, 3).map((r, i) => (
              <div key={i} className="text-xs text-gray-500 flex items-center gap-2">
                <span className="font-mono font-semibold text-gray-700">{r.jobNumber}</span>
                <span>{r.rating}★</span>
                {r.comment && <span className="truncate text-gray-400">— {r.comment}</span>}
                <span className="ms-auto text-gray-300 whitespace-nowrap">{formatDate(r.submittedAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
