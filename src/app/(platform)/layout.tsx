import type { ReactNode } from 'react';
import { ThemeScript } from '@/components/platform/theme-script';
import { TooltipProvider } from '@/components/ui/tooltip';

/**
 * Everything under the root domain: dashboard, editor, auth. The public sites
 * bring their own colours, so the dark-mode bootstrap only lives here.
 */
export default function PlatformLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <ThemeScript />
      <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
    </>
  );
}
