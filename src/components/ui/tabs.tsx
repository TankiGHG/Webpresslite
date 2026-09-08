import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface LinkTab {
  href: string;
  label: ReactNode;
  active: boolean;
  count?: number;
  testId?: string;
}

/** URL-driven tabs; every tab is a real link so the state survives reloads. */
export function LinkTabs({ tabs, className }: { tabs: LinkTab[]; className?: string }) {
  return (
    <nav className={cn('flex gap-1 overflow-x-auto border-b', className)} aria-label="Ansicht">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.active ? 'page' : undefined}
          data-testid={tab.testId}
          className={cn(
            '-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm whitespace-nowrap transition-colors',
            tab.active
              ? 'border-primary text-foreground font-medium'
              : 'text-muted-foreground hover:border-border hover:text-foreground border-transparent',
          )}
        >
          {tab.label}
          {tab.count !== undefined ? (
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 text-[0.6875rem] leading-none tabular-nums',
                tab.active ? 'bg-primary-soft text-primary-soft-foreground' : 'bg-muted',
              )}
            >
              {tab.count}
            </span>
          ) : null}
        </Link>
      ))}
    </nav>
  );
}
