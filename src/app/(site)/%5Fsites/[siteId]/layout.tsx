import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { getPublicSite } from '@/lib/db/queries/public-sites';

export default async function SiteLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  const site = await getPublicSite(siteId);

  if (!site) notFound();

  return (
    <div className="min-h-dvh">
      <header className="border-b">
        <div className="mx-auto max-w-3xl px-6 py-6">
          <p className="text-lg font-semibold" data-testid="site-name">
            {site.name}
          </p>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-10">{children}</main>
    </div>
  );
}
