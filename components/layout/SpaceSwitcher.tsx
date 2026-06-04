'use client';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { Check, ChevronDown, Plus } from 'lucide-react';
import { useAccessibleSpaces } from '@/hooks/spaces';
import { useT, useOrgSlug } from '@/hooks/ui';
import { useOrgInfo } from '@/hooks/org';
import { useActiveSpaceStore } from '@/store/active-space.store';
import { cn } from '@/lib/utils/cn';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

/* Deterministic color based on space name initial */
const SPACE_COLORS = [
  '#6366F1', '#8B5CF6', '#EC4899', '#EF4444', '#F97316',
  '#EAB308', '#22C55E', '#14B8A6', '#3B82F6', '#06B6D4',
];
function spaceColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return SPACE_COLORS[Math.abs(hash) % SPACE_COLORS.length];
}

function SpaceAvatar({ name, size = 24 }: { name: string; size?: number }) {
  const color = spaceColor(name);
  const initial = (name[0] ?? '?').toUpperCase();
  return (
    <span
      className="inline-flex items-center justify-center rounded-md text-white font-semibold flex-shrink-0"
      style={{ width: size, height: size, background: color, fontSize: size * 0.5 }}
    >
      {initial}
    </span>
  );
}

export function SpaceSwitcher({ collapsed = false }: { collapsed?: boolean }) {
  const params = useParams<{ locale: string; orgSlug: string; space?: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useT();
  const orgSlug = useOrgSlug();
  const { data: orgInfo } = useOrgInfo();
  const { data, isLoading } = useAccessibleSpaces();
  const storeSlug = useActiveSpaceStore((s) => s.slug);

  const currentSlug = (params?.space as string) || storeSlug || null;
  const spaces = data?.items ?? [];

  if (isLoading && spaces.length === 0) return null;
  if (spaces.length === 0) return null;

  const current = currentSlug ? spaces.find((s) => s.slug === currentSlug) : spaces[0];
  const currentName = current?.name ?? currentSlug ?? t('spaces.pickSpace');

  function switchTo(slug: string) {
    if (!params?.locale || !params?.orgSlug) return;
    const prefix = currentSlug ? `/${params.locale}/${params.orgSlug}/${currentSlug}` : null;
    const next = `/${params.locale}/${params.orgSlug}/${slug}`;
    const newPath = prefix && pathname.startsWith(prefix)
      ? next + pathname.slice(prefix.length)
      : `${next}/dashboard`;
    router.push(newPath);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            'w-full flex items-center gap-2.5 rounded-lg px-2 py-2 text-start',
            'hover:bg-surface-page transition-colors duration-150',
            'focus:outline-none focus:ring-2 focus:ring-primary-500/20',
            collapsed && 'justify-center px-0',
          )}
          aria-label={t('spaces.switcher')}
        >
          <SpaceAvatar name={currentName} size={28} />
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 truncate leading-tight">
                  {currentName}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate leading-tight">
                  {orgInfo?.name ?? orgSlug}
                </p>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" strokeWidth={2} />
            </>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        side="bottom"
        className="min-w-[240px] p-1.5"
        sideOffset={4}
      >
        <DropdownMenuLabel className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-2 py-1.5">
          {t('spaces.switchSpace')}
        </DropdownMenuLabel>

        {spaces.map((s) => {
          const active = s.slug === currentSlug;
          return (
            <DropdownMenuItem
              key={s.id}
              onSelect={() => switchTo(s.slug)}
              className={cn(
                'flex items-center gap-2.5 px-2 py-2 rounded-md cursor-pointer',
                active && 'bg-primary-50 dark:bg-primary-950/30',
              )}
            >
              <SpaceAvatar name={s.name} size={28} />
              <div className="flex-1 min-w-0">
                <p className={cn('text-sm font-medium truncate', active ? 'text-primary-700 dark:text-primary-400' : 'text-gray-900 dark:text-gray-100')}>
                  {s.name}
                </p>
                {(s as { description?: string }).description && (
                  <p className="text-[11px] text-gray-400 truncate">
                    {(s as { description?: string }).description}
                  </p>
                )}
              </div>
              {active && <Check className="h-3.5 w-3.5 text-primary-600 flex-shrink-0" strokeWidth={2.5} />}
            </DropdownMenuItem>
          );
        })}

        <DropdownMenuSeparator className="my-1" />

        <DropdownMenuItem
          onSelect={() => router.push(`/${params.locale}/${params.orgSlug}/settings/spaces/new`)}
          className="flex items-center gap-2 px-2 py-2 rounded-md text-primary-600 dark:text-primary-400 text-sm font-medium cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
          {t('spaces.createSpace')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
