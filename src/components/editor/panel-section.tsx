import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Collapsible block in the editor side panel. Native `details` keeps it
 * keyboard accessible without any client code; sections start open so every
 * field is reachable without a click.
 */
export function PanelSection({
  title,
  description,
  children,
  defaultOpen = true,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  return (
    <details open={defaultOpen} className={cn('group border-b last:border-b-0', className)}>
      <summary className="hover:bg-accent/40 focus-visible:ring-ring flex cursor-pointer list-none items-center justify-between gap-2 px-5 py-3.5 text-sm font-medium outline-none select-none focus-visible:ring-[3px] [&::-webkit-details-marker]:hidden">
        <span>
          {title}
          {description ? (
            <span className="text-muted-foreground mt-0.5 block text-xs font-normal">
              {description}
            </span>
          ) : null}
        </span>
        <ChevronDown
          aria-hidden
          className="text-muted-foreground size-4 shrink-0 transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="px-5 pt-1 pb-5">{children}</div>
    </details>
  );
}
