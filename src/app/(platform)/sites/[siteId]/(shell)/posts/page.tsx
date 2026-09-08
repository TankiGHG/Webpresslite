import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ContentList } from '@/components/posts/content-list';
import { requireSession } from '@/lib/auth/session';
import { listPosts } from '@/lib/db/queries/posts';
import { getSiteForUser } from '@/lib/db/queries/sites';
import { publicSiteUrl } from '@/lib/tenant/public-url';

export const metadata: Metadata = { title: 'Beiträge' };

export default async function PostsPage({
  params,
  searchParams,
}: {
  params: Promise<{ siteId: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { siteId } = await params;
  const { status } = await searchParams;
  const { user } = await requireSession(`/sites/${siteId}/posts`);

  const site = await getSiteForUser(siteId, user.id);
  if (!site) notFound();

  const posts = await listPosts(siteId, user.id, { type: 'post' });

  return (
    <ContentList
      siteId={siteId}
      type="post"
      posts={posts}
      siteUrl={publicSiteUrl(site)}
      statusParam={status}
    />
  );
}
