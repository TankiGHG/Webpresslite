'use client';

import { ExternalLink, Menu } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Logo, LogoMark } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { SiteNav, type SiteNavBadges } from './site-nav';
import { SiteSwitcher, type SwitcherSite } from './site-switcher';
import { UserMenu, type UserMenuProps } from './user-menu';

export interface SiteShellProps {
  site: SwitcherSite;
  sites: SwitcherSite[];
  siteUrl: string;
  rootDomain: string;
  user: UserMenuProps;
  badges?: SiteNavBadges;
  children: ReactNode;
}

function SidebarBody({
  site,
  sites,
  siteUrl,
  rootDomain,
  user,
  badges,
  onNavigate,
}: Omit<SiteShellProps, 'children'> & { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-3 pt-3 pb-2">
        <SiteSwitcher sites={sites} current={site} rootDomain={rootDomain} />
      </div>
      <div className="app-scroll flex-1 overflow-y-auto px-3 py-2">
        <SiteNav siteId={site.id} role={site.role} badges={badges} onNavigate={onNavigate} />
      </div>
      <div className="border-sidebar-border border-t px-3 py-2">
        <a
          href={siteUrl}
          target="_blank"
          rel="noreferrer"
          className="text-sidebar-foreground hover:bg-accent hover:text-foreground flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors"
        >
          <ExternalLink className="text-muted-foreground size-4" />
          Site ansehen
        </a>
      </div>
      <div className="border-sidebar-border border-t p-2">
        <UserMenu {...user} layout="wide" align="start" side="top" />
      </div>
    </div>
  );
}

export function SiteShell(props: SiteShellProps) {
  const { children, site } = props;
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-dvh">
      <aside className="border-sidebar-border bg-sidebar sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r lg:flex">
        <div className="border-sidebar-border flex h-14 items-center border-b px-5">
          <Logo href="/dashboard" />
        </div>
        <SidebarBody {...props} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-background/85 sticky top-0 z-30 flex h-14 items-center gap-3 border-b px-4 backdrop-blur lg:hidden">
          <Dialog open={open} onOpenChange={setOpen}>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Navigation öffnen"
              onClick={() => setOpen(true)}
            >
              <Menu />
            </Button>
            <DialogContent
              className="bg-sidebar top-0 left-0 h-dvh max-h-none w-72 translate-x-0 translate-y-0 rounded-none border-0 border-r p-0"
              size="sm"
            >
              <DialogTitle className="sr-only">Navigation</DialogTitle>
              <div className="border-sidebar-border flex h-14 items-center border-b px-5">
                <Logo href="/dashboard" />
              </div>
              <SidebarBody {...props} onNavigate={() => setOpen(false)} />
            </DialogContent>
          </Dialog>
          <LogoMark className="size-6" />
          <span className="truncate text-sm font-semibold">{site.name}</span>
          <div className="ml-auto">
            <UserMenu {...props.user} />
          </div>
        </header>

        <main className="app-container flex-1 py-8 lg:py-10">{children}</main>
      </div>
    </div>
  );
}
