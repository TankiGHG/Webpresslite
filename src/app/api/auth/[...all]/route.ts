import { toNextJsHandler } from 'better-auth/next-js';
import { getAuth } from '@/lib/auth/server';

export const dynamic = 'force-dynamic';

const handler = toNextJsHandler((request: Request) => getAuth().handler(request));

export const { GET, POST } = handler;
