'use client';
import React from 'react';
import { LoadingSkeleton } from './LoadingSkeleton';
import { EmptyState } from './EmptyState';

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
  onSortChange?: (sortBy: string, sortDir: 'asc' | 'desc') => void;
  currentSortBy?: string;
  currentSortDir?: 'asc' | 'desc';
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
  if (isLoading) return <LoadingSkeleton rows={5} columns={columns.length} />;

  function handleSort(col: ColumnDef<T>) {
    if (!col.sortable || !pagination?.onSortChange) return;

    const isCurrentSort = pagination.currentSortBy === col.key;
    const nextDir = isCurrentSort && pagination.currentSortDir === 'asc' ? 'desc' : 'asc';

    if (!isCurrentSort) {
      pagination.onSortChange(col.key, 'asc');
    } else {
      pagination.onSortChange(col.key, nextDir);
    }
  }

  function SortIcon({ col }: { col: ColumnDef<T> }) {
    if (!col.sortable) return null;

    const isCurrentSort = pagination?.currentSortBy === col.key;
    const dir = pagination?.currentSortDir;

    if (!isCurrentSort) {
      return (
        <svg className="w-3 h-3 text-gray-300" viewBox="0 0 12 12" fill="none">
          <path d="M6 2L9 5H3L6 2Z" fill="currentColor" />
          <path d="M6 10L3 7H9L6 10Z" fill="currentColor" />
        </svg>
      );
    }

    return dir === 'asc' ? (
      <svg className="w-3 h-3 text-indigo-600" viewBox="0 0 12 12" fill="none">
        <path d="M6 2L9 5H3L6 2Z" fill="currentColor" />
      </svg>
    ) : (
      <svg className="w-3 h-3 text-indigo-600" viewBox="0 0 12 12" fill="none">
        <path d="M6 10L3 7H9L6 10Z" fill="currentColor" />
      </svg>
    );
  }

  return (
    <div className="w-full">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 ${col.className ?? ''} ${col.sortable ? 'cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200' : ''}`}
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
                  className={`border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={`px-4 py-3 text-sm text-gray-700 dark:text-gray-300 ${col.className ?? ''}`}>
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && pagination.total > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700 mt-2">
          <div className="flex items-center gap-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Showing {(pagination.page - 1) * pagination.pageSize + 1}–{Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total}
            </p>
            {pagination.onPageSizeChange && (
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500 dark:text-gray-400">Per page:</span>
                <select
                  value={pagination.pageSize}
                  onChange={(e) => pagination.onPageSizeChange?.(parseInt(e.target.value, 10))}
                  className="text-xs border border-gray-200 dark:border-gray-600 rounded px-1 py-0.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
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
              className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300 disabled:opacity-40"
              disabled={pagination.page <= 1}
              onClick={() => pagination.onPageChange(1)}
            >
              First
            </button>
            <button
              className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300 disabled:opacity-40"
              disabled={pagination.page <= 1}
              onClick={() => pagination.onPageChange(pagination.page - 1)}
            >
              Prev
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
                  className={`px-2 py-1 text-xs border rounded transition-colors ${
                    pagination.page === pageNum
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300'
                  }`}
                  onClick={() => pagination.onPageChange(pageNum)}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300 disabled:opacity-40"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => pagination.onPageChange(pagination.page + 1)}
            >
              Next
            </button>
            <button
              className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300 disabled:opacity-40"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => pagination.onPageChange(pagination.totalPages)}
            >
              Last
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
