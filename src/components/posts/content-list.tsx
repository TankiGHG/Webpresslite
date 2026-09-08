import { ExternalLink, FileText, PenLine } from 'lucide-react';
import Link from 'next/link';
import { CreatePostForm } from '@/components/editor/create-post-form';
import { PostStatusBadge } from '@/components/posts/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { LinkTabs } from '@/components/ui/tabs';
import type { PostListItem } from '@/lib/db/queries/posts';
import { formatRelative, formatShortDate } from '@/lib/format';
import {
  POST_STATUS_LABELS,
  POST_STATUSES,
  type PostStatus,
  type PostType,
} from '@/lib/posts/constants';
import { publicPostPath } from '@/lib/posts/paths';

const COPY: Record<
  PostType,
  { title: string; description: string; empty: string; emptyHint: string; path: string }
> = {
  post: {
    title: 'Beiträge',
    description: 'Alles, was im Blog chronologisch erscheint.',
    empty: 'Noch keine Beiträge',
    emptyHint: 'Gib oben einen Titel ein – der Entwurf öffnet sich direkt im Editor.',
    path: 'posts',
  },
  page: {
    title: 'Seiten',
    description: 'Feste Inhalte wie „Über mich“ oder „Impressum“, erreichbar über das Menü.',
    empty: 'Noch keine Seiten',
    emptyHint: 'Seiten liegen direkt unter deiner Domain, zum Beispiel /impressum.',
    path: 'seiten',
  },
};

function isStatus(value: string | undefined): value is PostStatus {
  return POST_STATUSES.includes(value as PostStatus);
}

/** Posts and pages share one list; only copy and the default type differ. */
export function ContentList({
  siteId,
  type,
  posts,
  siteUrl,
  statusParam,
}: {
  siteId: string;
  type: PostType;
  posts: PostListItem[];
  siteUrl: string;
  statusParam?: string;
}) {
  const copy = COPY[type];
  const status = isStatus(statusParam) ? statusParam : undefined;
  const base = `/sites/${siteId}/${copy.path}`;

  const counts: Record<PostStatus, number> = { draft: 0, scheduled: 0, published: 0 };
  for (const post of posts) counts[post.status] += 1;

  const visible = status ? posts.filter((post) => post.status === status) : posts;

  return (
    <div>
      <PageHeader title={copy.title} description={copy.description} />

      <Card className="mb-8">
        <CardContent className="pt-6">
          <CreatePostForm siteId={siteId} defaultType={type} />
        </CardContent>
      </Card>

      {posts.length > 0 ? (
        <LinkTabs
          className="mb-4"
          tabs={[
            { href: base, label: 'Alle', active: !status, count: posts.length },
            ...POST_STATUSES.map((value) => ({
              href: `${base}?status=${value}`,
              label: POST_STATUS_LABELS[value],
              active: status === value,
              count: counts[value],
            })),
          ]}
        />
      ) : null}

      {posts.length === 0 ? (
        <EmptyState
          icon={type === 'page' ? FileText : PenLine}
          title={copy.empty}
          description={copy.emptyHint}
          data-testid="no-posts"
        />
      ) : visible.length === 0 ? (
        <EmptyState
          compact
          title={`Keine Inhalte mit Status „${status ? POST_STATUS_LABELS[status] : ''}“`}
          action={
            <Button asChild variant="ghost" size="sm">
              <Link href={base}>Alle anzeigen</Link>
            </Button>
          }
        />
      ) : (
        <ul className="bg-card divide-y overflow-hidden rounded-xl border" data-testid="post-list">
          {visible.map((post) => (
            <li
              key={post.id}
              // Narrow screens: the title takes the whole first line, status
              // and actions sit beneath; otherwise everything shares one row.
              className="group hover:bg-accent/50 flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 transition-colors"
            >
              <div className="min-w-0 basis-full sm:flex-1 sm:basis-0">
                <Link
                  href={`/sites/${siteId}/posts/${post.id}`}
                  className="hover:text-primary block truncate font-medium"
                >
                  {post.title}
                </Link>
                <p className="text-muted-foreground mt-0.5 truncate text-xs">
                  {post.authorName}
                  <span className="mx-1.5">·</span>
                  {post.status === 'published' && post.publishedAt ? (
                    <>veröffentlicht am {formatShortDate(post.publishedAt)}</>
                  ) : post.status === 'scheduled' && post.publishedAt ? (
                    <>erscheint am {formatShortDate(post.publishedAt)}</>
                  ) : (
                    <>bearbeitet {formatRelative(post.updatedAt)}</>
                  )}
                  <span className="mx-1.5">·</span>
                  <span className="font-mono">/{post.slug}</span>
                </p>
              </div>

              <PostStatusBadge status={post.status} className="shrink-0" />

              <div className="ml-auto flex shrink-0 items-center gap-1 sm:ml-0">
                {post.status === 'published' ? (
                  <Button
                    asChild
                    variant="ghost"
                    size="icon-sm"
                    // No hover on touch screens, so there it is always visible.
                    className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 max-sm:opacity-100"
                  >
                    <a
                      href={`${siteUrl}${publicPostPath(post.type, post.slug)}`}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`${post.title} auf der Site ansehen`}
                    >
                      <ExternalLink />
                    </a>
                  </Button>
                ) : null}
                <Button asChild variant="outline" size="sm">
                  <Link href={`/sites/${siteId}/posts/${post.id}`}>Bearbeiten</Link>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
