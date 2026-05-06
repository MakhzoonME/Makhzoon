import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/cn';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
        green:   'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
        yellow:  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400',
        red:     'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
        blue:    'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400',
        orange:  'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
