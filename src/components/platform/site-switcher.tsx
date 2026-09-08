'use client';

import { Check, ChevronsUpDown, LayoutGrid, Plus } from 'lucide-react';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ROLE_LABELS, type SiteRole } from '@/lib/sites/roles';
import { cn } from '@/lib/utils';

export interface SwitcherSite {
  id: string;
  name: string;
  subdomain: string;
  role: SiteRole;
}

function SiteGlyph({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'bg-primary text-primary-foreground grid size-8 shrink-0 place-items-center rounded-md text-sm font-semibold',
        className,
      )}
    >
      {name.trim().charAt(0).toUpperCase() || '·'}
    </span>
  );
}

export function SiteSwitcher({
  sites,
  current,
  rootDomain,
}: {
  sites: SwitcherSite[];
  current: SwitcherSite;
  rootDomain: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        data-testid="site-switcher"
        aria-label="Site wechseln"
        className="hover:bg-accent focus-visible:ring-ring data-[state=open]:bg-accent flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors outline-none focus-visible:ring-[3px]"
      >
        <SiteGlyph name={current.name} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{current.name}</span>
          <span className="text-muted-foreground block truncate text-xs">
            {current.subdomain}.{rootDomain}
          </span>
        </span>
        <ChevronsUpDown className="text-muted-foreground size-4 shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Sites</DropdownMenuLabel>
        {sites.map((site) => (
          <DropdownMenuItem key={site.id} asChild>
            <Link href={`/sites/${site.id}`} className="gap-2.5">
              <SiteGlyph name={site.name} className="size-7 text-xs" />
              <span className="min-w-0 flex-1">
                <span className="block truncate">{site.name}</span>
                <span className="text-muted-foreground block truncate text-xs">
                  {ROLE_LABELS[site.role]}
                </span>
              </span>
              {site.id === current.id ? <Check className="text-primary size-4" /> : null}
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard">
            <LayoutGrid /> Alle Sites
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard#neue-site">
            <Plus /> Neue Site anlegen
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
