import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { DeletePostForm } from '@/components/editor/delete-post-form';
import { PostEditor } from '@/components/editor/post-editor';
import { PostSettingsForm } from '@/components/editor/post-settings-form';
import { PublishPanel } from '@/components/editor/publish-panel';
import { PostTaxonomyForm } from '@/components/taxonomies/post-taxonomy-form';
import { requireSession } from '@/lib/auth/session';
import { getPost } from '@/lib/db/queries/posts';
import { getPostTags, listCategories } from '@/lib/db/queries/taxonomies';
import { getSiteForUser } from '@/lib/db/queries/sites';
import { getEnv } from '@/lib/env';
import { can } from '@/lib/sites/permissions';
import { siteUrl } from '@/lib/tenant/host';

export const metadata: Metadata = { title: 'Bearbeiten — webpresslite' };

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ siteId: string; postId: string }>;
}) {
  const { siteId, postId } = await params;
  const { user } = await requireSession(`/sites/${siteId}/posts/${postId}`);

  const site = await getSiteForUser(siteId, user.id);
  if (!site) notFound();

  const post = await getPost(siteId, postId, user.id);
  if (!post) notFound();

  const base = siteUrl(site.subdomain, getEnv().ROOT_DOMAIN);
  const path = post.type === 'page' ? `/${post.slug}` : `/beitrag/${post.slug}`;

  const [categories, postTagRows] = await Promise.all([
    listCategories(siteId, user.id),
    getPostTags(siteId, post.id, user.id),
  ]);

  return (
    <div className="space-y-8">
      <nav className="text-sm text-[var(--color-muted-foreground)]">
        <Link href={`/sites/${siteId}/posts`} className="underline underline-offset-4">
          Inhalte
        </Link>
      </nav>

      <PostEditor
        siteId={siteId}
        postId={post.id}
        initialTitle={post.title}
        initialContent={post.contentJson}
      />

      <div className="grid gap-6 md:grid-cols-2">
        <PublishPanel
          siteId={siteId}
          postId={post.id}
          canPublish={can(site.role, 'post:publish')}
          status={post.status}
          publishedAt={post.publishedAt?.toISOString() ?? null}
          publicUrl={`${base}${path}`}
        />

        <PostTaxonomyForm
          siteId={siteId}
          postId={post.id}
          categories={categories}
          categoryId={post.categoryId}
          tagNames={postTagRows.map((tag) => tag.name)}
        />

        <PostSettingsForm
          siteId={siteId}
          postId={post.id}
          slug={post.slug}
          excerpt={post.excerpt ?? ''}
          seoTitle={post.seoTitle ?? ''}
          seoDescription={post.seoDescription ?? ''}
        />
      </div>

      <section className="space-y-3">
        <h2 className="font-medium">Vorschau</h2>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Zeigt den Beitrag so, wie er auf der Site erscheint — auch als Entwurf.
        </p>
        <Link
          href={`/sites/${siteId}/posts/${post.id}/preview`}
          className="inline-block text-sm underline underline-offset-4"
          data-testid="preview-link"
        >
          Vorschau öffnen
        </Link>
      </section>

      {can(site.role, 'post:delete') ? (
        <section className="space-y-3 border-t pt-6">
          <h2 className="font-medium">Gefahrenzone</h2>
          <DeletePostForm siteId={siteId} postId={post.id} />
        </section>
      ) : null}
    </div>
  );
}
