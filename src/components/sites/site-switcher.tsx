'use client';

import { useRouter } from 'next/navigation';
import type { SiteRole } from '@/lib/sites/roles';

export interface SwitcherSite {
  id: string;
  name: string;
  subdomain: string;
  role: SiteRole;
}

export function SiteSwitcher({
  sites,
  currentSiteId,
}: {
  sites: SwitcherSite[];
  currentSiteId?: string;
}) {
  const router = useRouter();

  if (sites.length === 0) return null;

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="sr-only">Site wählen</span>
      <select
        aria-label="Site wählen"
        data-testid="site-switcher"
        className="h-8 rounded-md border bg-transparent px-2 text-sm"
        value={currentSiteId ?? ''}
        onChange={(event) => {
          const value = event.target.value;
          router.push(value ? `/sites/${value}` : '/dashboard');
        }}
      >
        <option value="">Alle Sites</option>
        {sites.map((site) => (
          <option key={site.id} value={site.id}>
            {site.name}
          </option>
        ))}
      </select>
    </label>
  );
}
