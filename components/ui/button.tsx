import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/cn';

/* DS spec:
   sm  → h=28px  px=10px  gap=6px   icon=14px  text-[13px]
   md  → h=36px  px=14px  gap=8px   icon=16px  text-[14px]
   lg  → h=44px  px=18px  gap=10px  icon=18px  text-[15px]
*/
const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium transition-[background-color,color,border-color,box-shadow,transform] duration-[120ms] ease-out active:scale-[0.97] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-500/20 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:active:scale-100',
  {
    variants: {
      variant: {
        default:     'bg-primary-600 text-white hover:bg-primary-700 shadow-xs',
        destructive: 'bg-red-600 text-white hover:bg-red-700 shadow-xs',
        outline:     'border border-border bg-surface-card text-gray-700 hover:bg-surface-page hover:border-border-strong shadow-xs',
        secondary:   'bg-surface-page text-gray-900 hover:bg-gray-200',
        ghost:       'text-gray-600 hover:bg-surface-page hover:text-gray-900',
        link:        'text-primary-600 underline-offset-4 hover:underline',
      },
      size: {
        sm:       'h-7 gap-1.5 px-2.5 text-[13px]',   /* 28px */
        default:  'h-9 gap-2 px-3.5 text-[14px]',      /* 36px */
        lg:       'h-11 gap-2.5 px-[18px] text-[15px]',/* 44px */
        icon:     'h-9 w-9 gap-0',
        'icon-sm':'h-7 w-7 gap-0',
        'icon-lg':'h-11 w-11 gap-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
