import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { PlanForm } from '@/components/sites/plan-form';
import { requireSession } from '@/lib/auth/session';
import { countMedia } from '@/lib/db/queries/media';
import { countPosts } from '@/lib/db/queries/posts';
import { listMembers } from '@/lib/db/queries/members';
import { getSiteForUser } from '@/lib/db/queries/sites';
import { can } from '@/lib/sites/permissions';
import { limitsFor } from '@/lib/sites/plans';

export const metadata: Metadata = { title: 'Plan — webpresslite' };

export default async function PlanPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const { user } = await requireSession(`/sites/${siteId}/plan`);

  const site = await getSiteForUser(siteId, user.id);
  if (!site || !can(site.role, 'site:plan')) notFound();

  const limits = limitsFor(site.plan);
  const [posts, media, members] = await Promise.all([
    countPosts(siteId, user.id),
    countMedia(siteId, user.id),
    listMembers(siteId, user.id),
  ]);

  const usage = [
    { label: 'Inhalte', used: posts, limit: limits.postsPerSite },
    { label: 'Medien', used: media, limit: limits.mediaPerSite },
    { label: 'Mitglieder', used: members.length, limit: limits.membersPerSite },
  ];

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Plan</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">{site.name}</p>
      </header>

      <section className="space-y-3">
        <h2 className="font-medium">Aktuelle Nutzung</h2>
        <ul className="space-y-2 text-sm" data-testid="plan-usage">
          {usage.map((entry) => (
            <li key={entry.label} className="flex items-center justify-between gap-4">
              <span>{entry.label}</span>
              <span className="text-[var(--color-muted-foreground)] tabular-nums">
                {entry.used} / {entry.limit}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <PlanForm siteId={siteId} plan={site.plan} />

      <p className="text-sm">
        <Link href={`/sites/${siteId}`} className="underline underline-offset-4">
          Zurück zur Site
        </Link>
      </p>
    </div>
  );
}
