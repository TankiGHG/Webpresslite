/**
 * Post vocabulary as plain data, free of Drizzle so client components can use
 * the types without pulling the database layer into the browser bundle.
 */
export const POST_TYPES = ['post', 'page'] as const;
export const POST_STATUSES = ['draft', 'scheduled', 'published'] as const;

export type PostType = (typeof POST_TYPES)[number];
export type PostStatus = (typeof POST_STATUSES)[number];

export const POST_TYPE_LABELS: Record<PostType, string> = {
  post: 'Beitrag',
  page: 'Seite',
};

export const POST_STATUS_LABELS: Record<PostStatus, string> = {
  draft: 'Entwurf',
  scheduled: 'Geplant',
  published: 'Veröffentlicht',
};
