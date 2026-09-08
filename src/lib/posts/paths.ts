import type { PostType } from './constants';

/** Path of a post or page on its public site; pages live at the root. */
export function publicPostPath(type: PostType, slug: string): string {
  return type === 'page' ? `/${slug}` : `/beitrag/${slug}`;
}
