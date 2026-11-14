import { verify } from '@/server/crypto.js';
import { storage } from '@/server/storage.js';
import { driverFor } from '@/server/env.js';

// Receives the file body when files are stored locally (development and
// tests). In production the browser uploads straight to Supabase Storage and
// this route answers 404.
const MAX_BYTES = 16 * 1024 * 1024;

export async function PUT(request: Request) {
  if (driverFor('storage') !== 'local') return new Response('Not found', { status: 404 });
  const url = new URL(request.url);
  const key = url.searchParams.get('key') || '';
  const expires = Number(url.searchParams.get('expires'));
  const sig = url.searchParams.get('sig') || '';
  if (!key.startsWith('uploads/') || !Number.isFinite(expires) || expires < Date.now() || !verify(`upload:${key}:${expires}`, sig)) {
    return new Response('Forbidden', { status: 403 });
  }
  const declared = Number(request.headers.get('content-length') || 0);
  if (declared > MAX_BYTES) return new Response('Too large', { status: 413 });
  const body = Buffer.from(await request.arrayBuffer());
  if (body.length === 0 || body.length > MAX_BYTES) return new Response('Too large', { status: 413 });
  await (await storage()).put(key, body);
  return Response.json({ ok: true });
}
