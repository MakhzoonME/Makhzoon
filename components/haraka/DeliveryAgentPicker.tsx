'use client';

import { useState, useMemo } from 'react';
import { Search, Truck, Users, ChevronDown, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useDeliveryAgents } from '@/hooks/haraka';
import { useSpaceMembers } from '@/hooks/spaces';
import { useParams } from 'next/navigation';
import { cn } from '@/lib/utils/cn';

export interface DeliveryAgentValue {
  type: 'member' | 'external';
  id: string;
  name: string;
}

interface Props {
  value: DeliveryAgentValue | null;
  onChange: (v: DeliveryAgentValue | null) => void;
  placeholder?: string;
}

export function DeliveryAgentPicker({ value, onChange, placeholder = 'Assign delivery agent' }: Props) {
  const { space } = useParams<{ space?: string }>();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data: agentsData } = useDeliveryAgents(true);
  const { data: membersData } = useSpaceMembers(space);

  const members = useMemo(
    () =>
      (membersData?.items ?? []).map((m) => ({
        type: 'member' as const,
        id: m.userId,
        name: m.displayName || m.email || m.userId,
      })),
    [membersData],
  );

  const externals = useMemo(
    () =>
      (agentsData?.items ?? []).map((a) => ({
        type: 'external' as const,
        id: a.id,
        name: a.name,
      })),
    [agentsData],
  );

  const q = search.toLowerCase();
  const filteredMembers  = members.filter((m) => m.name.toLowerCase().includes(q));
  const filteredExternals = externals.filter((a) => a.name.toLowerCase().includes(q));

  function select(agent: DeliveryAgentValue) {
    onChange(agent);
    setOpen(false);
    setSearch('');
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex h-9 w-full items-center justify-between gap-2 rounded-md border border-border bg-surface-card px-3 text-[14px] transition-colors',
            'hover:border-gray-300 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-500/20 focus-visible:border-primary-600',
            value ? 'text-gray-900' : 'text-gray-400',
          )}
        >
          <span className="flex items-center gap-2 truncate min-w-0">
            {value ? (
              <>
                {value.type === 'member'
                  ? <Users className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                  : <Truck className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                }
                <span className="truncate text-gray-700">{value.name}</span>
              </>
            ) : (
              <span>{placeholder}</span>
            )}
          </span>
          <span className="flex items-center gap-1 flex-shrink-0 text-gray-400">
            {value && (
              <span
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onChange(null); } }}
                onClick={(e) => { e.stopPropagation(); onChange(null); }}
                className="hover:text-gray-700 transition-colors"
                aria-label="Remove agent"
              >
                <X className="h-3 w-3" strokeWidth={1.75} />
              </span>
            )}
            <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.75} />
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0 bg-surface-card border border-border shadow-lg rounded-xl" align="start">
        <div className="p-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
            <Input
              placeholder="Search agents..."
              className="pl-8 h-8 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto py-1">
          {filteredMembers.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <Users className="h-3 w-3" /> Staff
              </div>
              {filteredMembers.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-surface-page rounded transition-colors"
                  onClick={() => select(m)}
                >
                  {m.name}
                </button>
              ))}
            </div>
          )}
          {filteredExternals.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <Truck className="h-3 w-3" /> External agents
              </div>
              {filteredExternals.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-surface-page rounded transition-colors"
                  onClick={() => select(a)}
                >
                  {a.name}
                </button>
              ))}
            </div>
          )}
          {filteredMembers.length === 0 && filteredExternals.length === 0 && (
            <p className="px-3 py-4 text-sm text-center text-gray-400">No agents found.</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
