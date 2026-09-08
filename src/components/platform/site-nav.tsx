'use client';

import {
  BarChart3,
  FileText,
  Globe,
  Image,
  LayoutDashboard,
  MessageSquare,
  Palette,
  Settings,
  Sparkles,
  StickyNote,
  Tags,
  Users,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { can, type Capability } from '@/lib/sites/permissions';
import type { SiteRole } from '@/lib/sites/roles';
import { cn } from '@/lib/utils';

interface NavItem {
  segment: string;
  label: string;
  icon: LucideIcon;
  capability?: Capability;
  /** Marks the item active for nested routes too (default) or only on exact match. */
  exact?: boolean;
  badgeKey?: 'pendingComments';
}

interface NavGroup {
  title?: string;
  items: NavItem[];
}

const GROUPS: NavGroup[] = [
  {
    items: [{ segment: '', label: 'Übersicht', icon: LayoutDashboard, exact: true }],
  },
  {
    title: 'Inhalte',
    items: [
      { segment: 'posts', label: 'Beiträge', icon: FileText },
      { segment: 'seiten', label: 'Seiten', icon: StickyNote },
      { segment: 'medien', label: 'Medien', icon: Image },
      {
        segment: 'kommentare',
        label: 'Kommentare',
        icon: MessageSquare,
        capability: 'comment:moderate',
        badgeKey: 'pendingComments',
      },
      { segment: 'taxonomien', label: 'Kategorien & Tags', icon: Tags },
    ],
  },
  {
    title: 'Site',
    items: [
      { segment: 'statistik', label: 'Statistik', icon: BarChart3, capability: 'stats:view' },
      { segment: 'design', label: 'Design', icon: Palette, capability: 'site:design' },
      { segment: 'team', label: 'Team', icon: Users, capability: 'site:members' },
      { segment: 'domain', label: 'Domain', icon: Globe, capability: 'site:domain' },
      { segment: 'plan', label: 'Plan', icon: Sparkles, capability: 'site:plan' },
      {
        segment: 'einstellungen',
        label: 'Einstellungen',
        icon: Settings,
        capability: 'site:settings',
      },
    ],
  },
];

export interface SiteNavBadges {
  pendingComments?: number;
}

export function SiteNav({
  siteId,
  role,
  badges = {},
  onNavigate,
}: {
  siteId: string;
  role: SiteRole;
  badges?: SiteNavBadges;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const base = `/sites/${siteId}`;

  return (
    <nav className="flex flex-col gap-5" aria-label="Site-Navigation">
      {GROUPS.map((group, index) => {
        const items = group.items.filter((item) => !item.capability || can(role, item.capability));
        if (items.length === 0) return null;
        return (
          <div key={group.title ?? index}>
            {group.title ? (
              <div className="text-muted-foreground/80 mb-1.5 px-3 text-[0.6875rem] font-semibold tracking-wider uppercase">
                {group.title}
              </div>
            ) : null}
            <ul className="flex flex-col gap-0.5">
              {items.map((item) => {
                const href = item.segment ? `${base}/${item.segment}` : base;
                const active = item.exact
                  ? pathname === href
                  : pathname === href || pathname.startsWith(`${href}/`);
                const badge = item.badgeKey ? badges[item.badgeKey] : undefined;
                return (
                  <li key={item.segment}>
                    <Link
                      href={href}
                      onClick={onNavigate}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
                        active
                          ? 'bg-sidebar-active text-foreground font-medium'
                          : 'text-sidebar-foreground hover:bg-accent hover:text-foreground',
                      )}
                    >
                      <item.icon
                        className={cn(
                          'size-4 shrink-0',
                          active ? 'text-primary' : 'text-muted-foreground',
                        )}
                      />
                      <span className="flex-1 truncate">{item.label}</span>
                      {badge ? (
                        <span className="bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 text-[0.6875rem] leading-none font-semibold tabular-nums">
                          {badge}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
