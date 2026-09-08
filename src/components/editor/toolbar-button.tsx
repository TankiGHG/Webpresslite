'use client';

import type { ComponentProps } from 'react';
import { Kbd } from '@/components/ui/kbd';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export function ToolbarButton({
  title,
  shortcut,
  active = false,
  className,
  children,
  ...props
}: ComponentProps<'button'> & { title: string; shortcut?: string; active?: boolean }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={title}
          aria-pressed={active}
          className={cn(
            'text-muted-foreground grid size-8 shrink-0 place-items-center rounded-md transition-colors outline-none',
            'hover:bg-accent hover:text-foreground focus-visible:ring-ring focus-visible:ring-[3px]',
            'disabled:pointer-events-none disabled:opacity-40',
            'data-[state=open]:bg-accent data-[state=open]:text-foreground',
            active && 'bg-primary-soft text-primary-soft-foreground hover:bg-primary-soft',
            className,
          )}
          {...props}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <span className="flex items-center gap-2">
          {title}
          {shortcut ? (
            <Kbd className="border-background/30 bg-background/15 text-background">{shortcut}</Kbd>
          ) : null}
        </span>
      </TooltipContent>
    </Tooltip>
  );
}
