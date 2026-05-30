'use client';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { ChevronsUpDown, Check, Layers } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useAccessibleSpaces } from '@/hooks/spaces';
import { useT } from '@/hooks/ui';
import { cn } from '@/lib/utils/cn';

/**
 * SpaceSwitcher — header dropdown listing the spaces this user can
 * access. Switching navigates to the same route under the new
 * `[space]` segment. Hidden when the user has only one accessible
 * space or when we're outside the [space] route tree.
 */
export function SpaceSwitcher() {
  const params = useParams<{ locale: string; orgSlug: string; space?: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useT();
  const { data, isLoading } = useAccessibleSpaces();

  const currentSlug = (params?.space as string) || null;
  const spaces = data?.items ?? [];

  // Only render when we're inside a space-scoped route AND the user has
  // more than one accessible space. (One space is the default empty
  // state — switcher would only have one option.)
  if (!currentSlug) return null;
  if (!isLoading && spaces.length <= 1) return null;

  const current = spaces.find((s) => s.slug === currentSlug);
  const label = current?.name ?? currentSlug;

  function switchTo(slug: string) {
    if (!params?.locale || !params?.orgSlug) return;
    const prefix = `/${params.locale}/${params.orgSlug}/${currentSlug}`;
    const next = `/${params.locale}/${params.orgSlug}/${slug}`;
    // Replace only the [space] segment; preserve the rest of the path
    // + query so the user stays on the same module/sub-route.
    const newPath = pathname.startsWith(prefix)
      ? next + pathname.slice(prefix.length)
      : `${next}/dashboard`;
    router.push(newPath);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            'inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-sm',
            'text-gray-700 dark:text-gray-200 hover:bg-surface-page transition-colors',
            'focus:outline-none focus:ring-[3px] focus:ring-primary-500/20',
          )}
          aria-label={t('spaces.switcher')}
        >
          <Layers className="h-3.5 w-3.5 text-gray-500" strokeWidth={1.75} />
          <span className="font-medium max-w-[140px] truncate">{label}</span>
          <ChevronsUpDown className="h-3.5 w-3.5 text-gray-400" strokeWidth={1.75} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[200px]">
        <DropdownMenuLabel>{t('spaces.switcher')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {spaces.map((s) => {
          const active = s.slug === currentSlug;
          return (
            <DropdownMenuItem
              key={s.id}
              onSelect={() => switchTo(s.slug)}
              className={cn(active && 'bg-surface-page font-semibold')}
            >
              <div className="flex items-center justify-between w-full gap-2">
                <span className="truncate">{s.name}</span>
                {active && <Check className="h-3.5 w-3.5 text-primary-600" strokeWidth={2} />}
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
