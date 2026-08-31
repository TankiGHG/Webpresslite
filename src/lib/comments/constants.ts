/** Comment vocabulary, free of Drizzle so client components can use it. */
export const COMMENT_STATUSES = ['pending', 'approved', 'spam'] as const;

export type CommentStatus = (typeof COMMENT_STATUSES)[number];

export const COMMENT_STATUS_LABELS: Record<CommentStatus, string> = {
  pending: 'Wartet auf Freigabe',
  approved: 'Freigegeben',
  spam: 'Spam',
};

export const COMMENT_MAX_LENGTH = 4000;
export const COMMENT_MIN_LENGTH = 2;

/** The honeypot field. A real person never fills it in; bots fill everything. */
export const HONEYPOT_FIELD = 'website';
