import { timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { publishDuePosts } from '@/lib/db/queries/posts';
import { getEnv } from '@/lib/env';

export const dynamic = 'force-dynamic';

/** Constant-time comparison, so the secret cannot be guessed byte by byte. */
function secretMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Publishes every post whose scheduled moment has passed.
 *
 * Meant to be called once a minute by a scheduler (cron, systemd timer, the
 * host's job runner). It is idempotent: a run with nothing due changes nothing.
 */
export async function POST(request: NextRequest) {
  const expected = getEnv().CRON_SECRET;

  if (!expected) {
    return NextResponse.json({ error: 'CRON_SECRET is not configured.' }, { status: 503 });
  }

  const header = request.headers.get('authorization') ?? '';
  const provided = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : '';

  if (!provided || !secretMatches(provided, expected)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const published = await publishDuePosts();

  return NextResponse.json({
    published: published.length,
    posts: published.map((post) => post.id),
  });
}
