import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/cn';

/* DS spec: padding 2px 8px, border-radius 999, font-size 12px, weight 500, letter-spacing 0.01em */
const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[12px] font-medium tracking-[0.01em] transition-colors leading-[1.6]',
  {
    variants: {
      variant: {
        /* neutral */
        default:    'bg-surface-page text-gray-600',
        /* semantic shorthands */
        green:      'bg-[var(--green-100)] text-[var(--green-700)]',
        yellow:     'bg-[var(--yellow-100)] text-[var(--yellow-700)]',
        red:        'bg-[var(--red-100)] text-[var(--red-700)]',
        blue:       'bg-[var(--blue-100)] text-[var(--blue-700)]',
        orange:     'bg-orange-100 text-orange-700',
        /* DS semantic tones */
        active:     'bg-[var(--green-100)] text-[var(--green-700)]',
        retired:    'bg-surface-page text-gray-600',
        pending:    'bg-[var(--yellow-100)] text-[var(--yellow-700)]',
        approved:   'bg-[var(--green-100)] text-[var(--green-700)]',
        rejected:   'bg-[var(--red-100)] text-[var(--red-700)]',
        expired:    'bg-[var(--red-100)] text-[var(--red-700)]',
        expiring:   'bg-[var(--yellow-100)] text-[var(--yellow-700)]',
        valid:      'bg-[var(--green-100)] text-[var(--green-700)]',
        admin:      'bg-[var(--primary-100)] text-[var(--primary-700)]',
        staff:      'bg-surface-page text-gray-600',
        superadmin: 'bg-[var(--blue-100)] text-[var(--blue-600)]',
        info:       'bg-[var(--blue-100)] text-[var(--blue-700)]',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span
          className="inline-block h-1.5 w-1.5 rounded-full flex-shrink-0"
          style={{ background: 'currentColor', opacity: 0.85 }}
          aria-hidden
        />
      )}
      {children}
    </span>
  );
}

export { Badge, badgeVariants };
