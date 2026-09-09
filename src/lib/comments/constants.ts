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

/** What a post says about comments. `inherit` leaves the decision to the site. */
export const COMMENT_MODES = ['inherit', 'on', 'off'] as const;

export type CommentMode = (typeof COMMENT_MODES)[number];

export const COMMENT_MODE_LABELS: Record<CommentMode, string> = {
  inherit: 'Wie die Site',
  on: 'An',
  off: 'Aus',
};

/** The stored override (`null` = follow the site) as the three-way form value. */
export function commentMode(override: boolean | null | undefined): CommentMode {
  if (override === true) return 'on';
  if (override === false) return 'off';
  return 'inherit';
}

export function commentOverride(mode: CommentMode): boolean | null {
  if (mode === 'on') return true;
  if (mode === 'off') return false;
  return null;
}

/**
 * Whether a visitor may write on this post. The post decides if it has an
 * opinion, otherwise the site does — the same precedence a reader expects when
 * they close comments on a single page of an otherwise open blog.
 */
export function commentsOpen(input: {
  siteEnabled: boolean;
  postOverride: boolean | null;
}): boolean {
  return input.postOverride ?? input.siteEnabled;
}
