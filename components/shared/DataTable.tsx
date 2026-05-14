'use client';
import React from 'react';
import { useT } from '@/hooks/ui';
import { LoadingSkeleton } from './LoadingSkeleton';
import { EmptyState } from './EmptyState';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

export interface ColumnDef<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  className?: string;
  sortable?: boolean;
}

interface PaginationConfig {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  onSortChange?: (sortBy: string, sortDir: 'asc' | 'desc' | 'none') => void;
  currentSortBy?: string;
  currentSortDir?: 'asc' | 'desc' | 'none';
}

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  isLoading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  pagination?: PaginationConfig;
  keyExtractor?: (row: T) => string;
}

export function DataTable<T>({
  data,
  columns,
  isLoading,
  emptyMessage = 'No data found.',
  onRowClick,
  pagination,
  keyExtractor,
}: DataTableProps<T>) {
  const { t } = useT();
  if (isLoading) return <LoadingSkeleton rows={5} columns={columns.length} />;

  function handleSort(col: ColumnDef<T>) {
    if (!col.sortable || !pagination?.onSortChange) return;
    const isCurrentSort = pagination.currentSortBy === col.key;
    if (!isCurrentSort) {
      pagination.onSortChange(col.key, 'asc');
    } else if (pagination.currentSortDir === 'asc') {
      pagination.onSortChange(col.key, 'desc');
    } else {
      pagination.onSortChange(col.key, 'none');
    }
  }

  function SortIcon({ col }: { col: ColumnDef<T> }) {
    if (!col.sortable) return null;
    const isCurrentSort = pagination?.currentSortBy === col.key;
    const dir = pagination?.currentSortDir;
    if (!isCurrentSort || dir === 'none') {
      return (
        <svg className="w-3 h-3 text-gray-300" viewBox="0 0 12 12" fill="none">
          <path d="M6 2L9 5H3L6 2Z" fill="currentColor" />
          <path d="M6 10L3 7H9L6 10Z" fill="currentColor" />
        </svg>
      );
    }
    return dir === 'asc' ? (
      <svg className="w-3 h-3 text-primary-600" viewBox="0 0 12 12" fill="none">
        <path d="M6 2L9 5H3L6 2Z" fill="currentColor" />
      </svg>
    ) : (
      <svg className="w-3 h-3 text-primary-600" viewBox="0 0 12 12" fill="none">
        <path d="M6 10L3 7H9L6 10Z" fill="currentColor" />
      </svg>
    );
  }

  return (
    <div className="w-full">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-start text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500 ${col.className ?? ''} ${col.sortable ? 'cursor-pointer select-none hover:text-gray-700' : ''}`}
                  onClick={() => handleSort(col)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    <SortIcon col={col} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <EmptyState title={emptyMessage} />
                </td>
              </tr>
            ) : (
              data.map((row, i) => (
                <tr
                  key={keyExtractor ? keyExtractor(row) : i}
                  className={`border-b border-border hover:bg-gray-100 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col) => {
                    const content = col.render(row);
                    const isPlainText = typeof content === 'string' || typeof content === 'number';
                    return (
                    <td key={col.key} className={`px-4 py-3 text-[13.5px] text-gray-700 max-w-[260px] ${col.className ?? ''}`}>
                      {isPlainText ? (
                        <TooltipProvider delayDuration={300}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="block truncate">{content}</span>
                            </TooltipTrigger>
                            <TooltipContent>{String(content)}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : content}
                    </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && pagination.total > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border mt-2">
          <div className="flex items-center gap-4">
            <p className="text-[12px] text-gray-500">
              {t('pagination.showing')} {(pagination.page - 1) * pagination.pageSize + 1}–{Math.min(pagination.page * pagination.pageSize, pagination.total)} {t('pagination.of')} {pagination.total}
            </p>
            {pagination.onPageSizeChange && (
              <div className="flex items-center gap-1">
                <span className="text-[12px] text-gray-500">{t('pagination.perPage')}:</span>
                <select
                  value={pagination.pageSize}
                  onChange={(e) => pagination.onPageSizeChange?.(parseInt(e.target.value, 10))}
                  className="text-[12px] border border-border rounded-md px-1.5 py-0.5 bg-surface-card text-gray-700 focus:outline-none focus:ring-[3px] focus:ring-primary-500/20"
                >
                  {[10, 20, 50, 100].map((size) => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              className="px-2.5 py-1 text-[12px] border border-border rounded-md hover:bg-surface-page text-gray-700 disabled:opacity-40 transition-colors"
              disabled={pagination.page <= 1}
              onClick={() => pagination.onPageChange(1)}
            >
              {t('pagination.first')}
            </button>
            <button
              className="px-2.5 py-1 text-[12px] border border-border rounded-md hover:bg-surface-page text-gray-700 disabled:opacity-40 transition-colors"
              disabled={pagination.page <= 1}
              onClick={() => pagination.onPageChange(pagination.page - 1)}
            >
              {t('pagination.prev')}
            </button>
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              let pageNum: number;
              if (pagination.totalPages <= 5) {
                pageNum = i + 1;
              } else if (pagination.page <= 3) {
                pageNum = i + 1;
              } else if (pagination.page >= pagination.totalPages - 2) {
                pageNum = pagination.totalPages - 4 + i;
              } else {
                pageNum = pagination.page - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  aria-current={pagination.page === pageNum ? 'page' : undefined}
                  aria-label={`Page ${pageNum}${pagination.page === pageNum ? ' (current)' : ''}`}
                  className={`px-2.5 py-1 text-[12px] border rounded-md transition-colors ${
                    pagination.page === pageNum
                      ? 'bg-primary-600 text-white border-primary-600 font-semibold shadow-sm'
                      : 'border-border hover:bg-gray-100 text-gray-700'
                  }`}
                  onClick={() => pagination.onPageChange(pageNum)}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              className="px-2.5 py-1 text-[12px] border border-border rounded-md hover:bg-surface-page text-gray-700 disabled:opacity-40 transition-colors"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => pagination.onPageChange(pagination.page + 1)}
            >
              {t('pagination.next')}
            </button>
            <button
              className="px-2.5 py-1 text-[12px] border border-border rounded-md hover:bg-surface-page text-gray-700 disabled:opacity-40 transition-colors"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => pagination.onPageChange(pagination.totalPages)}
            >
              {t('pagination.last')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
