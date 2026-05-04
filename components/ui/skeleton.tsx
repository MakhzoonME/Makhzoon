import { cn } from '@/lib/utils/cn';

/* DS spec: shimmer sweep animation, bg gray-100→gray-50→gray-100, rounded-sm */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-sm overflow-hidden relative bg-gray-100',
        'after:absolute after:inset-0 after:translate-x-[-100%]',
        'after:bg-gradient-to-r after:from-transparent after:via-white/50 after:to-transparent',
        'after:animate-shimmer',
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
