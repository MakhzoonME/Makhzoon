'use client';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useSubscriptionGate } from '@/hooks/org';
import { cn } from '@/lib/utils/cn';
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  className?: string;
}

export function SubscriptionGate({ children, className }: Props) {
  const { restricted, tooltip } = useSubscriptionGate();

  if (!restricted) return <>{children}</>;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn('cursor-not-allowed opacity-50', className)}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="text-xs">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function useIsSubscriptionRestricted(): boolean {
  const { restricted } = useSubscriptionGate();
  return restricted;
}
