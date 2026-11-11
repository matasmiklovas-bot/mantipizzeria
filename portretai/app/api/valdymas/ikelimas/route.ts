import crypto from 'node:crypto';
import { isAdmin } from '@/app/valdymas/_auth';
import { storage } from '@/server/storage.js';

// Where the owner's browser should send a finished portrait file.
export async function POST() {
  if (!(await isAdmin())) return new Response('Unauthorized', { status: 401 });
  const key = `uploads/admin-${crypto.randomUUID()}`;
  const upload = await (await storage()).createUpload(key);
  return Response.json({ key, upload });
}
