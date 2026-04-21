'use client';
import React from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

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
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <Input
            className="pl-8"
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
