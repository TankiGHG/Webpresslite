import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CoverPicker } from '@/components/editor/cover-picker';
import { DeletePostForm } from '@/components/editor/delete-post-form';
import { PanelSection } from '@/components/editor/panel-section';
import { PostEditor } from '@/components/editor/post-editor';
import { PostSettingsForm } from '@/components/editor/post-settings-form';
import { PublishPanel } from '@/components/editor/publish-panel';
import { PostTaxonomyForm } from '@/components/taxonomies/post-taxonomy-form';
import { requireSession } from '@/lib/auth/session';
import { commentMode } from '@/lib/comments/constants';
import { getMedia } from '@/lib/db/queries/media';
import { getPost } from '@/lib/db/queries/posts';
import { getSiteForUser } from '@/lib/db/queries/sites';
import { getPostTags, listCategories } from '@/lib/db/queries/taxonomies';
import { publicPostPath } from '@/lib/posts/paths';
import { can } from '@/lib/sites/permissions';
import { publicSiteUrl } from '@/lib/tenant/public-url';

export const metadata: Metadata = { title: 'Bearbeiten' };

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

  const base = publicSiteUrl(site);
  const path = publicPostPath(post.type, post.slug);

  const [categories, postTagRows, cover] = await Promise.all([
    listCategories(siteId, user.id),
    getPostTags(siteId, post.id, user.id),
    post.coverMediaId ? getMedia(siteId, post.coverMediaId, user.id) : Promise.resolve(null),
  ]);

  const listHref = `/sites/${siteId}/${post.type === 'page' ? 'seiten' : 'posts'}`;

  return (
    <PostEditor
      siteId={siteId}
      postId={post.id}
      type={post.type}
      siteName={site.name}
      backHref={listHref}
      previewHref={`/sites/${siteId}/posts/${post.id}/preview`}
      initialTitle={post.title}
      initialContent={post.contentJson}
      aside={
        <>
          <PanelSection title="Veröffentlichung">
            <PublishPanel
              siteId={siteId}
              postId={post.id}
              canPublish={can(site.role, 'post:publish')}
              status={post.status}
              publishedAt={post.publishedAt?.toISOString() ?? null}
              publicUrl={`${base}${path}`}
            />
          </PanelSection>

          <PanelSection title="Titelbild">
            <CoverPicker siteId={siteId} postId={post.id} cover={cover} />
          </PanelSection>

          {post.type === 'post' ? (
            <PanelSection title="Einordnung" description="Kategorie und Tags">
              <PostTaxonomyForm
                siteId={siteId}
                postId={post.id}
                categories={categories}
                categoryId={post.categoryId}
                tagNames={postTagRows.map((tag) => tag.name)}
              />
            </PanelSection>
          ) : null}

          <PanelSection
            title="Einstellungen"
            description="Adresse, SEO und Kommentare"
            defaultOpen={false}
          >
            <PostSettingsForm
              siteId={siteId}
              postId={post.id}
              slug={post.slug}
              pathPrefix={post.type === 'page' ? '/' : '/beitrag/'}
              excerpt={post.excerpt ?? ''}
              seoTitle={post.seoTitle ?? ''}
              seoDescription={post.seoDescription ?? ''}
              comments={commentMode(post.commentsEnabled)}
              siteCommentsEnabled={site.commentsEnabled}
            />
          </PanelSection>

          {can(site.role, 'post:delete') ? (
            <PanelSection title="Gefahrenzone" defaultOpen={false}>
              <DeletePostForm siteId={siteId} postId={post.id} />
            </PanelSection>
          ) : null}
        </>
      }
    />
  );
}
