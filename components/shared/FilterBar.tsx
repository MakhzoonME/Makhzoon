'use client';
import React from 'react';
import { Input } from '@/components/ui/input';

function SearchSVG() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M10.5 10.5l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

interface FilterBarProps {
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  filters?: React.ReactNode;
  actions?: React.ReactNode;
}

export function FilterBar({ searchPlaceholder = 'Search...', searchValue, onSearchChange, filters, actions }: FilterBarProps) {
  return (
    <div className="flex items-center gap-3 mb-4">
      {onSearchChange && (
        <div className="relative max-w-xs w-full">
          <span className="absolute start-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            <SearchSVG />
          </span>
          <Input
            className="ps-8"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      )}
      {filters}
      <div className="flex-1" />
      {actions}
    </div>
  );
}
